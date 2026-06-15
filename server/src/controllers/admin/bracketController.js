import * as Stage from '../../models/bracketStageModel.js';

// Validates and normalises a stage payload. Returns { error } or { value }.
const parseStage = (body) => {
  const name = (body.name ?? '').trim();
  if (!name) return { error: 'Stage name is required' };

  const teams = (body.teams ?? []).map((t) => String(t).trim()).filter(Boolean);
  if (teams.length < 2) return { error: 'A stage needs at least 2 teams' };
  if (new Set(teams.map((t) => t.toLowerCase())).size !== teams.length) {
    return { error: 'Team names must be unique within a stage' };
  }

  const pick_count = Number(body.pick_count);
  if (!Number.isInteger(pick_count) || pick_count < 1 || pick_count > teams.length) {
    return { error: 'Pick count must be between 1 and the number of teams' };
  }

  const points_per_correct = Number(body.points_per_correct);
  if (!Number.isInteger(points_per_correct) || points_per_correct < 1) {
    return { error: 'Points per correct must be at least 1' };
  }

  const all_correct_bonus = Number(body.all_correct_bonus ?? 0);
  if (!Number.isInteger(all_correct_bonus) || all_correct_bonus < 0) {
    return { error: 'All-correct bonus must be 0 or more' };
  }

  return { value: { name, teams, pick_count, points_per_correct, all_correct_bonus } };
};

export const list = async (req, res, next) => {
  try {
    res.json(await Stage.findByGame(req.gameId));
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    if (req.game.type !== 'bracket_prediction') {
      return res.status(400).json({ message: 'This game is not a Bracket Prediction game' });
    }
    const { error, value } = parseStage(req.body);
    if (error) return res.status(400).json({ message: error });
    const id = await Stage.create({ game_id: req.gameId, ...value });
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const stage = await Stage.findById(req.params.id);
    if (!stage || stage.game_id !== req.gameId) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    const { error, value } = parseStage(req.body);
    if (error) return res.status(400).json({ message: error });
    await Stage.update(stage.id, value);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const stage = await Stage.findById(req.params.id);
    if (!stage || stage.game_id !== req.gameId) {
      return res.status(404).json({ message: 'Stage not found' });
    }
    await Stage.remove(stage.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
