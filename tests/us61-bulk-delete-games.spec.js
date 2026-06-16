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
const newGame = (request) =>
  request
    .post(`${API}/api/admin/games`, { headers: auth, data: { name: `Bulk ${Date.now()}-${Math.random()}` } })
    .then((r) => r.json())
    .then((j) => j.id);
const games = (request) =>
  request.get(`${API}/api/admin/games`, { headers: auth }).then((r) => r.json());
const setStatus = (request, gid, status) =>
  request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status } });

test.describe('US-61: bulk delete (server)', () => {
  test('deletes several draft games in one request', async ({ request }) => {
    const a = await newGame(request);
    const b = await newGame(request);
    const res = await request.post(`${API}/api/admin/games/bulk-delete`, {
      headers: auth,
      data: { ids: [a, b] },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).deleted).toBe(2);
    const all = await games(request);
    expect(all.find((g) => g.id === a)).toBeFalsy();
    expect(all.find((g) => g.id === b)).toBeFalsy();
  });

  test('rejects the whole batch if any game is live, deleting nothing', async ({ request }) => {
    const draft = await newGame(request);
    const live = await newGame(request);
    await setStatus(request, live, 'open');
    try {
      const res = await request.post(`${API}/api/admin/games/bulk-delete`, {
        headers: auth,
        data: { ids: [draft, live] },
      });
      expect(res.status()).toBe(409);
      // Nothing deleted — the draft survives.
      expect((await games(request)).find((g) => g.id === draft)).toBeTruthy();
    } finally {
      await request.delete(`${API}/api/admin/games/${draft}`, { headers: auth });
      await setStatus(request, live, 'locked');
      await setStatus(request, live, 'finished');
      await request.delete(`${API}/api/admin/games/${live}`, { headers: auth });
    }
  });
});

test.describe('US-61: bulk delete (admin UI)', () => {
  test('select deletable games and delete them together', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    let deleteBody = null;
    // Register the general games route first; the specific /bulk-delete route is
    // registered last so Playwright matches it first for that URL.
    await page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({
            json: [
              { id: 1, name: 'Draft Cup', type: 'guess_winners', status: 'draft', created_at: '2026-01-01T00:00:00Z' },
              { id: 2, name: 'Live Cup', type: 'guess_winners', status: 'open', created_at: '2026-01-02T00:00:00Z' },
              { id: 3, name: 'Old Cup', type: 'guess_winners', status: 'finished', created_at: '2026-01-03T00:00:00Z' },
            ],
          })
        : r.continue()
    );
    await page.route('**/api/admin/games/bulk-delete', (r) => {
      deleteBody = JSON.parse(r.request().postData() || '{}');
      return r.fulfill({ json: { deleted: deleteBody.ids.length } });
    });
    await page.goto('/admin/games');

    // Live games have no checkbox.
    await expect(page.getByLabel('Select Live Cup')).toHaveCount(0);

    await page.getByLabel('Select Draft Cup').check();
    await page.getByLabel('Select Old Cup').check();
    await expect(page.getByTestId('bulk-bar')).toContainText('2 selected');

    await page.getByTestId('bulk-delete').click();
    // Finished game in the selection triggers the history warning.
    const dialog = page.locator('.fixed.inset-0');
    await expect(dialog.getByText(/permanently removes the leaderboard and history/i)).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect.poll(() => deleteBody?.ids?.sort()).toEqual([1, 3]);
  });
});
