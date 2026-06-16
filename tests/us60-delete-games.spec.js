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
const games = (request) =>
  request.get(`${API}/api/admin/games`, { headers: auth }).then((r) => r.json());

test.describe('US-60: delete finished or draft games (server)', () => {
  test('finished games can be deleted; open/locked cannot', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, { headers: auth, data: { name: `Del ${Date.now()}` } })
      ).json()
    ).id;

    // Open and lock it: now it must not be deletable.
    await setStatus(request, gid, 'open');
    expect((await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth })).status()).toBe(409);
    await setStatus(request, gid, 'locked');
    expect((await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth })).status()).toBe(409);

    // Finish it: now it can be deleted, and it disappears from the list.
    await setStatus(request, gid, 'finished');
    expect((await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth })).status()).toBe(200);
    expect((await games(request)).find((g) => g.id === gid)).toBeFalsy();
  });
});

test.describe('US-60: delete games (admin UI)', () => {
  const routeGames = (page, gamesList) =>
    page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET' ? r.fulfill({ json: gamesList }) : r.continue()
    );

  test('finished and draft rows show Delete; live rows do not', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, [
      { id: 1, name: 'Draft Cup', type: 'guess_winners', status: 'draft', created_at: '2026-01-01T00:00:00Z' },
      { id: 2, name: 'Live Cup', type: 'guess_winners', status: 'open', created_at: '2026-01-02T00:00:00Z' },
      { id: 3, name: 'Old Cup', type: 'guess_winners', status: 'finished', created_at: '2026-01-03T00:00:00Z' },
    ]);
    await page.goto('/admin/games');

    const rowDelete = (name) =>
      page.locator('tbody tr', { hasText: name }).getByRole('button', { name: 'Delete' });
    await expect(rowDelete('Draft Cup')).toBeVisible();
    await expect(rowDelete('Old Cup')).toBeVisible();
    await expect(rowDelete('Live Cup')).toHaveCount(0);

    // Deleting a finished game warns about losing its history.
    await rowDelete('Old Cup').click();
    await expect(page.getByText(/permanently removes its leaderboard/i)).toBeVisible();
  });
});
