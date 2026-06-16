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

test.describe('US-64: bracket dashboard (server)', () => {
  test('dashboard reports max_points and omits matches for bracket games', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Dash ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;
    try {
      await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
        headers: auth,
        data: { name: 'QF', teams: ['A', 'B', 'C', 'D'], pick_count: 2, points_per_correct: 3, all_correct_bonus: 5 },
      });
      await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
        headers: auth,
        data: { name: 'Final', teams: ['A', 'B'], pick_count: 1, points_per_correct: 5, all_correct_bonus: 0 },
      });

      const stats = await (
        await request.get(`${API}/api/admin/dashboard?game_id=${gid}`, { headers: auth })
      ).json();
      // QF: 2×3 + 5 = 11 ; Final: 1×5 + 0 = 5  →  16
      expect(stats.max_points).toBe(16);
      expect(stats.matches).toBeUndefined();
      expect(Array.isArray(stats.top5)).toBe(true);
    } finally {
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth });
    }
  });

  test('a guess_winners dashboard still reports matches', async ({ request }) => {
    const games = await (await request.get(`${API}/api/admin/games`, { headers: auth })).json();
    const guess = games.find((g) => g.type === 'guess_winners');
    if (guess) {
      const stats = await (
        await request.get(`${API}/api/admin/dashboard?game_id=${guess.id}`, { headers: auth })
      ).json();
      expect(stats.matches).toBeTruthy();
    }
  });
});

test.describe('US-64: bracket dashboard (UI)', () => {
  test('shows Max Points and hides the Matches card', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 70, name: 'Cup', type: 'bracket_prediction', status: 'open', created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );
    await page.route('**/api/admin/dashboard**', (r) =>
      r.fulfill({
        json: {
          game: { id: 70, name: 'Cup', type: 'bracket_prediction', status: 'open' },
          users: 3,
          max_points: 16,
          top5: [],
          finance: { entry_cost: 0, commission_pct: 0, total_collected: 0, commission_amount: 0, prize_pool: 0, tiers: [] },
        },
      })
    );
    await page.goto('/admin');

    await expect(page.getByText('Max Points')).toBeVisible();
    await expect(page.getByText('16')).toBeVisible();
    await expect(page.getByText('Matches')).toHaveCount(0);
  });
});
