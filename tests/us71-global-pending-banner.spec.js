import { test, expect } from '@playwright/test';

// US-71: the "entry pending admin approval" warning is a global banner pinned to
// the top of every public page, not just My Predictions, and reflects any pending
// entry on the device across all games.
const seed = () => {
  localStorage.setItem('entry_token', 't1');
  localStorage.setItem(
    'pg_entries',
    JSON.stringify([
      { token: 't1', name: 'Bob', game_id: 100, is_self: true },
      { token: 't2', name: 'Bob #2', game_id: 200, is_self: true },
    ])
  );
};

// Keep My Predictions renderable (it needs a valid /me for the current token).
const mockMe = (page) =>
  page.route('**/api/participants/me', (r) =>
    r.fulfill({
      json: {
        participant: { id: 1, display_name: 'Bob', status: 'approved', status_message: null },
        game: { id: 100, name: 'Cup', status: 'open', type: 'guess_winners' },
        predictions: [],
      },
    })
  );

test.describe('US-71: global pending-approval banner (UI)', () => {
  test('shows on every public page while any entry is pending, across games', async ({ page }) => {
    await page.addInitScript(seed);
    await mockMe(page);
    // t2 belongs to a different game (200) and is declined — the banner is
    // device-wide, so it must still show on every page.
    await page.route('**/api/participants/statuses', (r) =>
      r.fulfill({
        json: [
          { token: 't1', status: 'approved' },
          { token: 't2', status: 'declined' },
        ],
      })
    );

    for (const path of ['/', '/matches', '/my-predictions']) {
      await page.goto(path);
      const banner = page.getByTestId('pending-approval-banner');
      await expect(banner).toBeVisible();
      await expect(banner).toContainText('pending admin approval');
    }

    // The old in-page US-67 warning is gone (consolidated into the banner).
    await expect(page.getByTestId('pending-entries-warning')).toHaveCount(0);
  });

  test('no banner when every entry is approved', async ({ page }) => {
    await page.addInitScript(seed);
    await page.route('**/api/participants/statuses', (r) =>
      r.fulfill({
        json: [
          { token: 't1', status: 'approved' },
          { token: 't2', status: 'approved' },
        ],
      })
    );

    await page.goto('/matches');
    await expect(page.getByTestId('pending-approval-banner')).toHaveCount(0);
  });
});
