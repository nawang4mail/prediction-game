import { test, expect } from '@playwright/test';

// US-34: a saved entry_token only counts for the current active game. These
// tests mock the API so they are deterministic regardless of DB state.

const mockSettings = (page) =>
  Promise.all([
    page.route('**/api/settings**', (r) => r.fulfill({ json: { prize_text: '', rules_text: '' } })),
    page.route('**/api/leaderboard**', (r) => r.fulfill({ json: [] })),
  ]);

test.describe('US-34: re-join a new game after a previous one', () => {
  test('stale token from a finished game shows Join, not My Predictions', async ({ page }) => {
    await mockSettings(page);
    await page.route('**/api/games', (r) =>
      r.fulfill({
        json: [
          { id: 100, name: 'New Game', status: 'open', created_at: new Date().toISOString() },
          { id: 99, name: 'Old Game', status: 'finished', created_at: '2020-01-01T00:00:00Z' },
        ],
      })
    );
    await page.route('**/api/participants/me', (r) =>
      r.fulfill({
        json: {
          participant: { id: 1, display_name: 'Bob' },
          game: { id: 99, name: 'Old Game', status: 'finished' },
          predictions: [],
        },
      })
    );
    await page.addInitScript(() => localStorage.setItem('entry_token', 'stale-token'));
    await page.goto('/');

    await expect(page.getByRole('link', { name: /Join the Game/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /My Predictions/i })).toHaveCount(0);
    // The stale token is cleared so the visitor can join the new game.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('entry_token'))).toBeNull();
  });

  test('token for the current open game shows My Predictions', async ({ page }) => {
    await mockSettings(page);
    await page.route('**/api/games', (r) =>
      r.fulfill({
        json: [{ id: 100, name: 'New Game', status: 'open', created_at: new Date().toISOString() }],
      })
    );
    await page.route('**/api/participants/me', (r) =>
      r.fulfill({
        json: {
          participant: { id: 1, display_name: 'Bob' },
          game: { id: 100, name: 'New Game', status: 'open' },
          predictions: [],
        },
      })
    );
    await page.addInitScript(() => localStorage.setItem('entry_token', 'valid-token'));
    await page.goto('/');

    await expect(page.getByRole('link', { name: /My Predictions/i })).toBeVisible();
  });

  test('join page lets a stale-token visitor join the new open game', async ({ page }) => {
    await page.route('**/api/games', (r) =>
      r.fulfill({
        json: [{ id: 100, name: 'New Game', status: 'open', created_at: new Date().toISOString() }],
      })
    );
    await page.route('**/api/participants/me', (r) =>
      r.fulfill({
        json: {
          participant: { id: 1, display_name: 'Bob' },
          game: { id: 99, name: 'Old Game', status: 'finished' },
          predictions: [],
        },
      })
    );
    await page.addInitScript(() => localStorage.setItem('entry_token', 'stale-token'));
    await page.goto('/join');

    // Instead of bouncing to My Predictions, the join form is shown.
    await expect(page.getByRole('button', { name: /Join & Make Predictions/i })).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('entry_token'))).toBeNull();
  });
});
