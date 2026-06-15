import pool from '../config/db.js';

// Returns every stage of a game with its teams nested under `teams`.
export const findByGame = async (gameId) => {
  const [stages] = await pool.query(
    'SELECT * FROM bracket_stages WHERE game_id = ? ORDER BY sort_order ASC, id ASC',
    [gameId]
  );
  if (!stages.length) return [];
  const [teams] = await pool.query(
    'SELECT * FROM stage_teams WHERE stage_id IN (?) ORDER BY sort_order ASC, id ASC',
    [stages.map((s) => s.id)]
  );
  return stages.map((s) => ({ ...s, teams: teams.filter((t) => t.stage_id === s.id) }));
};

export const findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM bracket_stages WHERE id = ?', [id]);
  return rows[0] ?? null;
};

// Writes the team list for a stage, diffing by name so existing teams keep their
// id and is_winner flag across edits; removed teams are deleted (which cascades
// any player selections, US-48).
const writeTeams = async (conn, stageId, teams) => {
  const [existing] = await conn.query('SELECT id, name FROM stage_teams WHERE stage_id = ?', [
    stageId,
  ]);
  const idByName = new Map(existing.map((t) => [t.name, t.id]));
  const keepIds = [];
  for (let i = 0; i < teams.length; i++) {
    const name = teams[i];
    const existingId = idByName.get(name);
    if (existingId) {
      await conn.query('UPDATE stage_teams SET sort_order = ? WHERE id = ?', [i, existingId]);
      keepIds.push(existingId);
    } else {
      const [r] = await conn.query(
        'INSERT INTO stage_teams (stage_id, name, sort_order) VALUES (?, ?, ?)',
        [stageId, name, i]
      );
      keepIds.push(r.insertId);
    }
  }
  if (keepIds.length) {
    await conn.query('DELETE FROM stage_teams WHERE stage_id = ? AND id NOT IN (?)', [
      stageId,
      keepIds,
    ]);
  } else {
    await conn.query('DELETE FROM stage_teams WHERE stage_id = ?', [stageId]);
  }
};

export const create = async ({
  game_id,
  name,
  pick_count,
  points_per_correct,
  all_correct_bonus,
  teams,
}) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[{ next_order }]] = await conn.query(
      'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM bracket_stages WHERE game_id = ?',
      [game_id]
    );
    const [res] = await conn.query(
      `INSERT INTO bracket_stages
         (game_id, name, pick_count, points_per_correct, all_correct_bonus, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [game_id, name, pick_count, points_per_correct, all_correct_bonus, next_order]
    );
    await writeTeams(conn, res.insertId, teams);
    await conn.commit();
    return res.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const update = async (
  id,
  { name, pick_count, points_per_correct, all_correct_bonus, teams }
) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE bracket_stages
         SET name = ?, pick_count = ?, points_per_correct = ?, all_correct_bonus = ?
       WHERE id = ?`,
      [name, pick_count, points_per_correct, all_correct_bonus, id]
    );
    await writeTeams(conn, id, teams);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const remove = async (id) => {
  const [res] = await pool.query('DELETE FROM bracket_stages WHERE id = ?', [id]);
  return res.affectedRows;
};

// Type-aware leaderboard for a Bracket Prediction game (US-49). A player's score
// is, per stage, (correct picks × points_per_correct) plus the stage's
// all_correct_bonus when every one of their picks is correct (correct = pick_count).
// Returns the same shape as predictionModel.leaderboard so the UI is unchanged.
export const leaderboard = async (gameId) => {
  const [rows] = await pool.query(
    `
    SELECT
      u.id,
      u.display_name,
      COALESCE(SUM(s.score), 0) AS total_points,
      RANK() OVER (ORDER BY COALESCE(SUM(s.score), 0) DESC) AS \`rank\`
    FROM users u
    LEFT JOIN (
      SELECT
        ss.user_id,
        bs.id AS stage_id,
        SUM(st.is_winner) * bs.points_per_correct
          + CASE WHEN SUM(st.is_winner) = bs.pick_count THEN bs.all_correct_bonus ELSE 0 END
          AS score
      FROM stage_selections ss
      JOIN stage_teams st    ON st.id = ss.stage_team_id
      JOIN bracket_stages bs ON bs.id = st.stage_id
      WHERE bs.game_id = ?
      GROUP BY ss.user_id, bs.id
    ) s ON s.user_id = u.id
    WHERE u.game_id = ?
    GROUP BY u.id, u.display_name
    ORDER BY total_points DESC
  `,
    [gameId, gameId]
  );
  return rows;
};

// Public per-stage breakdown (US-49, parallel to US-33): each stage with its
// teams, how many players picked each, and which actually won.
export const breakdown = async (gameId) => {
  const [rows] = await pool.query(
    `
    SELECT
      bs.id AS stage_id, bs.name AS stage_name, bs.pick_count,
      bs.points_per_correct, bs.all_correct_bonus, bs.sort_order AS stage_order,
      st.id AS team_id, st.name AS team_name, st.is_winner, st.sort_order AS team_order,
      COUNT(ss.id) AS picks
    FROM bracket_stages bs
    JOIN stage_teams st ON st.stage_id = bs.id
    LEFT JOIN stage_selections ss ON ss.stage_team_id = st.id
    WHERE bs.game_id = ?
    GROUP BY st.id
    ORDER BY bs.sort_order ASC, bs.id ASC, picks DESC, st.sort_order ASC, st.id ASC
  `,
    [gameId]
  );
  const byStage = new Map();
  for (const r of rows) {
    if (!byStage.has(r.stage_id)) {
      byStage.set(r.stage_id, {
        id: r.stage_id,
        name: r.stage_name,
        pick_count: r.pick_count,
        points_per_correct: r.points_per_correct,
        all_correct_bonus: r.all_correct_bonus,
        teams: [],
      });
    }
    byStage.get(r.stage_id).teams.push({
      id: r.team_id,
      name: r.team_name,
      is_winner: r.is_winner,
      picks: Number(r.picks),
    });
  }
  return [...byStage.values()];
};

// Records which teams actually qualified/won in a stage (US-47). Clears the flag
// on the rest. Scoped by stage_id so stray ids can never touch another stage.
export const setWinners = async (stageId, teamIds) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE stage_teams SET is_winner = 0 WHERE stage_id = ?', [stageId]);
    if (teamIds.length) {
      await conn.query('UPDATE stage_teams SET is_winner = 1 WHERE stage_id = ? AND id IN (?)', [
        stageId,
        teamIds,
      ]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
