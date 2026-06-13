import pool from '../config/db.js';

const DEFAULTS = { prize_text: '', rules_text: '' };

export const getAll = async (gameId) => {
  const [rows] = await pool.query(
    'SELECT `key`, `value` FROM settings WHERE game_id = ?',
    [gameId]
  );
  return { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value ?? ''])) };
};

export const setMany = async (gameId, obj) => {
  for (const [key, value] of Object.entries(obj)) {
    await pool.query(
      `INSERT INTO settings (game_id, \`key\`, \`value\`) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
      [gameId, key, value]
    );
  }
};
