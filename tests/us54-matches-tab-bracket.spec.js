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

test.describe('US-54: Matches tab for bracket games', () => {
  test('public games list now includes type', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Typed ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;
    await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
      headers: auth,
      data: { name: 'QF', teams: ['Brazil', 'Argentina'], pick_count: 1, points_per_correct: 3 },
    });
    await setStatus(request, gid, 'open');
    try {
      const games = await (await request.get(`${API}/api/games`)).json();
      const g = games.find((x) => x.id === gid);
      expect(g.type).toBe('bracket_prediction');
    } finally {
      await setStatus(request, gid, 'locked');
      await setStatus(request, gid, 'finished');
    }
  });

  // End-to-end against the real API (the bug only showed with the live endpoint):
  // a bracket game's Matches tab must show its stages, not an empty match list.
  test('Matches tab shows the bracket stages for a bracket game', async ({ page, request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Tab ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;
    await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
      headers: auth,
      data: { name: 'Quarter-finalists', teams: ['Brazil', 'Argentina', 'France'], pick_count: 2, points_per_correct: 3 },
    });
    await setStatus(request, gid, 'open');
    try {
      await page.goto(`/matches?game=${gid}`);
      await expect(page.getByRole('heading', { name: 'Bracket' })).toBeVisible();
      await expect(page.getByText('Quarter-finalists')).toBeVisible();
      // Tapping the stage reveals its teams with pick counts.
      await page.getByText('Quarter-finalists').click();
      await expect(page.getByText('Brazil')).toBeVisible();
    } finally {
      await setStatus(request, gid, 'locked');
      await setStatus(request, gid, 'finished');
    }
  });
});
