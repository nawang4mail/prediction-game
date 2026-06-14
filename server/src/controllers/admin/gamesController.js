import * as Game from '../../models/gameModel.js';

const TRANSITIONS = {
  draft: ['open'],
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

// A new game is created as a draft. Drafts can be prepared at any time, even
// while another game is open or locked — they only become the active game when
// the admin opens them. (US-38)
export const create = async (req, res, next) => {
  try {
    const name = (req.body.name ?? '').trim();
    if (!name) return res.status(400).json({ message: 'Game name is required' });
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
    // Multiple games may be open or locked at the same time. (US-42)
    await Game.updateStatus(game.id, status);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};

// Only an unpublished draft can be deleted; live and archived games keep their
// history. (US-38)
export const remove = async (req, res, next) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    if (game.status !== 'draft') {
      return res.status(409).json({ message: 'Only draft games can be deleted' });
    }
    await Game.remove(game.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
