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

test.describe('US-55: stage description (server)', () => {
  test('a stage stores and returns its description', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Desc ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;
    try {
      const create = await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
        headers: auth,
        data: {
          name: 'QF',
          description: 'Pick the 8 teams you think reach the quarter-finals.',
          teams: ['Brazil', 'Argentina', 'France', 'England'],
          pick_count: 2,
          points_per_correct: 3,
        },
      });
      expect(create.status()).toBe(201);
      const stages = await (await request.get(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth })).json();
      expect(stages[0].description).toBe('Pick the 8 teams you think reach the quarter-finals.');

      // It is also exposed in the public breakdown.
      await request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status: 'open' } });
      const bd = await (await request.get(`${API}/api/bracket?game_id=${gid}`)).json();
      expect(bd[0].description).toBe('Pick the 8 teams you think reach the quarter-finals.');
      await request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status: 'locked' } });
      await request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status: 'finished' } });
    } finally {
      // draft cleanup only applies if still draft; otherwise it was parked above.
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth });
    }
  });
});

test.describe('US-55: stage description (admin UI)', () => {
  test('the stage card shows its description', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 60, name: 'Cup', type: 'bracket_prediction', status: 'open', created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );
    await page.route('**/api/admin/bracket**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({
            json: [
              {
                id: 1,
                name: 'QF',
                description: 'Reach the quarter-finals',
                pick_count: 2,
                points_per_correct: 3,
                all_correct_bonus: 0,
                parent_ids: [],
                teams: [{ id: 11, name: 'Brazil' }, { id: 12, name: 'France' }],
              },
            ],
          })
        : r.continue()
    );
    await page.goto('/admin/bracket');
    await expect(page.getByText('Reach the quarter-finals')).toBeVisible();
  });
});
