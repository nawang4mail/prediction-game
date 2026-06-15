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
const addStage = (request, gid, data) =>
  request.post(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth, data }).then((r) => r.json());
const getStages = (request, gid) =>
  request.get(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth }).then((r) => r.json());

test.describe('US-52: combined stages (server)', () => {
  test('a combined stage inherits parent teams, filters per player, and scores', async ({ request }) => {
    const gid = (
      await (
        await request.post(`${API}/api/admin/games`, {
          headers: auth,
          data: { name: `Combo ${Date.now()}`, type: 'bracket_prediction' },
        })
      ).json()
    ).id;

    const a = await addStage(request, gid, { name: 'A', teams: ['Brazil', 'Argentina', 'France', 'England'], pick_count: 2, points_per_correct: 3 });
    const b = await addStage(request, gid, { name: 'B', teams: ['Germany', 'Spain'], pick_count: 1, points_per_correct: 3 });
    const c = await addStage(request, gid, { name: 'C', parent_ids: [a.id, b.id], pick_count: 2, points_per_correct: 5 });

    let stages = await getStages(request, gid);
    const C = stages.find((s) => s.id === c.id);
    expect(C.parent_ids.sort()).toEqual([a.id, b.id].sort());
    // C's team pool is the union of A + B teams.
    expect(C.teams.map((t) => t.name).sort()).toEqual(
      ['Argentina', 'Brazil', 'England', 'France', 'Germany', 'Spain']
    );

    // pick_count cannot exceed what the parents can supply (2 + 1 = 3).
    const bad = await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
      headers: auth,
      data: { name: 'TooBig', parent_ids: [b.id], pick_count: 5, points_per_correct: 1 },
    });
    expect(bad.status()).toBe(400);

    await setStatus(request, gid, 'open');
    const joined = await (
      await request.post(`${API}/api/participants`, { data: { display_name: `P${Date.now()}`, game_id: gid } })
    ).json();
    const pAuth = { 'x-entry-token': joined.entry_token };

    // Before picking parents, the combined stage shows no teams for this player.
    let me = await (await request.get(`${API}/api/participants/me`, { headers: pAuth })).json();
    expect(me.stages.find((s) => s.id === c.id).teams).toHaveLength(0);

    const teamId = (stage, name) => stage.teams.find((t) => t.name === name).id;
    const A = stages.find((s) => s.id === a.id);
    const B = stages.find((s) => s.id === b.id);
    await request.put(`${API}/api/participants/me/bracket`, {
      headers: pAuth,
      data: { stage_id: a.id, team_ids: [teamId(A, 'Brazil'), teamId(A, 'France')] },
    });
    await request.put(`${API}/api/participants/me/bracket`, {
      headers: pAuth,
      data: { stage_id: b.id, team_ids: [teamId(B, 'Spain')] },
    });

    // Now C offers exactly the teams this player advanced.
    me = await (await request.get(`${API}/api/participants/me`, { headers: pAuth })).json();
    const meC = me.stages.find((s) => s.id === c.id);
    expect(meC.teams.map((t) => t.name).sort()).toEqual(['Brazil', 'France', 'Spain']);

    // Picking a team the player did NOT advance (Germany) is rejected.
    const cGermany = teamId(C, 'Germany');
    const cBrazil = teamId(C, 'Brazil');
    const cSpain = teamId(C, 'Spain');
    const invalid = await request.put(`${API}/api/participants/me/bracket`, {
      headers: pAuth,
      data: { stage_id: c.id, team_ids: [cGermany, cBrazil] },
    });
    expect(invalid.status()).toBe(400);

    const ok = await request.put(`${API}/api/participants/me/bracket`, {
      headers: pAuth,
      data: { stage_id: c.id, team_ids: [cBrazil, cSpain] },
    });
    expect(ok.status()).toBe(200);

    // Results: A -> Brazil+Argentina, B -> Spain, C -> Brazil+Spain.
    await request.put(`${API}/api/admin/bracket/${a.id}/results?game_id=${gid}`, {
      headers: auth,
      data: { team_ids: [teamId(A, 'Brazil'), teamId(A, 'Argentina')] },
    });
    await request.put(`${API}/api/admin/bracket/${b.id}/results?game_id=${gid}`, {
      headers: auth,
      data: { team_ids: [teamId(B, 'Spain')] },
    });
    await request.put(`${API}/api/admin/bracket/${c.id}/results?game_id=${gid}`, {
      headers: auth,
      data: { team_ids: [cBrazil, cSpain] },
    });

    // Score = A(1×3) + B(1×3) + C(2×5) = 16, accumulated across all stages.
    const board = await (await request.get(`${API}/api/leaderboard?game_id=${gid}`)).json();
    expect(Number(board.find((r) => r.display_name === joined.display_name).total_points)).toBe(16);

    await setStatus(request, gid, 'locked');
    await setStatus(request, gid, 'finished');
  });
});

test.describe('US-52: combined stage admin UI', () => {
  test('a combined stage shows its parents on the card', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ json: [{ id: 60, name: 'Cup', type: 'bracket_prediction', status: 'open', created_at: '2026-01-01T00:00:00Z' }] })
        : r.continue()
    );
    await page.route('**/api/admin/bracket**', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({
            json: [
              { id: 1, name: 'Group A', pick_count: 2, points_per_correct: 3, all_correct_bonus: 0, parent_ids: [], teams: [{ id: 11, name: 'Brazil' }, { id: 12, name: 'France' }] },
              { id: 2, name: 'Last 8', pick_count: 1, points_per_correct: 5, all_correct_bonus: 0, parent_ids: [1], teams: [{ id: 21, name: 'Brazil' }, { id: 22, name: 'France' }] },
            ],
          })
        : r.continue()
    );
    await page.goto('/admin/bracket');

    await expect(page.getByTestId('combined-label')).toHaveText(/Combined from Group A/);
  });
});
