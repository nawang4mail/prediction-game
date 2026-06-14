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
const getSettings = (request, gid) =>
  request.get(`${API}/api/admin/settings?game_id=${gid}`, { headers: auth }).then((r) => r.json());
const putSettings = (request, gid, body) =>
  request.put(`${API}/api/admin/settings?game_id=${gid}`, { headers: auth, data: body });
const setStatus = (request, gid, status) =>
  request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status } });

test.describe.serial('US-35: finish endpoint (server)', () => {
  let gid;
  let entryToken;
  let userId;
  let origStatus;
  let origSettings;

  test.beforeAll(async ({ request }) => {
    const active = (await adminGames(request)).find((g) => g.status === 'open' || g.status === 'locked');
    expect(active, 'need an active game').toBeTruthy();
    gid = active.id;
    origStatus = active.status;
    origSettings = await getSettings(request, gid);
    if (origStatus !== 'open') await setStatus(request, gid, 'open');
  });

  test.afterAll(async ({ request }) => {
    if (userId) await request.delete(`${API}/api/admin/users/${userId}?game_id=${gid}`, { headers: auth });
    // Restore the game's settings and status exactly as they were.
    await putSettings(request, gid, origSettings);
    if (origStatus && origStatus !== 'open') await setStatus(request, gid, origStatus);
  });

  test('returns the admin-configured finish message', async ({ request }) => {
    await putSettings(request, gid, { ...origSettings, finish_message: 'See you at kickoff!' });

    const joinRes = await request.post(`${API}/api/participants`, {
      data: { display_name: `Finisher_${Date.now()}` },
    });
    expect(joinRes.status()).toBe(201);
    const joined = await joinRes.json();
    entryToken = joined.entry_token;
    userId = joined.id;

    const fin = await request.post(`${API}/api/participants/me/finish`, {
      headers: { 'x-entry-token': entryToken },
    });
    expect(fin.status()).toBe(200);
    expect((await fin.json()).message).toBe('See you at kickoff!');
  });

  test('falls back to a default message when none is configured', async ({ request }) => {
    await putSettings(request, gid, { ...origSettings, finish_message: '' });
    const fin = await request.post(`${API}/api/participants/me/finish`, {
      headers: { 'x-entry-token': entryToken },
    });
    expect((await fin.json()).message).toContain('Game set');
  });

  test('finishing without a token is rejected', async ({ request }) => {
    const res = await request.post(`${API}/api/participants/me/finish`);
    expect(res.status()).toBe(401);
  });
});

test.describe('US-35: finish button (UI)', () => {
  const meOpenWithPicks = {
    participant: { id: 1, display_name: 'Bob' },
    game: { id: 100, name: 'Cup', status: 'open' },
    predictions: [
      { match_id: 1, match_label: 'USA vs Brazil', match_result: null, prediction: 'team_a' },
    ],
  };

  test('shows the button and the message returned on click', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
    await page.route('**/api/participants/me', (r) => r.fulfill({ json: meOpenWithPicks }));
    await page.route('**/api/participants/me/finish', (r) =>
      r.fulfill({ json: { message: 'All set, good luck!' } })
    );
    await page.goto('/my-predictions');

    await page.getByTestId('finish-button').click();
    await expect(page.getByTestId('finish-message')).toHaveText(/All set, good luck!/);
  });

  test('no finish button before any pick is made', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
    await page.route('**/api/participants/me', (r) =>
      r.fulfill({
        json: {
          ...meOpenWithPicks,
          predictions: [{ match_id: 1, match_label: 'USA vs Brazil', match_result: null, prediction: null }],
        },
      })
    );
    await page.goto('/my-predictions');
    await expect(page.getByTestId('finish-button')).toHaveCount(0);
  });

  test('no finish button when the game is locked', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
    await page.route('**/api/participants/me', (r) =>
      r.fulfill({ json: { ...meOpenWithPicks, game: { id: 100, name: 'Cup', status: 'locked' } } })
    );
    await page.goto('/my-predictions');
    await expect(page.getByTestId('finish-button')).toHaveCount(0);
  });
});
