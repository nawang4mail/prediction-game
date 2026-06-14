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

const games = (request) => request.get(`${API}/api/admin/games`, { headers: auth }).then((r) => r.json());

test.describe.serial('US-38: draft games', () => {
  let draftId;

  test('creating a game makes a draft, even while another game is active', async ({ request }) => {
    const all = await games(request);
    expect(all.find((g) => g.status === 'open' || g.status === 'locked'), 'need an active game').toBeTruthy();

    const res = await request.post(`${API}/api/admin/games`, {
      headers: auth,
      data: { name: `Draft Test ${Date.now()}` },
    });
    expect(res.status()).toBe(201);
    draftId = (await res.json()).id;

    const created = (await games(request)).find((g) => g.id === draftId);
    expect(created.status).toBe('draft');
  });

  test('a draft is hidden from the public games list', async ({ request }) => {
    const pub = await (await request.get(`${API}/api/games`)).json();
    expect(pub.find((g) => g.id === draftId)).toBeFalsy();
    expect(pub.every((g) => g.status !== 'draft')).toBe(true);
  });

  test('opening a draft while another game is active returns 409', async ({ request }) => {
    const res = await request.put(`${API}/api/admin/games/${draftId}/status`, {
      headers: auth,
      data: { status: 'open' },
    });
    expect(res.status()).toBe(409);
  });

  test('a non-draft (finished) game cannot be deleted', async ({ request }) => {
    const finished = (await games(request)).find((g) => g.status === 'finished');
    expect(finished).toBeTruthy();
    const res = await request.delete(`${API}/api/admin/games/${finished.id}`, { headers: auth });
    expect(res.status()).toBe(409);
  });

  test('a draft can be deleted', async ({ request }) => {
    const res = await request.delete(`${API}/api/admin/games/${draftId}`, { headers: auth });
    expect(res.status()).toBe(200);
    expect((await games(request)).find((g) => g.id === draftId)).toBeFalsy();
  });
});

test.describe('US-38: admin Games page UI', () => {
  test('create form is enabled while a game is active; draft shows Open + Delete', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.route('**/api/admin/games**', (r) => {
      if (r.request().method() !== 'GET') return r.continue();
      return r.fulfill({
        json: [
          { id: 50, name: 'Live Cup', status: 'open', created_at: '2026-01-01T00:00:00Z' },
          { id: 51, name: 'Next Cup', status: 'draft', created_at: '2026-02-01T00:00:00Z' },
        ],
      });
    });

    await page.goto('/admin/games');
    // Draft can be prepared even though a game is active → input not disabled.
    await expect(page.locator('input[name="game_name"]')).toBeEnabled();

    const draftRow = page.locator('tbody tr', { hasText: 'Next Cup' });
    await expect(draftRow.getByRole('button', { name: 'Delete' })).toBeVisible();
    // Open is present but disabled because Live Cup is active.
    await expect(draftRow.getByRole('button', { name: 'Open' })).toBeDisabled();
  });
});
