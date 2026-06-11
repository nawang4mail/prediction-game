import { leaderboard } from '../models/predictionModel.js';

export const getLeaderboard = async (req, res, next) => {
  try {
    const rows = await leaderboard();
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
