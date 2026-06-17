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

test.describe('US-67: entry statuses endpoint (server)', () => {
  test('returns the status for each provided token', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Pend ${Date.now()}`, type: 'guess_winners' },
        })
      ).json()
    ).id;
    await setStatus(request, gid, 'open');
    try {
      const a = await (
        await request.post(`${API}/api/participants`, { data: { display_name: `One${Date.now()}`, game_id: gid } })
      ).json();
      const b = await (
        await request.post(`${API}/api/participants`, { data: { display_name: `Two${Date.now()}`, game_id: gid } })
      ).json();
      // Approve one; the other stays declined (self-join default).
      await request.put(`${API}/api/admin/users/${a.id}/status?game_id=${gid}`, {
        headers: auth,
        data: { status: 'approved' },
      });

      const res = await request.post(`${API}/api/participants/statuses`, {
        data: { tokens: [a.entry_token, b.entry_token] },
      });
      expect(res.status()).toBe(200);
      const list = await res.json();
      const byToken = Object.fromEntries(list.map((s) => [s.token, s.status]));
      expect(byToken[a.entry_token]).toBe('approved');
      expect(byToken[b.entry_token]).toBe('declined');
    } finally {
      await setStatus(request, gid, 'locked');
      await setStatus(request, gid, 'finished');
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth });
    }
  });
});

// The in-page pending-entries warning moved to a global banner on every public
// page — see tests/us71-global-pending-banner.spec.js (US-71 amends US-67).
