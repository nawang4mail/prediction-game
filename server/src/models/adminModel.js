import pool from '../config/db.js';

export const findByUsername = async (username) => {
  const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
  return rows[0] ?? null;
};
