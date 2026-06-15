import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import jwt from '../server/node_modules/jsonwebtoken/index.js';

const API = 'http://localhost:4000';

const env = Object.fromEntries(
  readFileSync(join(__dirname, '../server/.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const token = jwt.sign({ id: 1, username: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${token}` };
const setStatus = (request, gid, status) =>
  request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status } });
const pick = async (request, gid, sid, teamIds) => {
  const j = await (
    await request.post(`${API}/api/participants`, { data: { display_name: `P${Math.random()}`, game_id: gid } })
  ).json();
  await request.put(`${API}/api/participants/me/bracket`, {
    headers: { 'x-entry-token': j.entry_token },
    data: { stage_id: sid, team_ids: teamIds },
  });
  return j.display_name;
};

test.describe('US-53: leaderboard point breakdown (server)', () => {
  test('detail includes per-stage points, bonus and all-correct flag', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Pts ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;
    const sid = (
      await (
        await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
          headers: auth,
          data: { name: 'QF', teams: ['Brazil', 'Argentina', 'France', 'England'], pick_count: 2, points_per_correct: 3, all_correct_bonus: 5 },
        })
      ).json()
    ).id;
    await setStatus(request, gid, 'open');
    const t = (await (await request.get(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth })).json())[0].teams;

    const ace = await pick(request, gid, sid, [t[0].id, t[1].id]); // both will be winners
    const mid = await pick(request, gid, sid, [t[0].id, t[2].id]); // one winner

    await request.put(`${API}/api/admin/bracket/${sid}/results?game_id=${gid}`, {
      headers: auth,
      data: { team_ids: [t[0].id, t[1].id] },
    });
    // Results are set but the game is only LOCKED (not finished) — the breakdown must
    // still reveal correctness here, matching the live leaderboard total.
    await setStatus(request, gid, 'locked');

    const board = await (await request.get(`${API}/api/leaderboard?game_id=${gid}`)).json();
    const detailOf = async (name) => {
      const uid = board.find((r) => r.display_name === name).id;
      return (await request.get(`${API}/api/leaderboard/${uid}/predictions`)).json();
    };

    const aceStage = (await detailOf(ace)).stages.find((s) => s.id === sid);
    expect(aceStage.points_per_correct).toBe(3);
    expect(aceStage.all_correct_bonus).toBe(5);
    expect(aceStage.all_correct).toBe(true); // both picks won
    // The winning picks are revealed (green/points) while still locked.
    expect(aceStage.teams.filter((t) => t.is_winner)).toHaveLength(2);

    const midStage = (await detailOf(mid)).stages.find((s) => s.id === sid);
    expect(midStage.all_correct).toBe(false); // only one pick won
    expect(midStage.teams.filter((t) => t.is_winner)).toHaveLength(1);

    await setStatus(request, gid, 'finished'); // park it
  });
});

test.describe('US-53: leaderboard point breakdown (UI)', () => {
  test('shows per-pick points and the all-correct bonus', async ({ page }) => {
    await page.route('**/api/settings**', (r) => r.fulfill({ json: { prize_text: '', rules_text: '' } }));
    await page.route('**/api/games', (r) => r.fulfill({ json: [] }));
    await page.route('**/api/leaderboard**', (r) =>
      r.fulfill({ json: [{ id: 1, display_name: 'Bob', total_points: 11, rank: 1 }] })
    );
    await page.route('**/api/leaderboard/1/predictions', (r) =>
      r.fulfill({
        json: {
          bracket: true,
          stages: [
            {
              id: 1,
              name: 'Quarter-finalists',
              pick_count: 2,
              points_per_correct: 3,
              all_correct_bonus: 5,
              all_correct: true,
              teams: [
                { id: 11, name: 'Brazil', is_winner: 1 },
                { id: 12, name: 'Argentina', is_winner: 1 },
              ],
            },
          ],
        },
      })
    );
    await page.goto('/');

    await page.getByText('Bob').click();
    await expect(page.getByTestId('bonus-1')).toHaveText('+5 bonus');
    // The team chip and its points are separate elements (points have no background).
    await expect(page.getByText('✓ Brazil', { exact: true })).toBeVisible();
    await expect(page.getByText('+3').first()).toBeVisible();
  });
});
