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
const setStatus = (request, gid, status) =>
  request.put(`${API}/api/admin/games/${gid}/status`, { headers: auth, data: { status } });

test.describe('US-65: user approval (server)', () => {
  test('admin-added approved by default; self-joined declined; admin can flip status', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Approve ${Date.now()}`, type: 'guess_winners' },
        })
      ).json()
    ).id;
    await setStatus(request, gid, 'open');
    try {
      // Admin-added user → approved.
      const addRes = await request.post(`${API}/api/admin/users?game_id=${gid}`, {
        headers: auth,
        data: { display_name: `Admin ${Date.now()}` },
      });
      const adminUserId = (await addRes.json()).id;

      // Self-joined participant → declined with a default message.
      const joined = await (
        await request.post(`${API}/api/participants`, { data: { display_name: `Self ${Date.now()}`, game_id: gid } })
      ).json();

      const users = await (await request.get(`${API}/api/admin/users?game_id=${gid}`, { headers: auth })).json();
      const adminUser = users.find((u) => u.id === adminUserId);
      const selfUser = users.find((u) => u.display_name === joined.display_name);
      expect(adminUser.status).toBe('approved');
      expect(selfUser.status).toBe('declined');
      expect(selfUser.status_message).toBeTruthy();

      // /participants/me exposes the status to the participant.
      const me = await (
        await request.get(`${API}/api/participants/me`, { headers: { 'x-entry-token': joined.entry_token } })
      ).json();
      expect(me.participant.status).toBe('declined');
      expect(me.participant.status_message).toBeTruthy();

      // Admin approves the self-joined entry.
      const ok = await request.put(`${API}/api/admin/users/${selfUser.id}/status?game_id=${gid}`, {
        headers: auth,
        data: { status: 'approved' },
      });
      expect(ok.status()).toBe(200);
      const me2 = await (
        await request.get(`${API}/api/participants/me`, { headers: { 'x-entry-token': joined.entry_token } })
      ).json();
      expect(me2.participant.status).toBe('approved');
    } finally {
      await setStatus(request, gid, 'locked');
      await setStatus(request, gid, 'finished');
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth });
    }
  });
});

test.describe('US-65: user approval (UI)', () => {
  test('admin declines a user with a message; participant sees it', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    let lastPut = null;
    await page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 70, name: 'Cup', type: 'guess_winners', status: 'open', created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );
    // Register the general users route first; the specific /status route last so it
    // wins for that URL.
    await page.route('**/api/admin/users**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 1, display_name: 'Bob', phone: null, status: 'approved', status_message: null, created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );
    await page.route('**/api/admin/users/1/status', (r) => {
      lastPut = JSON.parse(r.request().postData() || '{}');
      return r.fulfill({ json: { message: 'Updated' } });
    });
    await page.goto('/admin/users');

    await expect(page.getByTestId('status-1')).toContainText('Approved');
    await page.getByTestId('decline-1').click();
    await page.locator('textarea').fill('Please contact the admin.');
    await page.getByTestId('confirm-decline').click();
    await expect.poll(() => lastPut?.status).toBe('declined');
    expect(lastPut.message).toBe('Please contact the admin.');
  });

  test('a declined participant sees the message on My Predictions', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('entry_token', 'tok'));
    await page.route('**/api/participants/me', (r) =>
      r.fulfill({
        json: {
          participant: { id: 1, display_name: 'Bob', status: 'declined', status_message: 'Admin must approve your entry.' },
          game: { id: 100, name: 'Cup', status: 'open', type: 'guess_winners' },
          predictions: [],
        },
      })
    );
    await page.goto('/my-predictions');
    await expect(page.getByTestId('declined-banner')).toContainText('Admin must approve your entry.');
  });
});
