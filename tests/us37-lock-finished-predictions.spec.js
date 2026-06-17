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

async function finishedGameId(request) {
  const games = await (await request.get(`${API}/api/admin/games`, { headers: auth })).json();
  const finished = games.find((g) => g.status === 'finished');
  expect(finished, 'a finished game must exist for these tests').toBeTruthy();
  return finished.id;
}

test.describe('US-37: admin prediction writes are blocked for finished games', () => {
  test('POST to a finished game returns 403', async ({ request }) => {
    const gid = await finishedGameId(request);
    const res = await request.post(`${API}/api/admin/predictions?game_id=${gid}`, {
      headers: auth,
      data: { user_id: 1, match_id: 1, prediction: 'team_a' },
    });
    expect(res.status()).toBe(403);
  });

  test('DELETE on a finished game returns 403', async ({ request }) => {
    const gid = await finishedGameId(request);
    const res = await request.delete(`${API}/api/admin/predictions/1/1?game_id=${gid}`, {
      headers: auth,
    });
    expect(res.status()).toBe(403);
  });

  test('reading predictions of a finished game still works', async ({ request }) => {
    const gid = await finishedGameId(request);
    const res = await request.get(`${API}/api/admin/predictions?game_id=${gid}`, { headers: auth });
    expect(res.status()).toBe(200);
  });
});

test.describe('US-37: predictions grid is read-only in the UI for finished games', () => {
  test('finished game shows the locked banner and disabled controls', async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem('admin_token', t);
      sessionStorage.setItem('admin_game_id', '999');
    }, token);

    await page.route('**/api/admin/games**', (r) =>
      r.fulfill({
        json: [{ id: 999, name: 'Past Cup', status: 'finished', created_at: '2020-01-01T00:00:00Z' }],
      })
    );
    await page.route('**/api/admin/users**', (r) =>
      r.fulfill({ json: [{ id: 1, display_name: 'Alice' }] })
    );
    await page.route('**/api/admin/matches**', (r) =>
      r.fulfill({ json: [{ id: 1, team_a: 'USA', team_b: 'Brazil', label: null, result: 'team_a' }] })
    );
    await page.route('**/api/admin/predictions**', (r) =>
      r.fulfill({ json: [{ user_id: 1, match_id: 1, prediction: 'team_a' }] })
    );

    await page.goto('/admin/predictions');
    await expect(page.getByTestId('readonly-banner')).toBeVisible();
    await expect(page.getByTestId('cell-1-1')).toBeDisabled();
  });
});
