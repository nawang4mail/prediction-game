import pool from '../../config/db.js';
import { leaderboard } from '../../models/predictionModel.js';
import {
  leaderboard as bracketLeaderboard,
  findByGame as findStages,
} from '../../models/bracketStageModel.js';
import { findById } from '../../models/gameModel.js';
import { getAll as getSettings } from '../../models/settingsModel.js';
import { findByGame as getPrizeTiers } from '../../models/prizeTierModel.js';

// Derives the prize-pool breakdown from the entry cost, commission, and tiers.
// (US-36)
function computeFinance(participants, settings, tiers) {
  const entryCost = Number(settings.entry_cost) || 0;
  const commissionPct = Number(settings.commission_pct) || 0;
  const totalCollected = participants * entryCost;
  const commissionAmount = (totalCollected * commissionPct) / 100;
  const prizePool = totalCollected - commissionAmount;
  return {
    entry_cost: entryCost,
    commission_pct: commissionPct,
    total_collected: totalCollected,
    commission_amount: commissionAmount,
    prize_pool: prizePool,
    tiers: tiers.map((t) => ({
      label: t.label,
      percentage: Number(t.percentage),
      amount: (prizePool * Number(t.percentage)) / 100,
    })),
  };
}

export const getStats = async (req, res, next) => {
  try {
    const game = await findById(req.gameId);
    const [[userRow], settings, tiers] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM users WHERE game_id = ?', [req.gameId]),
      getSettings(req.gameId),
      getPrizeTiers(req.gameId),
    ]);
    const users = userRow[0].total;
    const finance = computeFinance(users, settings, tiers);

    // Bracket Prediction games have no matches; show the maximum achievable score
    // (sum over stages of pick_count × points_per_correct + all_correct_bonus) and a
    // bracket-scored Top 5 instead. (US-64)
    if (game?.type === 'bracket_prediction') {
      const stages = await findStages(req.gameId);
      const maxPoints = stages.reduce(
        (sum, s) => sum + s.pick_count * s.points_per_correct + s.all_correct_bonus,
        0
      );
      const top5 = (await bracketLeaderboard(req.gameId)).slice(0, 5);
      return res.json({ game, users, max_points: maxPoints, top5, finance });
    }

    const [[matchRow], [predRow], top5] = await Promise.all([
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
      pool.query(
        `SELECT COUNT(*) AS total
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
         WHERE m.game_id = ?`,
        [req.gameId]
      ),
      leaderboard(req.gameId),
    ]);

    res.json({
      game,
      matches: {
        total: matchRow[0].total,
        with_result: matchRow[0].with_result,
        pending: matchRow[0].pending,
      },
      users,
      predictions: predRow[0].total,
      top5: top5.slice(0, 5),
      finance,
    });
  } catch (err) {
    next(err);
  }
};
