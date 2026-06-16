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

test.describe('US-62: user entries endpoint (server)', () => {
  test('returns each participant with their picks per stage', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Entries ${Date.now()}`, type: 'bracket_prediction' },
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

    const t = (await (await request.get(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth })).json())[0].teams;
    const joined = await (
      await request.post(`${API}/api/participants`, { data: { display_name: `Pat${Date.now()}`, game_id: gid } })
    ).json();
    await request.put(`${API}/api/participants/me/bracket`, {
      headers: { 'x-entry-token': joined.entry_token },
      data: { stage_id: sid, team_ids: [t[0].id, t[1].id] },
    });
    // Self-joined entries start declined (US-65) and the entries view is approved-only
    // (US-66), so approve it first.
    await request.put(`${API}/api/admin/users/${joined.id}/status?game_id=${gid}`, {
      headers: auth,
      data: { status: 'approved' },
    });

    const list = await (
      await request.get(`${API}/api/admin/bracket/entries?game_id=${gid}`, { headers: auth })
    ).json();
    const entry = list.find((e) => e.display_name === joined.display_name);
    expect(entry).toBeTruthy();
    const qf = entry.stages.find((s) => s.id === sid);
    expect(qf.teams.map((x) => x.name).sort()).toEqual(['Argentina', 'Brazil']);

    await setStatus(request, gid, 'locked');
    await setStatus(request, gid, 'finished');
  });
});

test.describe('US-62: user entries admin UI', () => {
  test('bracket game shows the User\'s entries tab and the read-only list', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 70, name: 'Cup', type: 'bracket_prediction', status: 'open', created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );
    await page.route('**/api/admin/bracket/entries**', (r) =>
      r.fulfill({
        json: [
          {
            user_id: 1,
            display_name: 'Bob',
            stages: [
              { id: 1, name: 'QF', pick_count: 2, teams: [{ id: 11, name: 'Brazil', is_winner: 1 }, { id: 12, name: 'France', is_winner: 0 }] },
            ],
          },
        ],
      })
    );
    await page.goto('/admin/bracket');

    // The nav offers the tab for a bracket game; navigate to it.
    await page.getByRole('link', { name: "User's entries" }).click();
    await page.waitForURL('**/admin/entries');
    await expect(page.getByTestId('entry-1')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();
    await expect(page.getByText('✓ Brazil')).toBeVisible();
    await expect(page.getByText('France')).toBeVisible();
  });
});
