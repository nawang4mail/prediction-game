import * as Prediction from '../../models/predictionModel.js';
import * as User from '../../models/userModel.js';
import * as Match from '../../models/matchModel.js';

// Returns the prediction grid for the admin view: every entry in the game, every
// match, and a nested map of each entry's picks. The client renders this as a
// rows=players × cols=matches grid. (US-87)
export const list = async (req, res, next) => {
  try {
    const [users, matches, predRows] = await Promise.all([
      User.findAll(req.gameId),
      Match.findAll(req.gameId),
      Prediction.findAll(req.gameId),
    ]);

    const predictions = {};
    for (const r of predRows) {
      (predictions[r.user_id] ??= {})[r.match_id] = r.prediction;
    }

    res.json({
      users: users.map((u) => ({
        id: u.id,
        display_name: u.display_name,
        status: u.status,
      })),
      matches: matches.map((m) => ({
        id: m.id,
        team_a: m.team_a,
        team_b: m.team_b,
        label: m.label,
        result: m.result,
      })),
      predictions,
    });
  } catch (err) {
    next(err);
  }
};

export const upsert = async (req, res, next) => {
  try {
    await Prediction.upsert(req.body);
    res.json({ message: 'Saved' });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await Prediction.remove({ user_id: req.params.userId, match_id: req.params.matchId });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
