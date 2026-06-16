import { test, expect } from '@playwright/test';

// US-58: while the "Add entry" panel is open, the current entry's predictions are
// hidden so the "Whose entry is this?" step stands alone. Fully mocked.

const guessMe = {
  participant: { id: 1, display_name: 'Bob' },
  game: { id: 100, name: 'Cup', status: 'open', type: 'guess_winners' },
  predictions: [
    { match_id: 1, team_a: 'USA', team_b: 'Brazil', match_label: 'USA vs Brazil', match_result: null, prediction: 'team_a' },
  ],
};

test('Add entry hides the predictions and shows only the entry-type question', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
  await page.route('**/api/participants/me', (r) => r.fulfill({ json: guessMe }));
  await page.goto('/my-predictions');

  // Predictions visible to start.
  await expect(page.getByTestId('match-1')).toBeVisible();
  await expect(page.getByTestId('finish-button')).toBeVisible();

  await page.getByTestId('add-entry-button').click();

  // Add panel shows; predictions + finish are hidden.
  await expect(page.getByTestId('add-panel')).toBeVisible();
  await expect(page.getByText('Whose entry is this?')).toBeVisible();
  await expect(page.getByTestId('match-1')).toHaveCount(0);
  await expect(page.getByTestId('finish-button')).toHaveCount(0);

  // Cancelling returns to the normal view.
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByTestId('match-1')).toBeVisible();
});
