import * as Match from '../../models/matchModel.js';
import * as Team from '../../models/teamModel.js';

const RESULTS = ['team_a', 'team_b', 'draw'];

// Teams must exist in the reference table (US-114). Only validates the team fields
// present in the body, so result-only updates are unaffected.
const teamError = async (body) => {
  const names = [];
  if (body.team_a != null) names.push(body.team_a);
  if (body.team_b != null) names.push(body.team_b);
  if (!names.length) return null;
  const missing = await Team.findMissing(names);
  if (missing.length) {
    return `Unknown team(s): ${missing.join(', ')}. Add them on the Teams page first.`;
  }
  return null;
};

export const list = async (req, res, next) => {
  try {
    res.json(await Match.findAll(req.gameId));
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const err = await teamError(req.body);
    if (err) return res.status(400).json({ message: err });
    const id = await Match.create({ ...req.body, game_id: req.gameId });
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const err = await teamError(req.body);
    if (err) return res.status(400).json({ message: err });
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
