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

// Latest game that participants/visitors may see — drafts are excluded so the
// public side never falls back to an unpublished game. (US-38)
export const findLatestVisible = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM games WHERE status <> 'draft' ORDER BY created_at DESC, id DESC LIMIT 1"
  );
  return rows[0] ?? null;
};

export const create = async ({ name, type = 'guess_winners' }) => {
  const [result] = await pool.query(
    "INSERT INTO games (name, type, status) VALUES (?, ?, 'draft')",
    [name, type]
  );
  return result.insertId;
};

export const updateStatus = async (id, status) => {
  const [result] = await pool.query('UPDATE games SET status = ? WHERE id = ?', [status, id]);
  return result.affectedRows;
};

export const updateType = async (id, type) => {
  const [result] = await pool.query('UPDATE games SET type = ? WHERE id = ?', [type, id]);
  return result.affectedRows;
};

export const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM games WHERE id = ?', [id]);
  return result.affectedRows;
};

export const findByIds = async (ids) => {
  if (!ids.length) return [];
  const [rows] = await pool.query('SELECT * FROM games WHERE id IN (?)', [ids]);
  return rows;
};

export const removeMany = async (ids) => {
  if (!ids.length) return 0;
  const [result] = await pool.query('DELETE FROM games WHERE id IN (?)', [ids]);
  return result.affectedRows;
};
