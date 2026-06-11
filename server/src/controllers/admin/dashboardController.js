import pool from '../../config/db.js';
import { leaderboard } from '../../models/predictionModel.js';

export const getStats = async (req, res, next) => {
  try {
    const [[matchRow], [userRow], [predRow], top5] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total,
          SUM(result IS NOT NULL) AS with_result,
          SUM(result IS NULL) AS pending
        FROM matches
      `),
      pool.query('SELECT COUNT(*) AS total FROM users'),
      pool.query('SELECT COUNT(*) AS total FROM predictions'),
      leaderboard(),
    ]);

    res.json({
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
