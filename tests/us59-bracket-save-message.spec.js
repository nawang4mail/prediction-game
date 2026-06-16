import { test, expect } from '@playwright/test';

// US-59: for bracket games the wizard's Save doubles as Finish — it shows the admin
// finish message and there is no separate Finish button. Fully mocked.

const meBody = {
  participant: { id: 1, display_name: 'Bob' },
  game: { id: 100, name: 'Cup', status: 'open', type: 'bracket_prediction' },
  predictions: [],
  stages: [
    {
      id: 1,
      name: 'QF',
      pick_count: 2,
      points_per_correct: 3,
      all_correct_bonus: 0,
      parent_ids: [],
      teams: [
        { id: 11, name: 'Brazil' },
        { id: 12, name: 'Argentina' },
        { id: 13, name: 'France' },
      ],
    },
  ],
  selections: [],
};

test('wizard Save shows the finish message; no separate Finish button for brackets', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
  // Register /me first; the more specific routes after it take priority.
  await page.route('**/api/participants/me', (r) => r.fulfill({ json: meBody }));
  await page.route('**/api/participants/me/bracket', (r) =>
    r.request().method() === 'PUT' ? r.fulfill({ json: { message: 'Saved' } }) : r.continue()
  );
  await page.route('**/api/participants/me/finish', (r) =>
    r.request().method() === 'POST'
      ? r.fulfill({ json: { message: 'All set — good luck! 🍀' } })
      : r.continue()
  );
  await page.goto('/my-predictions');

  // No standalone Finish button while the wizard is open.
  await expect(page.getByTestId('finish-button')).toHaveCount(0);

  await page.getByRole('button', { name: 'Brazil' }).click();
  await page.getByRole('button', { name: 'Argentina' }).click();
  await page.getByTestId('wizard-save').click();

  // The admin finish message is shown after saving, and still no Finish button.
  await expect(page.getByTestId('finish-message')).toContainText('All set — good luck! 🍀');
  await expect(page.getByTestId('finish-button')).toHaveCount(0);
});
