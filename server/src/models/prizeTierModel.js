import pool from '../config/db.js';

export const findByGame = async (gameId) => {
  const [rows] = await pool.query(
    'SELECT id, label, percentage, sort_order FROM prize_tiers WHERE game_id = ? ORDER BY sort_order ASC, id ASC',
    [gameId]
  );
  return rows;
};

// Replaces a game's prize tiers wholesale. The admin editor sends the full list
// each save, so deleting and re-inserting keeps ordering and removals simple.
export const replaceAll = async (gameId, tiers) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM prize_tiers WHERE game_id = ?', [gameId]);
    for (let i = 0; i < tiers.length; i++) {
      await conn.query(
        'INSERT INTO prize_tiers (game_id, sort_order, label, percentage) VALUES (?, ?, ?, ?)',
        [gameId, i, tiers[i].label, tiers[i].percentage]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
