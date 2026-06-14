import * as Match from '../../models/matchModel.js';

const RESULTS = ['team_a', 'team_b', 'draw'];

export const list = async (req, res, next) => {
  try {
    res.json(await Match.findAll(req.gameId));
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const id = await Match.create({ ...req.body, game_id: req.gameId });
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const affected = await Match.update(req.params.id, req.body);
    if (!affected) return res.status(404).json({ message: 'Match not found' });
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const affected = await Match.remove(req.params.id);
    if (!affected) return res.status(404).json({ message: 'Match not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// Recording a result is allowed after the game has started (open/locked) even
// though fixtures themselves are locked. (US-39)
export const setResult = async (req, res, next) => {
  try {
    const { result } = req.body;
    if (result !== null && !RESULTS.includes(result)) {
      return res.status(400).json({ message: 'Invalid result' });
    }
    const affected = await Match.update(req.params.id, { result });
    if (!affected) return res.status(404).json({ message: 'Match not found' });
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};
