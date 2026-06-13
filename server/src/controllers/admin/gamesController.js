import * as Game from '../../models/gameModel.js';

const TRANSITIONS = {
  open: ['locked'],
  locked: ['open', 'finished'],
  finished: [],
};

export const list = async (req, res, next) => {
  try {
    res.json(await Game.findAll());
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const name = (req.body.name ?? '').trim();
    if (!name) return res.status(400).json({ message: 'Game name is required' });
    const active = await Game.findActive();
    if (active) {
      return res.status(409).json({
        message: `Finish "${active.name}" before creating a new game`,
      });
    }
    const id = await Game.create({ name });
    res.status(201).json({ id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A game with that name already exists' });
    }
    next(err);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    if (!TRANSITIONS[game.status].includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${game.status} to ${status}`,
      });
    }
    await Game.updateStatus(game.id, status);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};
