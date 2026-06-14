import { test, expect } from '@playwright/test';

// US-44: the homepage shows "My Predictions" and "Join the Game" as two
// independent buttons instead of one that swaps between them. Fully mocked so
// it is deterministic regardless of DB state.

const mockBase = (page) =>
  Promise.all([
    page.route('**/api/settings**', (r) => r.fulfill({ json: { prize_text: '', rules_text: '' } })),
    page.route('**/api/leaderboard**', (r) => r.fulfill({ json: [] })),
    // Defensive: an entry already in pg_entries short-circuits migrateLegacy,
    // but mock /participants/me so nothing hits the real API.
    page.route('**/api/participants/me', (r) =>
      r.fulfill({ json: { participant: { id: 1, display_name: 'Bob' }, game: { id: 100, status: 'open' }, predictions: [] } })
    ),
  ]);

const routeGames = (page, games) =>
  page.route('**/api/games', (r) => r.fulfill({ json: games }));

// Seeds this device as a participant holding an entry in the given game.
const seedEntry = (page, gameId, token = 't1') =>
  page.addInitScript(
    ([gid, tok]) => {
      localStorage.setItem(
        'pg_entries',
        JSON.stringify([{ token: tok, name: 'Bob', game_id: gid, is_self: true }])
      );
      localStorage.setItem('entry_token', tok);
    },
    [gameId, token]
  );

const myPredictions = (page) => page.getByRole('link', { name: /My Predictions/i });
const joinGame = (page) => page.getByRole('link', { name: /Join the Game/i });

test.describe('US-44: separate My Predictions and Join buttons', () => {
  test('participant with another open game sees BOTH buttons', async ({ page }) => {
    await mockBase(page);
    await routeGames(page, [
      { id: 100, name: 'Game A', status: 'open', created_at: new Date().toISOString() },
      { id: 101, name: 'Game B', status: 'open', created_at: new Date().toISOString() },
    ]);
    await seedEntry(page, 100);
    await page.goto('/');

    await expect(myPredictions(page)).toBeVisible();
    await expect(joinGame(page)).toBeVisible();
  });

  test('participant with no open game sees only My Predictions', async ({ page }) => {
    await mockBase(page);
    await routeGames(page, [
      { id: 100, name: 'Game A', status: 'locked', created_at: new Date().toISOString() },
    ]);
    await seedEntry(page, 100);
    await page.goto('/');

    await expect(myPredictions(page)).toBeVisible();
    await expect(joinGame(page)).toHaveCount(0);
  });

  test('non-participant with an open game sees only Join the Game', async ({ page }) => {
    await mockBase(page);
    await routeGames(page, [
      { id: 100, name: 'Game A', status: 'open', created_at: new Date().toISOString() },
    ]);
    await page.goto('/');

    await expect(joinGame(page)).toBeVisible();
    await expect(myPredictions(page)).toHaveCount(0);
  });

  test('no open game and no entry shows neither button', async ({ page }) => {
    await mockBase(page);
    await routeGames(page, [
      { id: 99, name: 'Old Game', status: 'finished', created_at: '2020-01-01T00:00:00Z' },
    ]);
    await page.goto('/');

    await expect(joinGame(page)).toHaveCount(0);
    await expect(myPredictions(page)).toHaveCount(0);
  });
});
