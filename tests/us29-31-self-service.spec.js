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

const adminToken = jwt.sign({ id: 1, username: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });
const admin = { Authorization: `Bearer ${adminToken}` };

const NAME = `SelfServe_${Date.now()}`;

async function setGameStatus(request, status) {
  const games = await (await request.get(`${API}/api/admin/games`, { headers: admin })).json();
  const game = games.find((g) => g.status !== 'finished');
  if (game.status !== status) {
    const res = await request.put(`${API}/api/admin/games/${game.id}/status`, {
      headers: admin,
      data: { status },
    });
    expect(res.ok()).toBeTruthy();
  }
  return game.id;
}

test.describe.serial('US-29/US-30/US-31: self-service participation', () => {
  let entryToken;
  let userId;

  test.afterAll(async ({ request }) => {
    // leave the game as it was (locked) and remove the test participant
    await setGameStatus(request, 'locked');
    if (userId) {
      await request.delete(`${API}/api/admin/users/${userId}`, { headers: admin });
    }
  });

  test('join is rejected while the game is locked', async ({ request }) => {
    await setGameStatus(request, 'locked');
    const res = await request.post(`${API}/api/participants`, {
      data: { display_name: 'ShouldFail' },
    });
    expect(res.status()).toBe(403);
  });

  test('visitor joins via /join while the game is open', async ({ page, request }) => {
    await setGameStatus(request, 'open');
    await page.goto('/join');
    await page.fill('input[name="display_name"]', NAME);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/my-predictions', { timeout: 10000 });
    await expect(page.locator(`text=${NAME}`)).toBeVisible();
    entryToken = await page.evaluate(() => localStorage.getItem('entry_token'));
    expect(entryToken).toBeTruthy();
  });

  test('participant appears on the leaderboard with 0 points', async ({ request }) => {
    const rows = await (await request.get(`${API}/api/leaderboard`)).json();
    const me = rows.find((r) => r.display_name === NAME);
    expect(me).toBeTruthy();
    expect(Number(me.total_points)).toBe(0);
    userId = me.id;
  });

  test('participant picks a result and it survives a reload', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('entry_token', t), entryToken);
    await page.goto('/my-predictions');
    const card = page.locator('[data-testid^="match-"]').first();
    const draw = card.locator('button', { hasText: 'Draw' });
    await draw.click();
    await expect(draw).toHaveClass(/bg-green-400/);

    await page.reload();
    const drawAfter = page
      .locator('[data-testid^="match-"]')
      .first()
      .locator('button', { hasText: 'Draw' });
    await expect(drawAfter).toHaveClass(/bg-green-400/);
  });

  test('locking the game freezes joins and picks', async ({ page, request }) => {
    await setGameStatus(request, 'locked');

    const write = await request.put(`${API}/api/participants/me/predictions`, {
      headers: { 'x-entry-token': entryToken },
      data: { match_id: 1, prediction: 'draw' },
    });
    expect(write.status()).toBe(403);

    await page.addInitScript((t) => localStorage.setItem('entry_token', t), entryToken);
    await page.goto('/my-predictions');
    await expect(page.locator('text=predictions are locked')).toBeVisible();
    const firstButton = page.locator('[data-testid^="match-"]').first().locator('button').first();
    await expect(firstButton).toBeDisabled();
  });

  test('an unknown entry token gets 401', async ({ request }) => {
    const res = await request.get(`${API}/api/participants/me`, {
      headers: { 'x-entry-token': 'not-a-real-token' },
    });
    expect(res.status()).toBe(401);
  });
});
