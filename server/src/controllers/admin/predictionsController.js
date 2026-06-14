import * as Prediction from '../../models/predictionModel.js';

export const list = async (req, res, next) => {
  try {
    res.json(await Prediction.findAll(req.gameId));
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
