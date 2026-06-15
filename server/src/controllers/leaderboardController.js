import { leaderboard, findByUser } from '../models/predictionModel.js';
import { leaderboard as bracketLeaderboard, findByGame as findStages } from '../models/bracketStageModel.js';
import { findByUser as findUserSelections } from '../models/stageSelectionModel.js';
import { findById as findGame } from '../models/gameModel.js';
import { findById as findUser } from '../models/userModel.js';

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
    const user = await findUser(req.params.userId);
    if (!user) return res.json([]);
    const game = await findGame(user.game_id);

    if (game?.type === 'bracket_prediction') {
      // Results are public once the admin sets them (US-47) — the leaderboard total
      // and the crowd breakdown already reflect them — so reveal correctness here as
      // soon as it exists, not only when the game is finished. Before any results are
      // set, is_winner is all 0, so nothing leaks.
      const stages = await findStages(game.id);
      const picked = new Set((await findUserSelections(user.id)).map((s) => s.stage_team_id));
      const detail = stages.map((s) => {
        const myPicks = s.teams.filter((t) => picked.has(t.id));
        const correct = myPicks.filter((t) => t.is_winner).length;
        // The all-correct bonus applies when every one of the player's picks won.
        const allCorrect = myPicks.length === s.pick_count && correct === s.pick_count;
        return {
          id: s.id,
          name: s.name,
          pick_count: s.pick_count,
          points_per_correct: s.points_per_correct,
          all_correct_bonus: s.all_correct_bonus,
          all_correct: allCorrect,
          teams: myPicks.map((t) => ({ id: t.id, name: t.name, is_winner: t.is_winner })),
        };
      });
      return res.json({ bracket: true, stages: detail });
    }

    res.json(await findByUser(req.params.userId));
  } catch (err) {
    next(err);
  }
};
