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
const pick = async (request, gid, sid, teamId) => {
  const j = await (
    await request.post(`${API}/api/participants`, { data: { display_name: `P${Math.random()}`, game_id: gid } })
  ).json();
  await request.put(`${API}/api/participants/me/bracket`, {
    headers: { 'x-entry-token': j.entry_token },
    data: { stage_id: sid, team_ids: [teamId] },
  });
};

test.describe('US-51: breakdown ranked by selections (server)', () => {
  test('stage teams are ordered by pick count, most picked first', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Rank ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;
    const sid = (
      await (
        await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
          headers: auth,
          data: { name: 'Winner', teams: ['Brazil', 'Argentina', 'France', 'England'], pick_count: 1, points_per_correct: 1 },
        })
      ).json()
    ).id;
    await setStatus(request, gid, 'open');
    const t = (await (await request.get(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth })).json())[0].teams;
    const id = (name) => t.find((x) => x.name === name).id;

    await pick(request, gid, sid, id('France')); // France: 2
    await pick(request, gid, sid, id('France'));
    await pick(request, gid, sid, id('Brazil')); // Brazil: 1
    // Argentina, England: 0

    const bd = await (await request.get(`${API}/api/bracket?game_id=${gid}`)).json();
    const order = bd.find((s) => s.id === sid).teams.map((x) => x.name);
    // France (2) > Brazil (1) > Argentina, England (0, tie broken by original order)
    expect(order).toEqual(['France', 'Brazil', 'Argentina', 'England']);

    await setStatus(request, gid, 'locked');
    await setStatus(request, gid, 'finished');
  });
});
