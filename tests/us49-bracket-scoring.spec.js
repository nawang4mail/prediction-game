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
const joinPick = async (request, gid, stageId, teamIds) => {
  const joined = await (
    await request.post(`${API}/api/participants`, { data: { display_name: `P${Math.random()}`, game_id: gid } })
  ).json();
  const pAuth = { 'x-entry-token': joined.entry_token };
  await request.put(`${API}/api/participants/me/bracket`, {
    headers: pAuth,
    data: { stage_id: stageId, team_ids: teamIds },
  });
  return joined.display_name;
};

test.describe('US-49: bracket scoring (server)', () => {
  test('cumulative scoring with all-correct bonus drives the leaderboard', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Score ${Date.now()}`, type: 'bracket_prediction' },
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

    const stages = await (await request.get(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth })).json();
    const t = stages[0].teams.map((x) => x.id); // [Brazil, Argentina, France, England]

    const alice = await joinPick(request, gid, sid, [t[0], t[1]]); // both winners
    const bob = await joinPick(request, gid, sid, [t[0], t[2]]); // one winner

    // Mark Brazil + Argentina as the real qualifiers.
    await request.put(`${API}/api/admin/bracket/${sid}/results?game_id=${gid}`, {
      headers: auth,
      data: { team_ids: [t[0], t[1]] },
    });

    const board = await (await request.get(`${API}/api/leaderboard?game_id=${gid}`)).json();
    const score = (name) => Number(board.find((r) => r.display_name === name).total_points);
    expect(score(alice)).toBe(11); // 2*3 + 5 bonus
    expect(score(bob)).toBe(3); //   1*3, no bonus

    // Public breakdown reflects picks + winners.
    const bd = await (await request.get(`${API}/api/bracket?game_id=${gid}`)).json();
    const qf = bd.find((s) => s.id === sid);
    const team = (id) => qf.teams.find((x) => x.id === id);
    expect(team(t[0]).picks).toBe(2); // Alice + Bob
    expect(team(t[0]).is_winner).toBe(1);
    expect(team(t[2]).picks).toBe(1); // Bob only
    expect(team(t[3]).picks).toBe(0);

    await setStatus(request, gid, 'locked');
    await setStatus(request, gid, 'finished'); // park (non-draft can't be deleted)
  });
});

test.describe('US-49: public bracket breakdown UI', () => {
  test('the Matches tab shows a stage breakdown for bracket games', async ({ page }) => {
    await page.route('**/api/games', (r) =>
      r.fulfill({
        json: [{ id: 100, name: 'Cup', type: 'bracket_prediction', status: 'open', created_at: '2026-01-01T00:00:00Z' }],
      })
    );
    await page.route('**/api/bracket**', (r) =>
      r.fulfill({
        json: [
          {
            id: 1,
            name: 'Quarter-finalists',
            pick_count: 2,
            points_per_correct: 3,
            all_correct_bonus: 5,
            teams: [
              { id: 11, name: 'Brazil', is_winner: 1, picks: 4 },
              { id: 12, name: 'Argentina', is_winner: 0, picks: 1 },
            ],
          },
        ],
      })
    );
    await page.goto('/matches');

    await expect(page.getByRole('heading', { name: 'Bracket' })).toBeVisible();
    await page.getByText('Quarter-finalists').click();
    await expect(page.getByText('Brazil ✓')).toBeVisible();
    await expect(page.getByText('4 picks')).toBeVisible();
  });
});
