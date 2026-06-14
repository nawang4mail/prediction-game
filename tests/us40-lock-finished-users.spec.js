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

const adminGames = (request) =>
  request.get(`${API}/api/admin/games`, { headers: auth }).then((r) => r.json());

test.describe('US-40: user writes blocked for finished games (server)', () => {
  let finishedId;

  test.beforeAll(async ({ request }) => {
    finishedId = (await adminGames(request)).find((g) => g.status === 'finished')?.id;
    expect(finishedId, 'need a finished game').toBeTruthy();
  });

  test('create, bulk add, edit, and delete all return 403', async ({ request }) => {
    const create = await request.post(`${API}/api/admin/users?game_id=${finishedId}`, {
      headers: auth,
      data: { display_name: 'ShouldFail' },
    });
    expect(create.status()).toBe(403);

    const bulk = await request.post(`${API}/api/admin/users/bulk?game_id=${finishedId}`, {
      headers: auth,
      data: { names: ['A', 'B'] },
    });
    expect(bulk.status()).toBe(403);

    const edit = await request.put(`${API}/api/admin/users/1?game_id=${finishedId}`, {
      headers: auth,
      data: { display_name: 'X' },
    });
    expect(edit.status()).toBe(403);

    const del = await request.delete(`${API}/api/admin/users/1?game_id=${finishedId}`, { headers: auth });
    expect(del.status()).toBe(403);
  });

  test('reading the user list of a finished game still works', async ({ request }) => {
    const res = await request.get(`${API}/api/admin/users?game_id=${finishedId}`, { headers: auth });
    expect(res.status()).toBe(200);
  });

  test('an active game still allows adding users', async ({ request }) => {
    const active = (await adminGames(request)).find((g) => g.status === 'open' || g.status === 'locked');
    expect(active).toBeTruthy();
    const res = await request.post(`${API}/api/admin/users?game_id=${active.id}`, {
      headers: auth,
      data: { display_name: `Temp_${Date.now()}` },
    });
    expect(res.status()).toBe(201);
    const id = (await res.json()).id;
    await request.delete(`${API}/api/admin/users/${id}?game_id=${active.id}`, { headers: auth });
  });
});

test.describe('US-40: users page UI gating', () => {
  const routeMatches = (page) =>
    page.route('**/api/admin/users**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 1, display_name: 'Alice', phone: null, created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );
  const routeGames = (page, status) =>
    page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 80, name: 'Cup', status, created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );

  test('finished game: banner shown, controls hidden', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, 'finished');
    await routeMatches(page);
    await page.goto('/admin/users');

    await expect(page.getByTestId('users-finished-banner')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add User' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  });

  test('open game: full user management', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, 'open');
    await routeMatches(page);
    await page.goto('/admin/users');

    await expect(page.getByRole('button', { name: '+ Add User' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  });
});
