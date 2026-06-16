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

test.describe('US-63: admin prediction writes blocked once the game is locked (server)', () => {
  test('POST/DELETE to a locked game return 403', async ({ request }) => {
    const games = await (await request.get(`${API}/api/admin/games`, { headers: auth })).json();
    const locked = games.find((g) => g.status === 'locked');
    expect(locked, 'a locked game must exist for this test').toBeTruthy();

    const post = await request.post(`${API}/api/admin/predictions?game_id=${locked.id}`, {
      headers: auth,
      data: { user_id: 1, match_id: 1, prediction: 'team_a' },
    });
    expect(post.status()).toBe(403);

    const del = await request.delete(`${API}/api/admin/predictions/1/1?game_id=${locked.id}`, {
      headers: auth,
    });
    expect(del.status()).toBe(403);

    // Reading still works.
    const get = await request.get(`${API}/api/admin/predictions?game_id=${locked.id}`, { headers: auth });
    expect(get.status()).toBe(200);
  });
});

test.describe('US-63: predictions grid is read-only once locked (UI)', () => {
  test('locked game shows the read-only banner and disabled cells', async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('admin_token', t);
      sessionStorage.setItem('admin_game_id', '888');
    }, token);
    await page.route('**/api/admin/games**', (r) =>
      r.fulfill({ json: [{ id: 888, name: 'Live Cup', type: 'guess_winners', status: 'locked', created_at: '2026-01-01T00:00:00Z' }] })
    );
    await page.route('**/api/admin/users**', (r) => r.fulfill({ json: [{ id: 1, display_name: 'Alice' }] }));
    await page.route('**/api/admin/matches**', (r) =>
      r.fulfill({ json: [{ id: 1, team_a: 'USA', team_b: 'Brazil', label: null, result: null }] })
    );
    await page.route('**/api/admin/predictions**', (r) => r.fulfill({ json: [] }));

    await page.goto('/admin/predictions');
    await expect(page.getByTestId('readonly-banner')).toContainText('started');
    await expect(page.getByTestId('cell-1-1')).toBeDisabled();
  });
});
