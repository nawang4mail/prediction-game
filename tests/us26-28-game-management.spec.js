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
const authHeaders = { Authorization: `Bearer ${token}` };

test.describe('US-26/US-27: game management', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.goto('/admin/games');
    await page.waitForSelector('h2', { timeout: 10000 });
  });

  test('Games page lists the migrated Game 1 with its status', async ({ page }) => {
    const row = page.locator('tbody tr', { hasText: 'Game 1' });
    await expect(row).toBeVisible();
    await expect(row.locator('span')).toHaveText(/open|locked/);
  });

  test('New Game form is disabled while a game is active', async ({ page }) => {
    await expect(page.locator('input[name="game_name"]')).toBeDisabled();
    await expect(page.locator('text=Finish the current game to create a new one.')).toBeVisible();
  });

  test('Lifecycle: reopen the locked game, then lock it again', async ({ page }) => {
    const row = page.locator('tbody tr', { hasText: 'Game 1' });
    const status = () => row.locator('span').first();

    if ((await status().innerText()) === 'locked') {
      await row.locator('button', { hasText: 'Reopen' }).click();
      await expect(status()).toHaveText('open');
    }

    await row.locator('button', { hasText: 'Start (lock)' }).click();
    await page.locator('button', { hasText: 'Start' }).last().click();
    await expect(status()).toHaveText('locked');
  });
});

test.describe('US-26/US-27: game API rules', () => {
  test('creating a game while one is active returns 409', async ({ request }) => {
    const res = await request.post(`${API}/api/admin/games`, {
      headers: authHeaders,
      data: { name: `Should Fail ${Date.now()}` },
    });
    expect(res.status()).toBe(409);
  });

  test('invalid status transition returns 400', async ({ request }) => {
    const games = await (await request.get(`${API}/api/admin/games`, { headers: authHeaders })).json();
    const active = games.find((g) => g.status !== 'finished');
    const res = await request.put(`${API}/api/admin/games/${active.id}/status`, {
      headers: authHeaders,
      data: { status: 'bogus' },
    });
    expect(res.status()).toBe(400);
  });

  test('games endpoints require auth', async ({ request }) => {
    expect((await request.get(`${API}/api/admin/games`)).status()).toBe(401);
  });
});

test.describe('US-28: v1 data preserved as Game 1', () => {
  test('default leaderboard equals Game 1 leaderboard', async ({ request }) => {
    const def = await (await request.get(`${API}/api/leaderboard`)).json();
    const game1 = await (await request.get(`${API}/api/leaderboard?game_id=1`)).json();
    expect(def).toEqual(game1);
    expect(def.length).toBeGreaterThan(0);
  });

  test('dashboard is scoped to the active game', async ({ request }) => {
    const stats = await (await request.get(`${API}/api/admin/dashboard`, { headers: authHeaders })).json();
    expect(stats.game.name).toBe('Game 1');
    expect(stats.users).toBeGreaterThan(0);
  });
});
