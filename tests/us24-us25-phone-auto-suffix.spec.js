import { test, expect } from '@playwright/test';

async function adminLogin(page) {
  await page.goto('/admin/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin', { timeout: 10000 });
}

test.describe('US-24: Phone number field on users', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/users');
    await page.waitForSelector('h2', { timeout: 10000 });
  });

  test('Add User modal has phone number field', async ({ page }) => {
    await page.click('button:has-text("+ Add User")');
    const overlay = page.locator('.fixed.inset-0');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('label:has-text("Phone")')).toBeVisible();
    await expect(overlay.locator('input[placeholder*="1234"]')).toBeVisible();
  });

  test('Phone column appears in users table header', async ({ page }) => {
    await expect(page.locator('th:has-text("Phone")')).toBeVisible();
  });

  test('Add user with phone number and verify it appears in table', async ({ page }) => {
    const testName = `PhoneTest_${Date.now()}`;
    const testPhone = '+1234567890';

    await page.click('button:has-text("+ Add User")');
    const overlay = page.locator('.fixed.inset-0');
    await overlay.locator('input[placeholder*="Alice"]').fill(testName);
    await overlay.locator('input[placeholder*="1234"]').fill(testPhone);
    await overlay.locator('button[type="submit"]').click();
    await expect(overlay).toBeHidden({ timeout: 10000 });

    await page.waitForSelector(`td:has-text("${testName}")`, { timeout: 10000 });
    const row = page.locator('tr', { hasText: testName });
    await expect(row.locator('td:has-text("+1234567890")')).toBeVisible();

    // Clean up
    await row.locator('button:has-text("Delete")').click();
    await page.locator('.fixed.inset-0').locator('button', { hasText: 'Delete' }).click();
    await page.waitForSelector(`td:has-text("${testName}")`, { state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  test('Add user without phone shows dash in phone column', async ({ page }) => {
    const testName = `NoPhone_${Date.now()}`;

    await page.click('button:has-text("+ Add User")');
    const overlay = page.locator('.fixed.inset-0');
    await overlay.locator('input[placeholder*="Alice"]').fill(testName);
    await overlay.locator('button[type="submit"]').click();
    await expect(overlay).toBeHidden({ timeout: 10000 });

    await page.waitForSelector(`td:has-text("${testName}")`, { timeout: 10000 });
    const row = page.locator('tr', { hasText: testName });
    await expect(row.locator('td:has-text("—")')).toBeVisible();

    // Clean up
    await row.locator('button:has-text("Delete")').click();
    await page.locator('.fixed.inset-0').locator('button', { hasText: 'Delete' }).click();
  });

  test('Edit User modal pre-fills existing phone number', async ({ page }) => {
    const testName = `EditPhone_${Date.now()}`;
    const testPhone = '+9876543210';

    await page.click('button:has-text("+ Add User")');
    let overlay = page.locator('.fixed.inset-0');
    await overlay.locator('input[placeholder*="Alice"]').fill(testName);
    await overlay.locator('input[placeholder*="1234"]').fill(testPhone);
    await overlay.locator('button[type="submit"]').click();
    await expect(overlay).toBeHidden({ timeout: 10000 });
    await page.waitForSelector(`td:has-text("${testName}")`, { timeout: 10000 });

    const row = page.locator('tr', { hasText: testName });
    await row.locator('button:has-text("Edit")').click();
    overlay = page.locator('.fixed.inset-0');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('input[placeholder*="1234"]')).toHaveValue(testPhone);

    await overlay.locator('button:has-text("Cancel")').click();

    // Clean up
    await row.locator('button:has-text("Delete")').click();
    await page.locator('.fixed.inset-0').locator('button', { hasText: 'Delete' }).click();
  });
});

test.describe('US-25: Auto-suffix duplicate display names', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/users');
    await page.waitForSelector('h2', { timeout: 10000 });
  });

  test('Adding duplicate name auto-suffixes to "Name 2"', async ({ page }) => {
    const baseName = `Dupe_${Date.now()}`;

    // Add first user
    await page.click('button:has-text("+ Add User")');
    let overlay = page.locator('.fixed.inset-0');
    await overlay.locator('input[placeholder*="Alice"]').fill(baseName);
    await overlay.locator('button[type="submit"]').click();
    await expect(overlay).toBeHidden({ timeout: 10000 });
    await page.waitForSelector(`td:has-text("${baseName}")`, { timeout: 10000 });

    // Add second user with same name
    await page.click('button:has-text("+ Add User")');
    overlay = page.locator('.fixed.inset-0');
    await overlay.locator('input[placeholder*="Alice"]').fill(baseName);
    await overlay.locator('button[type="submit"]').click();
    await expect(overlay).toBeHidden({ timeout: 10000 });
    await page.waitForSelector(`td:has-text("${baseName} 2")`, { timeout: 10000 });

    await expect(page.locator(`td:has-text("${baseName} 2")`)).toBeVisible();

    // Clean up
    for (let i = 0; i < 2; i++) {
      const row = page.locator('tr').filter({ hasText: baseName }).first();
      await row.locator('button:has-text("Delete")').click();
      await page.locator('.fixed.inset-0').locator('button', { hasText: 'Delete' }).click();
      await page.waitForTimeout(400);
    }
  });

  test('Bulk add auto-suffixes duplicates', async ({ page }) => {
    const baseName = `BulkDupe_${Date.now()}`;

    // Pre-add one user
    await page.click('button:has-text("+ Add User")');
    let overlay = page.locator('.fixed.inset-0');
    await overlay.locator('input[placeholder*="Alice"]').fill(baseName);
    await overlay.locator('button[type="submit"]').click();
    await expect(overlay).toBeHidden({ timeout: 10000 });
    await page.waitForSelector(`td:has-text("${baseName}")`, { timeout: 10000 });

    // Bulk add same name
    await page.click('button:has-text("+ Bulk Add")');
    overlay = page.locator('.fixed.inset-0');
    await overlay.locator('textarea').fill(baseName);
    await overlay.locator('button[type="submit"]').click();

    await expect(overlay.locator('text=/Added 1 user/i')).toBeVisible({ timeout: 10000 });
    await overlay.locator('button:has-text("Close")').click();
    await expect(overlay).toBeHidden({ timeout: 5000 });

    await page.waitForSelector(`td:has-text("${baseName} 2")`, { timeout: 10000 });
    await expect(page.locator(`td:has-text("${baseName} 2")`)).toBeVisible();

    // Clean up
    for (let i = 0; i < 2; i++) {
      const row = page.locator('tr').filter({ hasText: baseName }).first();
      await row.locator('button:has-text("Delete")').click();
      await page.locator('.fixed.inset-0').locator('button', { hasText: 'Delete' }).click();
      await page.waitForTimeout(400);
    }
  });

  test('Edit User still rejects exact duplicate name', async ({ page }) => {
    const nameA = `EdupeA_${Date.now()}`;
    const nameB = `EdupeB_${Date.now()}`;

    // Create user A
    await page.click('button:has-text("+ Add User")');
    let overlay = page.locator('.fixed.inset-0');
    await overlay.locator('input[placeholder*="Alice"]').fill(nameA);
    await overlay.locator('button[type="submit"]').click();
    await expect(overlay).toBeHidden({ timeout: 10000 });
    await page.waitForSelector(`td:has-text("${nameA}")`, { timeout: 10000 });

    // Create user B
    await page.click('button:has-text("+ Add User")');
    overlay = page.locator('.fixed.inset-0');
    await overlay.locator('input[placeholder*="Alice"]').fill(nameB);
    await overlay.locator('button[type="submit"]').click();
    await expect(overlay).toBeHidden({ timeout: 10000 });
    await page.waitForSelector(`td:has-text("${nameB}")`, { timeout: 10000 });

    // Try to rename B → A (should fail with error)
    const rowB = page.locator('tr', { hasText: nameB });
    await rowB.locator('button:has-text("Edit")').click();
    overlay = page.locator('.fixed.inset-0');
    const nameInput = overlay.locator('input[placeholder*="Alice"]');
    await nameInput.clear();
    await nameInput.fill(nameA);
    await overlay.locator('button[type="submit"]').click();

    await expect(overlay.locator('text=/already taken/i')).toBeVisible({ timeout: 10000 });
    await overlay.locator('button:has-text("Cancel")').click();

    // Clean up
    for (const name of [nameA, nameB]) {
      const row = page.locator('tr').filter({ hasText: name }).first();
      await row.locator('button:has-text("Delete")').click();
      await page.locator('.fixed.inset-0').locator('button', { hasText: 'Delete' }).click();
      await page.waitForTimeout(400);
    }
  });
});
