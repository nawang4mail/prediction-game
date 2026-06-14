import pool from '../config/db.js';

export const findAll = async (gameId) => {
  const [rows] = await pool.query(
    'SELECT * FROM matches WHERE game_id = ? ORDER BY created_at ASC',
    [gameId]
  );
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM matches WHERE id = ?', [id]);
  return rows[0] ?? null;
};

export const create = async ({ game_id, team_a, team_b, label, match_date }) => {
  const [result] = await pool.query(
    'INSERT INTO matches (game_id, team_a, team_b, label, match_date) VALUES (?, ?, ?, ?, ?)',
    [game_id, team_a, team_b, label ?? null, match_date ?? null]
  );
  return result.insertId;
};

export const update = async (id, fields) => {
  const [result] = await pool.query('UPDATE matches SET ? WHERE id = ?', [fields, id]);
  return result.affectedRows;
};

export const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM matches WHERE id = ?', [id]);
  return result.affectedRows;
};

export const findAllWithPredictionCounts = async (gameId) => {
  const [rows] = await pool.query(
    `
    SELECT
      m.id, m.team_a, m.team_b, m.label, m.result,
      COALESCE(m.label, CONCAT(m.team_a, ' vs ', m.team_b)) AS match_label,
      COUNT(CASE WHEN p.prediction = 'team_a' THEN 1 END) AS team_a_count,
      COUNT(CASE WHEN p.prediction = 'team_b' THEN 1 END) AS team_b_count,
      COUNT(CASE WHEN p.prediction = 'draw'   THEN 1 END) AS draw_count
    FROM matches m
    LEFT JOIN predictions p ON p.match_id = m.id
    WHERE m.game_id = ?
    GROUP BY m.id
    ORDER BY m.created_at ASC
  `,
    [gameId]
  );
  return rows;
};
