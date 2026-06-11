import { leaderboard, findByUser } from '../models/predictionModel.js';

export const getLeaderboard = async (req, res, next) => {
  try {
    res.json(await leaderboard());
  } catch (err) {
    next(err);
  }
};

export const getUserPredictions = async (req, res, next) => {
  try {
    res.json(await findByUser(req.params.userId));
  } catch (err) {
    next(err);
  }
};
