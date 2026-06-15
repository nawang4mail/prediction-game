import { leaderboard, findByUser } from '../models/predictionModel.js';
import { leaderboard as bracketLeaderboard } from '../models/bracketStageModel.js';
import { findById as findGame } from '../models/gameModel.js';

export const getLeaderboard = async (req, res, next) => {
  try {
    const game = await findGame(req.gameId);
    const rows =
      game?.type === 'bracket_prediction'
        ? await bracketLeaderboard(req.gameId)
        : await leaderboard(req.gameId);
    res.json(rows);
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
