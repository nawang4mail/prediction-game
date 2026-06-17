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

test.describe('US-50: per-player bracket predictions (server)', () => {
  test('the detail endpoint returns a player\'s stage picks for bracket games', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Detail ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;
    const sid = (
      await (
        await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
          headers: auth,
          data: { name: 'QF', teams: ['Brazil', 'Argentina', 'France', 'England'], pick_count: 2, points_per_correct: 3 },
        })
      ).json()
    ).id;
    await setStatus(request, gid, 'open');

    const stages = await (await request.get(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth })).json();
    const t = stages[0].teams.map((x) => x.id);

    const joined = await (
      await request.post(`${API}/api/participants`, { data: { display_name: `Pat${Date.now()}`, game_id: gid } })
    ).json();
    const pAuth = { 'x-entry-token': joined.entry_token };
    await request.put(`${API}/api/participants/me/bracket`, {
      headers: pAuth,
      data: { stage_id: sid, team_ids: [t[0], t[1]] },
    });
    await request.put(`${API}/api/admin/bracket/${sid}/results?game_id=${gid}`, {
      headers: auth,
      data: { team_ids: [t[0]] },
    });
    await setStatus(request, gid, 'locked');
    await setStatus(request, gid, 'finished');

    // Find the participant's user id from the leaderboard, then fetch their detail.
    const board = await (await request.get(`${API}/api/leaderboard?game_id=${gid}`)).json();
    const uid = board.find((r) => r.display_name === joined.display_name).id;
    const detail = await (await request.get(`${API}/api/leaderboard/${uid}/predictions`)).json();

    expect(detail.bracket).toBe(true);
    const qf = detail.stages.find((s) => s.id === sid);
    expect(qf.teams.map((x) => x.id).sort()).toEqual([t[0], t[1]].sort()); // only their picks
    expect(qf.teams.find((x) => x.id === t[0]).is_winner).toBe(1); // revealed once finished
  });

  test('guess_winners detail still returns a match array', async ({ request }) => {
    const board = await (await request.get(`${API}/api/leaderboard?game_id=1`)).json();
    if (board.length) {
      const detail = await (await request.get(`${API}/api/leaderboard/${board[0].id}/predictions`)).json();
      expect(Array.isArray(detail)).toBe(true);
    }
  });
});

test.describe('US-50: bracket leaderboard detail UI', () => {
  test('tapping a player shows their stage picks', async ({ page }) => {
    await page.route('**/api/settings**', (r) => r.fulfill({ json: { prize_text: '', rules_text: '' } }));
    await page.route('**/api/games', (r) => r.fulfill({ json: [] }));
    // Register the general list mock first; the specific /predictions mock is
    // registered last so Playwright matches it first for that URL.
    await page.route('**/api/leaderboard**', (r) =>
      r.fulfill({ json: [{ id: 1, display_name: 'Bob', total_points: 9, rank: 1 }] })
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
              teams: [
                { id: 11, name: 'Brazil', is_winner: 1 },
                { id: 12, name: 'France', is_winner: 0 },
              ],
            },
          ],
        },
      })
    );
    await page.goto('/');

    await page.getByText('Bob').click();
    await expect(page.getByText('Quarter-finalists')).toBeVisible();
    await expect(page.getByText('✓ Brazil')).toBeVisible();
    await expect(page.getByText('France')).toBeVisible();
  });
});
