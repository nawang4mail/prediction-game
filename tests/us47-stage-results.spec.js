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

const stages = (request, gid) =>
  request.get(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth }).then((r) => r.json());
const setStatus = (request, gid, status) =>
  request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status } });

test.describe('US-47: stage results (server)', () => {
  test('results require an open/locked game and persist winners', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Results ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;

    const sid = (
      await (
        await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
          headers: auth,
          data: {
            name: 'QF',
            teams: ['Brazil', 'Argentina', 'France', 'England'],
            pick_count: 2,
            points_per_correct: 3,
          },
        })
      ).json()
    ).id;

    const teamIds = (await stages(request, gid))[0].teams.map((t) => t.id);

    // Draft: results are not editable yet.
    const draftTry = await request.put(`${API}/api/admin/bracket/${sid}/results?game_id=${gid}`, {
      headers: auth,
      data: { team_ids: [teamIds[0]] },
    });
    expect(draftTry.status()).toBe(403);

    // Open: results can be set.
    await setStatus(request, gid, 'open');
    const ok = await request.put(`${API}/api/admin/bracket/${sid}/results?game_id=${gid}`, {
      headers: auth,
      data: { team_ids: [teamIds[0], teamIds[1]] },
    });
    expect(ok.status()).toBe(200);

    const after = (await stages(request, gid))[0].teams;
    expect(after.filter((t) => t.is_winner).map((t) => t.id).sort()).toEqual(
      [teamIds[0], teamIds[1]].sort()
    );

    // Finished: results are read-only again.
    await setStatus(request, gid, 'locked');
    await setStatus(request, gid, 'finished');
    const finishedTry = await request.put(`${API}/api/admin/bracket/${sid}/results?game_id=${gid}`, {
      headers: auth,
      data: { team_ids: [] },
    });
    expect(finishedTry.status()).toBe(403);
  });
});

test.describe('US-47: stage results UI', () => {
  test('admin can mark winners on an open game', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({
            json: [{ id: 60, name: 'Cup', type: 'bracket_prediction', status: 'open', created_at: '2026-01-01T00:00:00Z' }],
          })
        : r.continue()
    );
    await page.route('**/api/admin/bracket**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({
            json: [
              {
                id: 1,
                name: 'QF',
                pick_count: 2,
                points_per_correct: 3,
                all_correct_bonus: 0,
                teams: [
                  { id: 11, name: 'Brazil', is_winner: 1 },
                  { id: 12, name: 'Argentina', is_winner: 0 },
                ],
              },
            ],
          })
        : r.continue()
    );
    await page.goto('/admin/bracket');

    await expect(page.getByRole('button', { name: 'Save results' })).toBeVisible();
    // Winner already marked shows a check; a non-winner can be toggled on.
    await expect(page.getByRole('button', { name: '✓ Brazil' })).toBeVisible();
    await page.getByRole('button', { name: 'Argentina' }).click();
    await expect(page.getByRole('button', { name: '✓ Argentina' })).toBeVisible();
  });
});
