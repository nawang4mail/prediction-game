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
