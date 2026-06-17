import * as Game from '../../models/gameModel.js';

const TRANSITIONS = {
  draft: ['open'],
  open: ['locked'],
  locked: ['open', 'finished'],
  finished: [],
};

const GAME_TYPES = ['guess_winners', 'bracket_prediction'];

export const list = async (req, res, next) => {
  try {
    res.json(await Game.findAll());
  } catch (err) {
    next(err);
  }
};

// A new game is created as a draft. Drafts can be prepared at any time, even
// while another game is open or locked — they only become the active game when
// the admin opens them. (US-38)
export const create = async (req, res, next) => {
  try {
    const name = (req.body.name ?? '').trim();
    if (!name) return res.status(400).json({ message: 'Game name is required' });
    const type = req.body.type ?? 'guess_winners';
    if (!GAME_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Invalid game type' });
    }
    const id = await Game.create({ name, type });
    res.status(201).json({ id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A game with that name already exists' });
    }
    next(err);
  }
};

// The game type is fixed once the game leaves draft, so changing it is only
// allowed while the game is still a draft. (US-45)
export const updateType = async (req, res, next) => {
  try {
    const { type } = req.body;
    if (!GAME_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Invalid game type' });
    }
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    if (game.status !== 'draft') {
      return res
        .status(409)
        .json({ message: 'Game type can only be changed while the game is a draft' });
    }
    await Game.updateType(game.id, type);
    res.json({ message: 'Updated' });
  } catch (err) {
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
    // Multiple games may be open or locked at the same time. (US-42)
    await Game.updateStatus(game.id, status);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};

// An unpublished draft or an archived finished game can be deleted; a live game
// (open/locked) cannot, so an in-progress game's data is never lost. (US-38, US-60)
const DELETABLE = ['draft', 'finished'];

export const remove = async (req, res, next) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    if (!DELETABLE.includes(game.status)) {
      return res.status(409).json({ message: 'Only draft or finished games can be deleted' });
    }
    await Game.remove(game.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// Delete several games at once. All selected games must be draft or finished;
// the whole request is rejected if any is live, so nothing is partially deleted. (US-61)
export const bulkRemove = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids)
      ? [...new Set(req.body.ids.map(Number).filter(Number.isInteger))]
      : [];
    if (!ids.length) return res.status(400).json({ message: 'No games selected' });

    const found = await Game.findByIds(ids);
    if (found.length !== ids.length) {
      return res.status(404).json({ message: 'Some selected games no longer exist' });
    }
    if (found.some((g) => !DELETABLE.includes(g.status))) {
      return res.status(409).json({ message: 'Only draft or finished games can be deleted' });
    }
    const deleted = await Game.removeMany(ids);
    res.json({ deleted });
  } catch (err) {
    next(err);
  }
};
