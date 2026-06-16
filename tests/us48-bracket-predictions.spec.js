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

test.describe('US-48: bracket predictions (server)', () => {
  test('participant picks exactly pick_count teams per stage', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Pred ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;
    await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
      headers: auth,
      data: { name: 'QF', teams: ['Brazil', 'Argentina', 'France', 'England'], pick_count: 2, points_per_correct: 3 },
    });
    await setStatus(request, gid, 'open');

    const joined = await (
      await request.post(`${API}/api/participants`, { data: { display_name: `P${Date.now()}`, game_id: gid } })
    ).json();
    const pAuth = { 'x-entry-token': joined.entry_token };

    // /me exposes the stages + empty selections and the game type.
    const me1 = await (await request.get(`${API}/api/participants/me`, { headers: pAuth })).json();
    expect(me1.game.type).toBe('bracket_prediction');
    expect(me1.stages).toHaveLength(1);
    expect(me1.selections).toHaveLength(0);
    const teamIds = me1.stages[0].teams.map((t) => t.id);

    // Wrong count is rejected; exactly pick_count is accepted.
    const tooFew = await request.put(`${API}/api/participants/me/bracket`, {
      headers: pAuth,
      data: { stage_id: me1.stages[0].id, team_ids: [teamIds[0]] },
    });
    expect(tooFew.status()).toBe(400);

    const ok = await request.put(`${API}/api/participants/me/bracket`, {
      headers: pAuth,
      data: { stage_id: me1.stages[0].id, team_ids: [teamIds[0], teamIds[1]] },
    });
    expect(ok.status()).toBe(200);

    const me2 = await (await request.get(`${API}/api/participants/me`, { headers: pAuth })).json();
    expect(me2.selections.map((s) => s.stage_team_id).sort()).toEqual([teamIds[0], teamIds[1]].sort());

    // Picks lock once the game starts.
    await setStatus(request, gid, 'locked');
    const afterLock = await request.put(`${API}/api/participants/me/bracket`, {
      headers: pAuth,
      data: { stage_id: me1.stages[0].id, team_ids: [teamIds[2], teamIds[3]] },
    });
    expect(afterLock.status()).toBe(403);

    await setStatus(request, gid, 'finished'); // park it (non-draft can't be deleted)
  });
});

test.describe('US-48: bracket predictions UI', () => {
  const meBody = {
    participant: { id: 1, display_name: 'Bob' },
    game: { id: 100, name: 'Cup', status: 'open', type: 'bracket_prediction' },
    predictions: [],
    stages: [
      {
        id: 1,
        name: 'QF',
        pick_count: 2,
        points_per_correct: 3,
        all_correct_bonus: 5,
        teams: [
          { id: 11, name: 'Brazil', is_winner: 0 },
          { id: 12, name: 'Argentina', is_winner: 0 },
          { id: 13, name: 'France', is_winner: 0 },
        ],
      },
    ],
    selections: [],
  };

  test('player picks exactly pick_count and saves (wizard)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
    await page.route('**/api/participants/me', (r) => r.fulfill({ json: meBody }));
    await page.route('**/api/participants/me/bracket', (r) =>
      r.request().method() === 'PUT' ? r.fulfill({ json: { message: 'Saved' } }) : r.continue()
    );
    await page.goto('/my-predictions');

    // A new entry (no picks) opens straight into the wizard (US-56/US-57).
    await expect(page.getByText('QF')).toBeVisible();
    await expect(page.getByTestId('wizard-count')).toHaveText('0 / 2 picked');
    await expect(page.getByTestId('wizard-save')).toBeDisabled();

    await page.getByRole('button', { name: 'Brazil' }).click();
    await page.getByRole('button', { name: 'Argentina' }).click();
    await expect(page.getByTestId('wizard-count')).toHaveText('2 / 2 picked');

    // A third pick is ignored once the limit is reached.
    await page.getByRole('button', { name: 'France' }).click();
    await expect(page.getByTestId('wizard-count')).toHaveText('2 / 2 picked');

    await expect(page.getByTestId('wizard-save')).toBeEnabled();
    const saved = page.waitForRequest(
      (req) => req.url().includes('/participants/me/bracket') && req.method() === 'PUT'
    );
    await page.getByTestId('wizard-save').click();
    await saved;
  });
});
