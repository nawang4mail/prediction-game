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

test.describe('US-43: no per-game match cap (server)', () => {
  test('can add more than 10 matches to a game', async ({ request }) => {
    // A draft game allows fixture creation (US-39) and starts empty.
    const created = await request.post(`${API}/api/admin/games`, {
      headers: auth,
      data: { name: `NoCap ${Date.now()}` },
    });
    const gid = (await created.json()).id;
    try {
      // Add 12 matches — old behaviour rejected the 11th with HTTP 400.
      for (let i = 1; i <= 12; i++) {
        const add = await request.post(`${API}/api/admin/matches?game_id=${gid}`, {
          headers: auth,
          data: { team_a: `Team ${i}A`, team_b: `Team ${i}B` },
        });
        expect(add.status(), `match #${i} should be accepted`).toBe(201);
      }

      const matches = await (
        await request.get(`${API}/api/admin/matches?game_id=${gid}`, { headers: auth })
      ).json();
      expect(matches.length).toBe(12);
    } finally {
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth }); // cascades matches
    }
  });
});

test.describe('US-43: matches page UI (no limit)', () => {
  const routeGames = (page, status) =>
    page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 80, name: 'Cup', status, created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );
  const routeMatches = (page, n) =>
    page.route('**/api/admin/matches**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({
            json: [...Array(n)].map((_, i) => ({
              id: i + 1,
              team_a: `A${i}`,
              team_b: `B${i}`,
              label: null,
              result: null,
            })),
          })
        : r.continue()
    );

  test('Add Match stays enabled past 10 matches and shows a plain count', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, 'open');
    await routeMatches(page, 11);
    await page.goto('/admin/matches');

    await expect(page.getByRole('button', { name: '+ Add Match' })).toBeEnabled();
    await expect(page.getByText('11 matches added')).toBeVisible();
    await expect(page.getByText('/ 10')).toHaveCount(0);
  });
});
