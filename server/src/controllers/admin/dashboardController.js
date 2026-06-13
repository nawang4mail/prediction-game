import pool from '../../config/db.js';
import { leaderboard } from '../../models/predictionModel.js';
import { findById } from '../../models/gameModel.js';

export const getStats = async (req, res, next) => {
  try {
    const [[matchRow], [userRow], [predRow], top5, game] = await Promise.all([
      pool.query(
        `
        SELECT
          COUNT(*) AS total,
          SUM(result IS NOT NULL) AS with_result,
          SUM(result IS NULL) AS pending
        FROM matches
        WHERE game_id = ?
      `,
        [req.gameId]
      ),
      pool.query('SELECT COUNT(*) AS total FROM users WHERE game_id = ?', [req.gameId]),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
         WHERE m.game_id = ?`,
        [req.gameId]
      ),
      leaderboard(req.gameId),
      findById(req.gameId),
    ]);

    res.json({
      game,
      matches: {
        total: matchRow[0].total,
        with_result: matchRow[0].with_result,
        pending: matchRow[0].pending,
      },
      users: userRow[0].total,
      predictions: predRow[0].total,
      top5: top5.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
};
