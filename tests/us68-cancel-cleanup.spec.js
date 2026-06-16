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
const usersOf = (request, gid) =>
  request.get(`${API}/api/admin/users?game_id=${gid}`, { headers: auth }).then((r) => r.json());

test.describe('US-68: delete cancelled incomplete entries (server)', () => {
  test('an entry with no picks can self-delete; one with picks cannot', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Cancel ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;
    const sid = (
      await (
        await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
          headers: auth,
          data: { name: 'QF', teams: ['A', 'B'], pick_count: 1, points_per_correct: 1 },
        })
      ).json()
    ).id;
    await setStatus(request, gid, 'open');
    try {
      // Incomplete entry (no picks) → deletable, leaves no record.
      const incomplete = await (
        await request.post(`${API}/api/participants`, { data: { display_name: `Empty${Date.now()}`, game_id: gid } })
      ).json();
      const del = await request.delete(`${API}/api/participants/me`, {
        headers: { 'x-entry-token': incomplete.entry_token },
      });
      expect(del.status()).toBe(200);
      expect((await usersOf(request, gid)).some((u) => u.id === incomplete.id)).toBe(false);

      // Completed entry (has a pick) → cannot self-delete.
      const complete = await (
        await request.post(`${API}/api/participants`, { data: { display_name: `Done${Date.now()}`, game_id: gid } })
      ).json();
      const pAuth = { 'x-entry-token': complete.entry_token };
      const teamId = (
        await (await request.get(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth })).json()
      )[0].teams[0].id;
      await request.put(`${API}/api/participants/me/bracket`, { headers: pAuth, data: { stage_id: sid, team_ids: [teamId] } });
      const blocked = await request.delete(`${API}/api/participants/me`, { headers: pAuth });
      expect(blocked.status()).toBe(409);
      expect((await usersOf(request, gid)).some((u) => u.id === complete.id)).toBe(true);
    } finally {
      await setStatus(request, gid, 'locked');
      await setStatus(request, gid, 'finished');
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth });
    }
  });
});

test.describe('US-68: cancelling a new bracket entry removes it (UI)', () => {
  test('wizard Cancel on a no-picks entry calls delete and leaves the page', async ({ page }) => {
    let deleted = false;
    await page.addInitScript(() => {
      localStorage.setItem('entry_token', 'tok');
      localStorage.setItem('pg_entries', JSON.stringify([{ token: 'tok', name: 'Bob', game_id: 100, is_self: true }]));
    });
    await page.route('**/api/participants/statuses', (r) => r.fulfill({ json: [{ token: 'tok', status: 'approved' }] }));
    await page.route('**/api/participants/me', (r) => {
      if (r.request().method() === 'DELETE') {
        deleted = true;
        return r.fulfill({ json: { message: 'Deleted' } });
      }
      return r.fulfill({
        json: {
          participant: { id: 1, display_name: 'Bob', status: 'approved', status_message: null },
          game: { id: 100, name: 'Cup', status: 'open', type: 'bracket_prediction' },
          predictions: [],
          stages: [
            { id: 1, name: 'QF', pick_count: 1, points_per_correct: 1, all_correct_bonus: 0, parent_ids: [], teams: [{ id: 11, name: 'A' }, { id: 12, name: 'B' }] },
          ],
          selections: [], // brand-new, no picks
        },
      });
    });
    await page.goto('/my-predictions');

    // New entry → wizard opens (US-57). Cancel it (no picks) → delete is called.
    await expect(page.getByTestId('bracket-wizard')).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await page.getByTestId('wizard-cancel').click();
    await expect.poll(() => deleted).toBe(true);
    await page.waitForURL('**/join');
  });
});
