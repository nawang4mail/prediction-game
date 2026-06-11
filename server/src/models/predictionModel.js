import pool from '../config/db.js';

export const findAll = async () => {
  const [rows] = await pool.query(`
    SELECT p.*, u.display_name, m.team_a, m.team_b, m.label,
           (p.prediction = m.result) AS is_correct
    FROM predictions p
    JOIN users u   ON u.id = p.user_id
    JOIN matches m ON m.id = p.match_id
  `);
  return rows;
};

export const upsert = async ({ user_id, match_id, prediction }) => {
  await pool.query(
    `INSERT INTO predictions (user_id, match_id, prediction) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE prediction = VALUES(prediction)`,
    [user_id, match_id, prediction]
  );
};

export const remove = async ({ user_id, match_id }) => {
  const [result] = await pool.query(
    'DELETE FROM predictions WHERE user_id = ? AND match_id = ?',
    [user_id, match_id]
  );
  return result.affectedRows;
};

export const findByUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT
       m.id          AS match_id,
       m.team_a,
       m.team_b,
       COALESCE(m.label, CONCAT(m.team_a, ' vs ', m.team_b)) AS match_label,
       m.result      AS match_result,
       p.prediction
     FROM matches m
     LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = ?
     ORDER BY m.created_at ASC`,
    [userId]
  );
  return rows;
};

export const leaderboard = async () => {
  const [rows] = await pool.query(`
    SELECT
      u.id,
      u.display_name,
      COUNT(CASE WHEN p.prediction = m.result THEN 1 END) AS total_points,
      RANK() OVER (ORDER BY COUNT(CASE WHEN p.prediction = m.result THEN 1 END) DESC) AS \`rank\`
    FROM users u
    LEFT JOIN predictions p ON p.user_id = u.id
    LEFT JOIN matches     m ON m.id = p.match_id
    GROUP BY u.id, u.display_name
    ORDER BY total_points DESC
  `);
  return rows;
};
