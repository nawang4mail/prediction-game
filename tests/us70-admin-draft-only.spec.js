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

// US-70: an admin must be able to work on a draft game even when it is the only
// game (no game_id selected), without the panel going blank.
test.describe('US-70: admin scope reaches a draft game (server)', () => {
  test('admin dashboard never 404s while a game exists, and a draft is a valid scope', async ({
    request,
  }) => {
    const res = await request.post(`${API}/api/admin/games`, {
      headers: auth,
      data: { name: `Draft scope ${Date.now()}`, type: 'bracket_prediction' },
    });
    const id = (await res.json()).id;
    try {
      // With no ?game_id (the single-game case has no selector), the admin
      // fallback must resolve a game instead of returning "No games exist yet" —
      // otherwise the dashboard blanks. When only a draft exists it scopes to
      // that draft; the key guarantee is that it never 404s while a game exists.
      const dash = await request.get(`${API}/api/admin/dashboard`, { headers: auth });
      expect(dash.status()).toBe(200);
      expect((await dash.json()).game).toBeTruthy();

      // A draft is itself a valid admin scope target when selected explicitly.
      const scoped = await request.get(`${API}/api/admin/dashboard?game_id=${id}`, {
        headers: auth,
      });
      expect(scoped.status()).toBe(200);
      const body = await scoped.json();
      expect(body.game.id).toBe(id);
      expect(body.game.status).toBe('draft');
    } finally {
      await request.delete(`${API}/api/admin/games/${id}`, { headers: auth });
    }
  });

  test('the public games list never exposes a draft (US-38 preserved)', async ({ request }) => {
    const res = await request.post(`${API}/api/admin/games`, {
      headers: auth,
      data: { name: `Hidden draft ${Date.now()}` },
    });
    const id = (await res.json()).id;
    try {
      const list = await request.get(`${API}/api/games`).then((r) => r.json());
      expect(list.some((g) => g.id === id)).toBe(false);
    } finally {
      await request.delete(`${API}/api/admin/games/${id}`, { headers: auth });
    }
  });
});

// The dashboard must never blank the whole admin panel — even if the stats
// request fails, the nav and a friendly empty state should still render.
test.describe('US-70: dashboard degrades gracefully (UI)', () => {
  test('a failed stats response shows an empty state, not a blank panel', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);

    // A lone draft bracket game (the US-69 scenario) drives the nav...
    await page.route('**/api/admin/games**', (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({
            json: [
              {
                id: 1,
                name: 'Cup',
                type: 'bracket_prediction',
                status: 'draft',
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
          })
        : route.continue()
    );
    // ...and the dashboard stats endpoint fails as it did for a draft-only DB.
    await page.route('**/api/admin/dashboard**', (route) =>
      route.fulfill({ status: 404, json: { message: 'No games exist yet' } })
    );

    await page.goto('/admin');

    // The panel still renders: nav present (with the Bracket tab from US-69)
    // and a friendly empty state instead of a blank screen.
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bracket' })).toBeVisible();
    await expect(page.getByText('No games yet.', { exact: false })).toBeVisible();
  });
});
