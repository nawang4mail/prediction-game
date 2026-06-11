import pool from '../config/db.js';

export const findAll = async () => {
  const [rows] = await pool.query('SELECT * FROM matches ORDER BY created_at ASC');
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM matches WHERE id = ?', [id]);
  return rows[0] ?? null;
};

export const create = async ({ team_a, team_b, label, match_date }) => {
  const [result] = await pool.query(
    'INSERT INTO matches (team_a, team_b, label, match_date) VALUES (?, ?, ?, ?)',
    [team_a, team_b, label ?? null, match_date ?? null]
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

export const count = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM matches');
  return rows[0].total;
};
