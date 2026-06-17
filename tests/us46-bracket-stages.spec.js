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

const createGame = (request, type) =>
  request
    .post(`${API}/api/admin/games`, { headers: auth, data: { name: `Bkt ${Date.now()}-${Math.random()}`, type } })
    .then((r) => r.json())
    .then((j) => j.id);

const listStages = (request, gid) =>
  request.get(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth }).then((r) => r.json());

test.describe('US-46: bracket stages (server)', () => {
  test('create, list, update, and delete a stage', async ({ request }) => {
    const gid = await createGame(request, 'bracket_prediction');
    try {
      const create = await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
        headers: auth,
        data: {
          name: 'Quarter-finalists',
          teams: ['Brazil', 'Argentina', 'France', 'England'],
          pick_count: 2,
          points_per_correct: 3,
          all_correct_bonus: 5,
        },
      });
      expect(create.status()).toBe(201);
      const sid = (await create.json()).id;

      let stages = await listStages(request, gid);
      expect(stages).toHaveLength(1);
      expect(stages[0].name).toBe('Quarter-finalists');
      expect(stages[0].teams.map((t) => t.name)).toEqual(['Brazil', 'Argentina', 'France', 'England']);
      expect(stages[0].pick_count).toBe(2);
      expect(stages[0].all_correct_bonus).toBe(5);

      const upd = await request.put(`${API}/api/admin/bracket/${sid}?game_id=${gid}`, {
        headers: auth,
        data: {
          name: 'Quarter-finalists',
          teams: ['Brazil', 'Argentina', 'Spain'], // drop France/England, add Spain
          pick_count: 1,
          points_per_correct: 3,
          all_correct_bonus: 0,
        },
      });
      expect(upd.status()).toBe(200);
      stages = await listStages(request, gid);
      expect(stages[0].teams.map((t) => t.name)).toEqual(['Brazil', 'Argentina', 'Spain']);
      expect(stages[0].pick_count).toBe(1);

      const del = await request.delete(`${API}/api/admin/bracket/${sid}?game_id=${gid}`, {
        headers: auth,
      });
      expect(del.status()).toBe(200);
      expect(await listStages(request, gid)).toHaveLength(0);
    } finally {
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth });
    }
  });

  test('rejects invalid stage payloads', async ({ request }) => {
    const gid = await createGame(request, 'bracket_prediction');
    const post = (data) =>
      request.post(`${API}/api/admin/bracket?game_id=${gid}`, { headers: auth, data });
    try {
      expect((await post({ name: 'X', teams: ['A'], pick_count: 1, points_per_correct: 1 })).status())
        .toBe(400); // < 2 teams
      expect(
        (await post({ name: 'X', teams: ['A', 'B'], pick_count: 3, points_per_correct: 1 })).status()
      ).toBe(400); // pick_count > teams
      expect(
        (await post({ name: 'X', teams: ['A', 'A'], pick_count: 1, points_per_correct: 1 })).status()
      ).toBe(400); // duplicate names
      expect(
        (await post({ name: '', teams: ['A', 'B'], pick_count: 1, points_per_correct: 1 })).status()
      ).toBe(400); // no name
    } finally {
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth });
    }
  });

  test('stages are rejected on a non-bracket game', async ({ request }) => {
    const gid = await createGame(request, 'guess_winners');
    try {
      const res = await request.post(`${API}/api/admin/bracket?game_id=${gid}`, {
        headers: auth,
        data: { name: 'X', teams: ['A', 'B'], pick_count: 1, points_per_correct: 1 },
      });
      expect(res.status()).toBe(400);
    } finally {
      await request.delete(`${API}/api/admin/games/${gid}`, { headers: auth });
    }
  });
});

test.describe('US-46: bracket admin UI', () => {
  const routeGames = (page, gamesList) =>
    page.route('**/api/admin/games**', (r) =>
      r.request().method() === 'GET' ? r.fulfill({ json: gamesList }) : r.continue()
    );
  const routeStages = (page, stages) =>
    page.route('**/api/admin/bracket**', (r) =>
      r.request().method() === 'GET' ? r.fulfill({ json: stages }) : r.continue()
    );

  const openBracketGame = { id: 60, name: 'Cup', type: 'bracket_prediction', status: 'open', created_at: '2026-01-01T00:00:00Z' };

  test('renders stage cards and the Add Stage button', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, [openBracketGame]);
    await routeStages(page, [
      {
        id: 1,
        name: 'Quarter-finalists',
        pick_count: 2,
        points_per_correct: 3,
        all_correct_bonus: 5,
        teams: [
          { id: 11, name: 'Brazil' },
          { id: 12, name: 'Argentina' },
          { id: 13, name: 'France' },
        ],
      },
    ]);
    await page.goto('/admin/bracket');

    await expect(page.getByTestId('stage-card')).toHaveCount(1);
    await expect(page.getByText('Quarter-finalists')).toBeVisible();
    await expect(page.getByText(/Pick 2 of 3/)).toBeVisible();
    await expect(page.getByText(/\+5 all-correct bonus/)).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Stage' })).toBeVisible();
  });

  test('a locked game hides Add Stage and shows the locked banner', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, [{ ...openBracketGame, status: 'locked' }]);
    await routeStages(page, []);
    await page.goto('/admin/bracket');

    await expect(page.getByTestId('bracket-locked-banner')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Stage' })).toHaveCount(0);
  });

  test('a non-bracket game shows the not-bracket notice', async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('admin_token', t), token);
    await routeGames(page, [{ ...openBracketGame, type: 'guess_winners' }]);
    await routeStages(page, []);
    await page.goto('/admin/bracket');

    await expect(page.getByTestId('not-bracket-banner')).toBeVisible();
  });
});
