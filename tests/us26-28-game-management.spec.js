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

const adminGames = (request) =>
  request.get(`${API}/api/admin/games`, { headers: authHeaders }).then((r) => r.json());
const publicGames = (request) => request.get(`${API}/api/games`).then((r) => r.json());
const activeOf = (games) => games.find((g) => g.status === 'open' || g.status === 'locked');

test.describe('US-26/US-27: game management UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.goto('/admin/games');
    await page.waitForSelector('h2', { timeout: 10000 });
  });

  test('Games page lists the migrated Game 1', async ({ page }) => {
    const row = page.locator('tbody tr', { hasText: 'Game 1' });
    await expect(row).toBeVisible();
    await expect(row.getByText(/^(draft|open|locked|finished)$/)).toBeVisible();
  });

  // US-38 amended US-26: drafts can be prepared at any time, so the form is
  // no longer disabled while a game is active.
  test('New Game form stays enabled while a game is active', async ({ page }) => {
    await expect(page.locator('input[name="game_name"]')).toBeEnabled();
  });
});

test.describe('US-26/US-27/US-38: game API rules', () => {
  test('a newly created game starts as a draft', async ({ request }) => {
    const res = await request.post(`${API}/api/admin/games`, {
      headers: authHeaders,
      data: { name: `Draft ${Date.now()}` },
    });
    expect(res.status()).toBe(201);
    const id = (await res.json()).id;

    const created = (await adminGames(request)).find((g) => g.id === id);
    expect(created.status).toBe('draft');

    await request.delete(`${API}/api/admin/games/${id}`, { headers: authHeaders });
  });

  test('invalid status transition returns 400', async ({ request }) => {
    const active = activeOf(await adminGames(request));
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
  test('Game 1 still has its leaderboard', async ({ request }) => {
    const game1 = await (await request.get(`${API}/api/leaderboard?game_id=1`)).json();
    expect(Array.isArray(game1)).toBe(true);
    expect(game1.length).toBeGreaterThan(0);
  });

  test('default leaderboard matches the active game', async ({ request }) => {
    const active = activeOf(await publicGames(request));
    const def = await (await request.get(`${API}/api/leaderboard`)).json();
    if (active) {
      const scoped = await (await request.get(`${API}/api/leaderboard?game_id=${active.id}`)).json();
      expect(def).toEqual(scoped);
    } else {
      expect(Array.isArray(def)).toBe(true);
    }
  });

  test('dashboard is scoped to the active game', async ({ request }) => {
    const active = activeOf(await publicGames(request));
    const stats = await (await request.get(`${API}/api/admin/dashboard`, { headers: authHeaders })).json();
    expect(stats.game).toBeTruthy();
    if (active) expect(stats.game.id).toBe(active.id);
  });
});
