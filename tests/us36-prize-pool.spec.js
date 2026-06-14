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

const token = jwt.sign({ id: 1, username: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${token}` };

const adminGames = (request) =>
  request.get(`${API}/api/admin/games`, { headers: auth }).then((r) => r.json());

test.describe.serial('US-36: prize pool (server)', () => {
  let gid;
  let origStatus;
  let origSettings;
  let origTiers;

  test.beforeAll(async ({ request }) => {
    const active = (await adminGames(request)).find((g) => g.status === 'open' || g.status === 'locked');
    expect(active, 'need an active game').toBeTruthy();
    gid = active.id;
    origStatus = active.status;
    origSettings = await (
      await request.get(`${API}/api/admin/settings?game_id=${gid}`, { headers: auth })
    ).json();
    origTiers = await (
      await request.get(`${API}/api/admin/prize-tiers?game_id=${gid}`, { headers: auth })
    ).json();
  });

  test.afterAll(async ({ request }) => {
    await request.put(`${API}/api/admin/settings?game_id=${gid}`, { headers: auth, data: origSettings });
    await request.put(`${API}/api/admin/prize-tiers?game_id=${gid}`, {
      headers: auth,
      data: { tiers: origTiers.map((t) => ({ label: t.label, percentage: Number(t.percentage) })) },
    });
  });

  test('dashboard computes collected, commission, pool and tier amounts', async ({ request }) => {
    await request.put(`${API}/api/admin/settings?game_id=${gid}`, {
      headers: auth,
      data: { ...origSettings, entry_cost: 10, commission_pct: 10 },
    });
    await request.put(`${API}/api/admin/prize-tiers?game_id=${gid}`, {
      headers: auth,
      data: { tiers: [{ label: '1st Prize', percentage: 60 }, { label: '2nd Prize', percentage: 40 }] },
    });

    const stats = await (
      await request.get(`${API}/api/admin/dashboard?game_id=${gid}`, { headers: auth })
    ).json();
    const f = stats.finance;
    const players = stats.users;

    const collected = players * 10;
    const commission = (collected * 10) / 100;
    const pool = collected - commission;

    expect(f.total_collected).toBeCloseTo(collected, 2);
    expect(f.commission_amount).toBeCloseTo(commission, 2);
    expect(f.prize_pool).toBeCloseTo(pool, 2);
    expect(f.tiers).toHaveLength(2);
    expect(f.tiers[0].amount).toBeCloseTo((pool * 60) / 100, 2);
    expect(f.tiers[1].amount).toBeCloseTo((pool * 40) / 100, 2);
  });

  test('prize tiers round-trip via the admin endpoint', async ({ request }) => {
    const tiers = await (
      await request.get(`${API}/api/admin/prize-tiers?game_id=${gid}`, { headers: auth })
    ).json();
    expect(tiers.map((t) => t.label)).toEqual(['1st Prize', '2nd Prize']);
  });

  test('editing tiers on a finished game is blocked', async ({ request }) => {
    const finished = (await adminGames(request)).find((g) => g.status === 'finished');
    expect(finished).toBeTruthy();
    const res = await request.put(`${API}/api/admin/prize-tiers?game_id=${finished.id}`, {
      headers: auth,
      data: { tiers: [{ label: 'Late', percentage: 50 }] },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('US-36: settings & dashboard UI', () => {
  test('prize tier editor updates the running total and warns over 100%', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.route('**/api/admin/settings**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: { prize_text: '', rules_text: '', finish_message: '', entry_cost: '10', commission_pct: '10' } })
        : r.continue()
    );
    await page.route('**/api/admin/prize-tiers**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 1, label: '1st', percentage: '70', sort_order: 0 }] })
        : r.continue()
    );

    await page.goto('/admin/settings');
    await expect(page.getByTestId('tier-total')).toHaveText(/70%/);

    await page.getByRole('button', { name: '+ Add prize tier' }).click();
    await page.locator('[data-testid="tier-row-1"] input[type="number"]').fill('50');
    await expect(page.getByTestId('tier-total')).toHaveText(/120%/);
    await expect(page.locator('text=more than 100%')).toBeVisible();
  });

  test('dashboard renders the prize pool breakdown', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.route('**/api/admin/dashboard**', (r) =>
      r.fulfill({
        json: {
          game: { id: 1, name: 'Cup', status: 'open' },
          matches: { total: 3, with_result: 1, pending: 2 },
          users: 20,
          predictions: 10,
          top5: [],
          finance: {
            entry_cost: 10,
            commission_pct: 10,
            total_collected: 200,
            commission_amount: 20,
            prize_pool: 180,
            tiers: [
              { label: '1st Prize', percentage: 60, amount: 108 },
              { label: '2nd Prize', percentage: 40, amount: 72 },
            ],
          },
        },
      })
    );

    await page.goto('/admin');
    const section = page.getByTestId('finance-section');
    await expect(section).toContainText('$200.00');
    await expect(section).toContainText('$180.00');
    await expect(section).toContainText('$108.00');
    await expect(section).toContainText('$72.00');
  });
});
