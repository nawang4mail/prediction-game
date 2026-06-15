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

const games = (request) =>
  request.get(`${API}/api/admin/games`, { headers: auth }).then((r) => r.json());

test.describe('US-45: game type (server)', () => {
  test('creates a game with a chosen type', async ({ request }) => {
    const res = await request.post(`${API}/api/admin/games`, {
      headers: auth,
      data: { name: `Bracket ${Date.now()}`, type: 'bracket_prediction' },
    });
    expect(res.status()).toBe(201);
    const id = (await res.json()).id;
    try {
      const created = (await games(request)).find((g) => g.id === id);
      expect(created.type).toBe('bracket_prediction');
    } finally {
      await request.delete(`${API}/api/admin/games/${id}`, { headers: auth });
    }
  });

  test('defaults to guess_winners and rejects an invalid type', async ({ request }) => {
    const res = await request.post(`${API}/api/admin/games`, {
      headers: auth,
      data: { name: `Default ${Date.now()}` },
    });
    const id = (await res.json()).id;
    try {
      const created = (await games(request)).find((g) => g.id === id);
      expect(created.type).toBe('guess_winners');
    } finally {
      await request.delete(`${API}/api/admin/games/${id}`, { headers: auth });
    }

    const bad = await request.post(`${API}/api/admin/games`, {
      headers: auth,
      data: { name: `Bad ${Date.now()}`, type: 'nonsense' },
    });
    expect(bad.status()).toBe(400);
  });

  test('type can be changed while draft but not after', async ({ request }) => {
    const created = await request.post(`${API}/api/admin/games`, {
      headers: auth,
      data: { name: `Switch ${Date.now()}` },
    });
    const id = (await created.json()).id;
    try {
      const ok = await request.put(`${API}/api/admin/games/${id}/type`, {
        headers: auth,
        data: { type: 'bracket_prediction' },
      });
      expect(ok.status()).toBe(200);
      expect((await games(request)).find((g) => g.id === id).type).toBe('bracket_prediction');
    } finally {
      await request.delete(`${API}/api/admin/games/${id}`, { headers: auth });
    }

    // A non-draft game's type is fixed.
    const nonDraft = (await games(request)).find((g) => g.status !== 'draft');
    expect(nonDraft).toBeTruthy();
    const blocked = await request.put(`${API}/api/admin/games/${nonDraft.id}/type`, {
      headers: auth,
      data: { type: 'bracket_prediction' },
    });
    expect(blocked.status()).toBe(409);
  });
});

test.describe('US-45: admin UI adapts to game type', () => {
  const routeGames = (page, gamesList) =>
    page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET' ? r.fulfill({ json: gamesList }) : r.continue()
    );

  test('create form exposes a game type selector', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, []);
    await page.goto('/admin/games');
    const select = page.getByLabel('Game type');
    await expect(select).toBeVisible();
    await expect(select.getByRole('option', { name: 'Guess the Winners' })).toHaveCount(1);
    await expect(select.getByRole('option', { name: 'Bracket Prediction' })).toHaveCount(1);
  });

  test('a bracket_prediction game shows the Bracket tab, not Matches/Predictions', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, [
      { id: 90, name: 'Cup', type: 'bracket_prediction', status: 'open', created_at: '2026-01-01T00:00:00Z' },
    ]);
    await page.goto('/admin/games');

    await expect(page.getByRole('link', { name: 'Bracket' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Matches' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Predictions' })).toHaveCount(0);
  });

  test('a guess_winners game shows Matches + Predictions, not Bracket', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, [
      { id: 91, name: 'Cup', type: 'guess_winners', status: 'open', created_at: '2026-01-01T00:00:00Z' },
    ]);
    await page.goto('/admin/games');

    await expect(page.getByRole('link', { name: 'Matches' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Predictions' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bracket' })).toHaveCount(0);
  });
});
