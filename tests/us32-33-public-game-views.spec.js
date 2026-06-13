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

test.describe('US-33: match list with prediction breakdown', () => {
  test('public matches endpoint counts picks per option correctly', async ({ request }) => {
    const matches = await (await request.get(`${API}/api/matches`)).json();
    expect(matches.length).toBeGreaterThan(0);

    const predictions = await (
      await request.get(`${API}/api/admin/predictions`, { headers: admin })
    ).json();

    for (const m of matches.slice(0, 3)) {
      const forMatch = predictions.filter((p) => p.match_id === m.id);
      expect(m.team_a_count).toBe(forMatch.filter((p) => p.prediction === 'team_a').length);
      expect(m.team_b_count).toBe(forMatch.filter((p) => p.prediction === 'team_b').length);
      expect(m.draw_count).toBe(forMatch.filter((p) => p.prediction === 'draw').length);
    }
  });

  test('clicking a match toggles its prediction breakdown', async ({ page }) => {
    await page.goto('/matches');
    const first = page.locator('[data-testid^="public-match-"]').first();
    await expect(first).toBeVisible();

    await first.locator('button').first().click();
    await expect(first.locator('text=picks').first()).toBeVisible();

    await first.locator('button').first().click();
    await expect(first.locator('text=picks')).toHaveCount(0);
  });

  test('a decided match highlights the winning option', async ({ page, request }) => {
    const matches = await (await request.get(`${API}/api/matches`)).json();
    const decided = matches.find((m) => m.result);
    expect(decided).toBeTruthy();

    await page.goto('/matches');
    const card = page.locator(`[data-testid="public-match-${decided.id}"]`);
    await card.locator('button').first().click();
    await expect(card.locator('text=✓')).toBeVisible();
  });
});

test.describe('US-32: browse games on the public side', () => {
  test('tabs navigate between leaderboard and matches', async ({ page }) => {
    await page.goto('/');
    await page.click('text=⚽ Matches');
    await page.waitForURL('**/matches');
    await expect(page.locator('h1')).toHaveText('Matches');

    await page.click('text=🏆 Leaderboard');
    await page.waitForURL('http://localhost:5173/');
    await expect(page.locator('h1')).toContainText('World Cup');
  });

  test('leaderboard and settings are scoped by game_id', async ({ request }) => {
    const def = await (await request.get(`${API}/api/leaderboard`)).json();
    const game1 = await (await request.get(`${API}/api/leaderboard?game_id=1`)).json();
    expect(def).toEqual(game1);

    // A non-existent game has no players or settings rather than leaking data.
    const empty = await (await request.get(`${API}/api/leaderboard?game_id=999999`)).json();
    expect(empty).toEqual([]);
    const settings = await (await request.get(`${API}/api/settings?game_id=999999`)).json();
    expect(settings).toEqual({ prize_text: '', rules_text: '' });
  });
});
