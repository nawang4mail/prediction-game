import pool from '../config/db.js';

export const findAll = async (gameId) => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE game_id = ? ORDER BY created_at ASC',
    [gameId]
  );
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] ?? null;
};

export const create = async ({ game_id, display_name, phone }) => {
  const [result] = await pool.query(
    'INSERT INTO users (game_id, display_name, phone) VALUES (?, ?, ?)',
    [game_id, display_name, phone ?? null]
  );
  return result.insertId;
};

export const createWithAutoSuffix = async ({ game_id, display_name, phone }) => {
  let name = display_name;
  let n = 1;
  while (n <= 99) {
    try {
      const [result] = await pool.query(
        'INSERT INTO users (game_id, display_name, phone) VALUES (?, ?, ?)',
        [game_id, name, phone ?? null]
      );
      return { id: result.insertId, display_name: name };
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
      n++;
      name = `${display_name} ${n}`;
    }
  }
  throw new Error('Too many users with the same name');
};

export const update = async (id, { display_name, phone }) => {
  const [result] = await pool.query(
    'UPDATE users SET display_name = ?, phone = ? WHERE id = ?',
    [display_name, phone ?? null, id]
  );
  return result.affectedRows;
};

export const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows;
};
