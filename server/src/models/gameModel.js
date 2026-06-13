import pool from '../config/db.js';

export const findAll = async () => {
  const [rows] = await pool.query('SELECT * FROM games ORDER BY created_at DESC, id DESC');
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM games WHERE id = ?', [id]);
  return rows[0] ?? null;
};

export const findActive = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM games WHERE status IN ('open','locked') ORDER BY created_at DESC, id DESC LIMIT 1"
  );
  return rows[0] ?? null;
};

export const findLatest = async () => {
  const [rows] = await pool.query('SELECT * FROM games ORDER BY created_at DESC, id DESC LIMIT 1');
  return rows[0] ?? null;
};

export const create = async ({ name }) => {
  const [result] = await pool.query('INSERT INTO games (name) VALUES (?)', [name]);
  return result.insertId;
};

export const updateStatus = async (id, status) => {
  const [result] = await pool.query('UPDATE games SET status = ? WHERE id = ?', [status, id]);
  return result.affectedRows;
};
