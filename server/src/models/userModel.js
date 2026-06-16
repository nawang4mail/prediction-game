import pool from '../config/db.js';

// Self-joined entries start declined with this message until an admin approves. (US-65)
export const DEFAULT_DECLINE_MESSAGE =
  'Your entry is awaiting admin approval. Please contact the admin.';

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

export const createWithAutoSuffix = async ({ game_id, display_name, phone, entry_token }) => {
  // A self-joined entry carries an entry_token and defaults to declined with the
  // default message; admin-added users (no token) default to approved. (US-65)
  const selfJoined = !!entry_token;
  const status = selfJoined ? 'declined' : 'approved';
  const statusMessage = selfJoined ? DEFAULT_DECLINE_MESSAGE : null;
  let name = display_name;
  let n = 1;
  while (n <= 99) {
    try {
      const [result] = await pool.query(
        'INSERT INTO users (game_id, display_name, phone, entry_token, status, status_message) VALUES (?, ?, ?, ?, ?, ?)',
        [game_id, name, phone ?? null, entry_token ?? null, status, statusMessage]
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

export const setStatus = async (id, status, message) => {
  const [result] = await pool.query(
    'UPDATE users SET status = ?, status_message = ? WHERE id = ?',
    [status, message ?? null, id]
  );
  return result.affectedRows;
};

export const findByEntryToken = async (token) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE entry_token = ?', [token]);
  return rows[0] ?? null;
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
