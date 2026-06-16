import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';
import jwt from '../server/node_modules/jsonwebtoken/index.js';

const env = Object.fromEntries(
  readFileSync(join(__dirname, '../server/.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const token = jwt.sign({ id: 1, username: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });

// US-69: when the very first game in the system is created as a Bracket
// Prediction game, the admin layout must switch to the Bracket tab immediately —
// without a manual page reload. The bug was that AdminLayout cached the games
// list once on mount, so the first game never updated the tabs.
test.describe('US-69: first game created as bracket shows the Bracket tab', () => {
  test('creating the first game as Bracket reveals the Bracket tab without a reload', async ({
    page,
  }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);

    // Start with no games; once the create POST has happened, the games list
    // returns the new bracket draft.
    let created = false;
    await page.route('**/api/admin/games**', (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        created = true;
        return route.fulfill({ status: 201, json: { id: 1 } });
      }
      if (req.method() === 'GET') {
        return route.fulfill({
          json: created
            ? [
                {
                  id: 1,
                  name: 'Cup',
                  type: 'bracket_prediction',
                  status: 'draft',
                  created_at: '2026-01-01T00:00:00Z',
                },
              ]
            : [],
        });
      }
      return route.continue();
    });

    await page.goto('/admin/games');

    // With no games yet, the layout falls back to the Guess-the-Winners tabs.
    await expect(page.getByRole('link', { name: 'Matches' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bracket' })).toHaveCount(0);

    // Create the first game as a Bracket Prediction.
    await page.getByPlaceholder('New game name, e.g. World Cup 2026').fill('Cup');
    await page.getByLabel('Game type').selectOption('bracket_prediction');
    await page.getByRole('button', { name: '+ New Draft' }).click();

    // The Bracket tab now appears with no manual reload; Matches/Predictions are gone.
    await expect(page.getByRole('link', { name: 'Bracket' })).toBeVisible();
    await expect(page.getByRole('link', { name: "User's entries" })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Matches' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Predictions' })).toHaveCount(0);
  });
});
