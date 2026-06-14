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

const BASE = `ME_${Date.now()}`;

test.describe.serial('US-41: multiple entries in the same game', () => {
  let gid;
  let origStatus;

  test.beforeAll(async ({ request }) => {
    const active = (await adminGames(request)).find((g) => g.status === 'open' || g.status === 'locked');
    expect(active, 'need an active game').toBeTruthy();
    gid = active.id;
    origStatus = active.status;
    if (origStatus !== 'open') {
      await request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status: 'open' } });
    }
  });

  test.afterAll(async ({ request }) => {
    // Remove the entries this test created, then restore the game's status.
    const users = await (
      await request.get(`${API}/api/admin/users?game_id=${gid}`, { headers: auth })
    ).json();
    for (const u of users.filter((x) => x.display_name.startsWith(BASE))) {
      await request.delete(`${API}/api/admin/users/${u.id}?game_id=${gid}`, { headers: auth });
    }
    if (origStatus !== 'open') {
      await request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status: origStatus } });
    }
  });

  test('first join, add self (auto #2), add someone else (named)', async ({ page, request }) => {
    // First entry — asks for the name (US-29).
    await page.goto('/join');
    await page.fill('input[name="display_name"]', BASE);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/my-predictions');
    await expect(page.getByTestId('entry-switcher')).toContainText(BASE);

    // Add a "Myself" entry — no name prompt, auto-numbered base #2.
    await page.getByTestId('add-entry-button').click();
    await page.getByTestId('add-self').click();
    await page.getByTestId('add-confirm').click();
    await expect(page.getByTestId('entry-switcher')).toContainText(`${BASE} #2`);

    // Add a "Someone else" entry — name is requested.
    await page.getByTestId('add-entry-button').click();
    await page.getByTestId('add-other').click();
    await page.getByTestId('add-name').fill(`${BASE}_friend`);
    await page.getByTestId('add-confirm').click();
    await expect(page.getByTestId('entry-switcher')).toContainText(`${BASE}_friend`);

    // The device now tracks three entries for this game.
    await expect(page.locator('[data-testid="entry-switcher"] option')).toHaveCount(3);

    // Each entry is its own line on the leaderboard.
    const board = await (await request.get(`${API}/api/leaderboard?game_id=${gid}`)).json();
    const names = board.map((r) => r.display_name);
    expect(names).toEqual(expect.arrayContaining([BASE, `${BASE} #2`, `${BASE}_friend`]));
  });

  test('"Add entry" defaults to Myself and only asks for a name for someone else', async ({ page }) => {
    await page.goto('/join');
    await page.fill('input[name="display_name"]', `${BASE}_b`);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/my-predictions');

    await page.getByTestId('add-entry-button').click();
    // Default selection is "Myself": a name preview is shown, no name input.
    await expect(page.getByTestId('add-name')).toHaveCount(0);
    await expect(page.getByTestId('add-panel')).toContainText(`${BASE}_b #2`);

    // Switching to "Someone else" reveals the name field.
    await page.getByTestId('add-other').click();
    await expect(page.getByTestId('add-name')).toBeVisible();
  });
});

test.describe('US-41: entry switcher (mocked)', () => {
  test('switching entries reloads that entry and shows its name', async ({ page }) => {
    // Two entries already saved on the device for game 100.
    await page.addInitScript(() => {
      localStorage.setItem('entry_token', 'tokA');
      localStorage.setItem(
        'pg_entries',
        JSON.stringify([
          { token: 'tokA', name: 'Alice', game_id: 100, is_self: true },
          { token: 'tokB', name: 'Alice #2', game_id: 100, is_self: true },
        ])
      );
    });
    await page.route('**/api/participants/me', (route) => {
      const tok = route.request().headers()['x-entry-token'];
      const name = tok === 'tokB' ? 'Alice #2' : 'Alice';
      route.fulfill({
        json: {
          participant: { id: tok === 'tokB' ? 2 : 1, display_name: name },
          game: { id: 100, name: 'Cup', status: 'open' },
          predictions: [],
        },
      });
    });

    await page.goto('/my-predictions');
    await expect(page.locator('h1')).toHaveText('My Predictions');
    await expect(page.locator('[data-testid="entry-switcher"] option')).toHaveCount(2);

    await page.getByTestId('entry-switcher').selectOption('tokB');
    await expect(page.locator('text=Alice #2 · Cup')).toBeVisible();
  });
});
