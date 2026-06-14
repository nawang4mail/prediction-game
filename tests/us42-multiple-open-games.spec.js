import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import jwt from '../server/node_modules/jsonwebtoken/index.js';
import mysql from '../server/node_modules/mysql2/promise.js';

const API = 'http://localhost:4000';

const env = Object.fromEntries(
  readFileSync(join(__dirname, '../server/.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const token = jwt.sign({ id: 1, username: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${token}` };

const createOpenGame = async (request, name) => {
  const c = await request.post(`${API}/api/admin/games`, { headers: auth, data: { name } });
  const id = (await c.json()).id;
  const o = await request.put(`${API}/api/admin/games/${id}/status`, { headers: auth, data: { status: 'open' } });
  expect(o.status(), 'opening a game should be allowed even when another is active').toBe(200);
  return id;
};

test.describe.serial('US-42: multiple open games (server)', () => {
  const ids = [];

  test.afterAll(async () => {
    // Opened games can't be deleted via the API (only drafts), so clean up the
    // test games directly — the FK cascade removes their users/matches/settings.
    if (!ids.length) return;
    const conn = await mysql.createConnection({
      host: env.DB_HOST,
      port: Number(env.DB_PORT) || 3306,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    });
    await conn.query(`DELETE FROM games WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    await conn.end();
  });

  test('two games can be open at the same time', async ({ request }) => {
    const stamp = Date.now();
    ids.push(await createOpenGame(request, `US42_A_${stamp}`));
    ids.push(await createOpenGame(request, `US42_B_${stamp}`));

    const games = await (await request.get(`${API}/api/admin/games`, { headers: auth })).json();
    const open = games.filter((g) => ids.includes(g.id) && g.status === 'open');
    expect(open.length).toBe(2);
  });

  test('join targets a specific open game by id', async ({ request }) => {
    const [a, b] = ids;
    const ja = await request.post(`${API}/api/participants`, {
      data: { game_id: a, display_name: `US42_PA_${Date.now()}` },
    });
    expect(ja.status()).toBe(201);
    expect((await ja.json()).game.id).toBe(a);

    const jb = await request.post(`${API}/api/participants`, {
      data: { game_id: b, display_name: `US42_PB_${Date.now()}` },
    });
    expect(jb.status()).toBe(201);
    expect((await jb.json()).game.id).toBe(b);
  });

  test('the public games list shows both open games', async ({ request }) => {
    const pub = await (await request.get(`${API}/api/games`)).json();
    const openIds = pub.filter((g) => g.status === 'open').map((g) => g.id);
    expect(openIds).toEqual(expect.arrayContaining(ids));
  });
});

test.describe('US-42: public UI handles multiple open games', () => {
  const threeGames = [
    { id: 201, name: 'Cup A', status: 'open', created_at: '2026-03-01T00:00:00Z' },
    { id: 202, name: 'Cup B', status: 'open', created_at: '2026-02-01T00:00:00Z' },
    { id: 203, name: 'Old Cup', status: 'finished', created_at: '2026-01-01T00:00:00Z' },
  ];

  test('join page lets the visitor pick among open games', async ({ page }) => {
    await page.route('**/api/games', (r) => r.fulfill({ json: threeGames }));
    await page.goto('/join');

    await expect(page.getByTestId('game-picker')).toBeVisible();
    await expect(page.getByTestId('pick-game-201')).toBeVisible();
    await expect(page.getByTestId('pick-game-202')).toBeVisible();
    // Finished games are not joinable.
    await expect(page.getByTestId('pick-game-203')).toHaveCount(0);

    await page.getByTestId('pick-game-201').click();
    await expect(page.locator('input[name="display_name"]')).toBeVisible();
    await expect(page.locator('text=Cup A')).toBeVisible();
  });

  test('public game selector lists both open games and finished ones', async ({ page }) => {
    await page.route('**/api/games', (r) => r.fulfill({ json: threeGames }));
    await page.route('**/api/settings**', (r) => r.fulfill({ json: { prize_text: '', rules_text: '' } }));
    await page.route('**/api/leaderboard**', (r) => r.fulfill({ json: [] }));
    await page.goto('/');

    const options = page.locator('select option');
    await expect(options).toHaveCount(3); // default (Cup A) + Cup B + Old Cup
    await expect(page.locator('select')).toContainText('Cup B');
    await expect(page.locator('select')).toContainText('Old Cup (finished)');
  });
});
