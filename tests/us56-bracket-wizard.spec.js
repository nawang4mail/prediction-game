import { test, expect } from '@playwright/test';

// US-56: one-stage-at-a-time prediction wizard with progress, Back/Next/Save/Cancel,
// batch save (only when all stages complete), and combined stages that show the teams
// advanced from the player's in-wizard parent picks. Fully mocked.

const meBody = {
  participant: { id: 1, display_name: 'Bob' },
  game: { id: 100, name: 'Cup', status: 'open', type: 'bracket_prediction' },
  predictions: [],
  stages: [
    {
      id: 1,
      name: 'Group',
      pick_count: 2,
      points_per_correct: 1,
      all_correct_bonus: 0,
      parent_ids: [],
      teams: [
        { id: 11, name: 'Brazil' },
        { id: 12, name: 'Argentina' },
        { id: 13, name: 'France' },
      ],
    },
    {
      id: 2,
      name: 'Final',
      pick_count: 1,
      points_per_correct: 5,
      all_correct_bonus: 0,
      parent_ids: [1],
      teams: [
        { id: 21, name: 'Brazil' },
        { id: 22, name: 'Argentina' },
        { id: 23, name: 'France' },
      ],
    },
  ],
  selections: [],
};

test('wizard steps through stages; combined stage reflects in-wizard picks; batch save', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
  await page.route('**/api/participants/me', (r) => r.fulfill({ json: meBody }));
  await page.route('**/api/participants/me/bracket', (r) =>
    r.request().method() === 'PUT' ? r.fulfill({ json: { message: 'Saved' } }) : r.continue()
  );
  await page.goto('/my-predictions');

  // Step 1 of 2 — Group. Next is gated until 2 picks are made.
  await expect(page.getByTestId('wizard-progress')).toHaveText('Stage 1 of 2');
  await expect(page.getByTestId('wizard-next')).toBeDisabled();
  await page.getByRole('button', { name: 'Brazil' }).click();
  await page.getByRole('button', { name: 'France' }).click();
  await expect(page.getByTestId('wizard-next')).toBeEnabled();
  await page.getByTestId('wizard-next').click();

  // Step 2 — Final (combined): only the teams advanced from Group (Brazil, France) appear.
  await expect(page.getByTestId('wizard-progress')).toHaveText('Stage 2 of 2');
  await expect(page.getByRole('button', { name: 'Brazil' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'France' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Argentina' })).toHaveCount(0);

  // Save is disabled until the final stage is complete; loop saves all stages.
  await expect(page.getByTestId('wizard-save')).toBeDisabled();
  await page.getByRole('button', { name: 'Brazil' }).click();
  await expect(page.getByTestId('wizard-save')).toBeEnabled();

  const puts = [];
  page.on('request', (req) => {
    if (req.url().includes('/participants/me/bracket') && req.method() === 'PUT') puts.push(req);
  });
  await page.getByTestId('wizard-save').click();
  await expect.poll(() => puts.length).toBeGreaterThanOrEqual(2); // one PUT per stage
});

test('Cancel warns and discards, returning to the read-only summary', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
  await page.route('**/api/participants/me', (r) => r.fulfill({ json: meBody }));
  await page.goto('/my-predictions');

  await expect(page.getByTestId('bracket-wizard')).toBeVisible();
  page.once('dialog', (d) => d.accept()); // confirm the discard warning
  await page.getByTestId('wizard-cancel').click();

  // Back to the read-only view with the Edit (Make predictions) button.
  await expect(page.getByTestId('edit-predictions')).toBeVisible();
  await expect(page.getByTestId('bracket-wizard')).toHaveCount(0);
});
