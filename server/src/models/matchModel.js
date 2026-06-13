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

export const count = async (gameId) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM matches WHERE game_id = ?',
    [gameId]
  );
  return rows[0].total;
};
