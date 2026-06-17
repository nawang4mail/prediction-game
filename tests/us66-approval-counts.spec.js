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
const setStatus = (request, gid, status) =>
  request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status } });

test.describe('US-66: approval drives dashboard counts + finance (server)', () => {
  test('Users counts approved only; pending_users counts declined; finance uses approved', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Counts ${Date.now()}`, type: 'guess_winners' },
        })
      ).json()
    ).id;
    await setStatus(request, gid, 'open');
    try {
      // Set an entry cost so total collected is checkable.
      await request.put(`${API}/api/admin/settings?game_id=${gid}`, {
        headers: auth,
        data: { entry_cost: 10, commission_pct: 0 },
      });

      // Two admin-added users (approved) + one self-joined (declined).
      await request.post(`${API}/api/admin/users?game_id=${gid}`, { headers: auth, data: { display_name: `A${Date.now()}` } });
      await request.post(`${API}/api/admin/users?game_id=${gid}`, { headers: auth, data: { display_name: `B${Date.now()}` } });
      await request.post(`${API}/api/participants`, { data: { display_name: `Self${Date.now()}`, game_id: gid } });

      const stats = await (
        await request.get(`${API}/api/admin/dashboard?game_id=${gid}`, { headers: auth })
      ).json();
      expect(stats.users).toBe(2); // approved
      expect(stats.pending_users).toBe(1); // declined
      expect(stats.finance.total_collected).toBe(20); // 2 approved × $10, declined excluded
    } finally {
      await setStatus(request, gid, 'locked');
      await setStatus(request, gid, 'finished');
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth });
    }
  });

  test('bracket entries endpoint returns only approved users', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Ent ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;
    await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
      headers: auth,
      data: { name: 'QF', teams: ['A', 'B'], pick_count: 1, points_per_correct: 1 },
    });
    await setStatus(request, gid, 'open');
    try {
      await request.post(`${API}/api/admin/users?game_id=${gid}`, { headers: auth, data: { display_name: `Approved${Date.now()}` } });
      const self = await (
        await request.post(`${API}/api/participants`, { data: { display_name: `Pending${Date.now()}`, game_id: gid } })
      ).json();

      const entries = await (
        await request.get(`${API}/api/admin/bracket/entries?game_id=${gid}`, { headers: auth })
      ).json();
      expect(entries.some((e) => e.display_name === self.display_name)).toBe(false); // declined hidden
      expect(entries.length).toBe(1); // only the approved admin-added user
    } finally {
      await setStatus(request, gid, 'locked');
      await setStatus(request, gid, 'finished');
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth });
    }
  });
});

test.describe('US-66: dashboard UI', () => {
  test('shows a Pending Users card', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 70, name: 'Cup', type: 'guess_winners', status: 'open', created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );
    await page.route('**/api/admin/dashboard**', (r) =>
      r.fulfill({
        json: {
          game: { id: 70, name: 'Cup', type: 'guess_winners', status: 'open' },
          matches: { total: 2, with_result: 1, pending: 1 },
          users: 5,
          pending_users: 3,
          predictions: 4,
          top5: [],
          finance: { entry_cost: 0, commission_pct: 0, total_collected: 0, commission_amount: 0, prize_pool: 0, tiers: [] },
        },
      })
    );
    await page.goto('/admin');
    await expect(page.getByText('Pending Users')).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
  });
});
