import pool from '../config/db.js';

export const getAll = async () => {
  const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
};

export const setMany = async (obj) => {
  for (const [key, value] of Object.entries(obj)) {
    await pool.query('UPDATE settings SET `value` = ? WHERE `key` = ?', [value, key]);
  }
};
