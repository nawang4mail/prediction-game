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

test.describe('US-39: match write enforcement (server)', () => {
  test('a finished game blocks fixture create and result writes', async ({ request }) => {
    const finished = (await adminGames(request)).find((g) => g.status === 'finished');
    expect(finished).toBeTruthy();

    const create = await request.post(`${API}/api/admin/matches?game_id=${finished.id}`, {
      headers: auth,
      data: { team_a: 'X', team_b: 'Y' },
    });
    expect(create.status()).toBe(403);

    const matches = await (
      await request.get(`${API}/api/admin/matches?game_id=${finished.id}`, { headers: auth })
    ).json();
    if (matches.length) {
      const del = await request.delete(`${API}/api/admin/matches/${matches[0].id}?game_id=${finished.id}`, {
        headers: auth,
      });
      expect(del.status()).toBe(403);
      const result = await request.put(
        `${API}/api/admin/matches/${matches[0].id}/result?game_id=${finished.id}`,
        { headers: auth, data: { result: 'team_a' } }
      );
      expect(result.status()).toBe(403);
    }
  });

  test('a draft allows fixtures but not results', async ({ request }) => {
    const created = await request.post(`${API}/api/admin/games`, {
      headers: auth,
      data: { name: `MatchLock ${Date.now()}` },
    });
    const gid = (await created.json()).id;
    try {
      // Fixtures are editable on a draft.
      const add = await request.post(`${API}/api/admin/matches?game_id=${gid}`, {
        headers: auth,
        data: { team_a: 'USA', team_b: 'Brazil' },
      });
      expect(add.status()).toBe(201);
      const matchId = (await add.json()).id;

      // Results are only editable once the game is open or locked.
      const result = await request.put(`${API}/api/admin/matches/${matchId}/result?game_id=${gid}`, {
        headers: auth,
        data: { result: 'team_a' },
      });
      expect(result.status()).toBe(403);
    } finally {
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth }); // cascades matches
    }
  });
});

test.describe('US-39: matches page UI gating', () => {
  const routeGames = (page, status) =>
    page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 70, name: 'Cup', status, created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );
  const routeMatches = (page) =>
    page.route('**/api/admin/matches**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 1, team_a: 'USA', team_b: 'Brazil', label: null, result: null }] })
        : r.continue()
    );

  test('locked game: fixtures locked, results still editable', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, 'locked');
    await routeMatches(page);
    await page.goto('/admin/matches');

    await expect(page.getByTestId('matches-locked-banner')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Match' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByTestId('result-1')).toBeEnabled();
  });

  test('finished game: everything read-only', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, 'finished');
    await routeMatches(page);
    await page.goto('/admin/matches');

    await expect(page.getByTestId('matches-finished-banner')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Match' })).toHaveCount(0);
    await expect(page.getByTestId('result-1')).toHaveCount(0); // no result control
  });

  test('open game: full fixture + result control', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, 'open');
    await routeMatches(page);
    await page.goto('/admin/matches');

    await expect(page.getByRole('button', { name: '+ Add Match' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByTestId('result-1')).toBeEnabled();
  });
});
