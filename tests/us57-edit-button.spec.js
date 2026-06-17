import { test, expect } from '@playwright/test';

// US-57: a bracket player's picks are read-only until they tap Edit. Fully mocked.

const bracketMe = (overrides = {}) => ({
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
        { id: 11, name: 'Brazil', is_winner: 0 },
        { id: 12, name: 'Argentina', is_winner: 0 },
        { id: 13, name: 'France', is_winner: 0 },
      ],
    },
  ],
  selections: [{ stage_team_id: 11, stage_id: 1 }, { stage_team_id: 12, stage_id: 1 }],
  ...overrides,
});

test('an entry with picks is read-only until Edit is tapped', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
  await page.route('**/api/participants/me', (r) => r.fulfill({ json: bracketMe() }));
  await page.goto('/my-predictions');

  // Read-only summary by default: picks shown, the editing wizard hidden.
  await expect(page.getByTestId('summary-stage-1')).toBeVisible();
  await expect(page.getByTestId('bracket-wizard')).toHaveCount(0);
  await expect(page.getByTestId('edit-predictions')).toBeVisible();

  await page.getByTestId('edit-predictions').click();

  // Wizard revealed; read-only summary gone.
  await expect(page.getByTestId('bracket-wizard')).toBeVisible();
  await expect(page.getByTestId('summary-stage-1')).toHaveCount(0);
});

test('a brand-new entry with no picks opens straight into edit mode', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
  await page.route('**/api/participants/me', (r) => r.fulfill({ json: bracketMe({ selections: [] }) }));
  await page.goto('/my-predictions');

  await expect(page.getByTestId('bracket-wizard')).toBeVisible(); // wizard shown directly
  await expect(page.getByTestId('summary-stage-1')).toHaveCount(0);
});

test('a locked game shows the read-only summary with no Edit', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
  await page.route('**/api/participants/me', (r) =>
    r.fulfill({ json: bracketMe({ game: { id: 100, name: 'Cup', status: 'locked', type: 'bracket_prediction' } }) })
  );
  await page.goto('/my-predictions');

  await expect(page.getByTestId('summary-stage-1')).toBeVisible();
  await expect(page.getByTestId('edit-predictions')).toHaveCount(0);
  await expect(page.getByTestId('bracket-wizard')).toHaveCount(0);
});
