import pool from '../config/db.js';

export const findAll = async () => {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] ?? null;
};

export const create = async ({ display_name }) => {
  const [result] = await pool.query('INSERT INTO users (display_name) VALUES (?)', [display_name]);
  return result.insertId;
};

export const update = async (id, { display_name }) => {
  const [result] = await pool.query('UPDATE users SET display_name = ? WHERE id = ?', [display_name, id]);
  return result.affectedRows;
};

export const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows;
};
