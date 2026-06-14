import { randomUUID } from 'crypto';
import * as User from '../models/userModel.js';
import * as Game from '../models/gameModel.js';
import * as Match from '../models/matchModel.js';
import { getAll as getSettings } from '../models/settingsModel.js';
import { upsert, remove, findByUser } from '../models/predictionModel.js';

const PREDICTIONS = ['team_a', 'team_b', 'draw'];
const DEFAULT_FINISH_MESSAGE = 'Game set — your predictions are saved. Good luck!';

export const join = async (req, res, next) => {
  try {
    const display_name = (req.body.display_name ?? '').trim();
    if (!display_name) return res.status(400).json({ message: 'Display name is required' });

    // A specific game can be chosen (several may be open at once); otherwise
    // fall back to the most recently opened game. (US-42)
    const game = req.body.game_id
      ? await Game.findById(req.body.game_id)
      : await Game.findActive();
    if (!game || game.status !== 'open') {
      return res.status(403).json({ message: 'That game is not open for joining right now' });
    }

    const entry_token = randomUUID();
    const result = await User.createWithAutoSuffix({
      game_id: game.id,
      display_name,
      phone: req.body.phone,
      entry_token,
    });
    res.status(201).json({ ...result, entry_token, game: { id: game.id, name: game.name } });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    res.json({
      participant: { id: req.participant.id, display_name: req.participant.display_name },
      game: { id: req.game.id, name: req.game.name, status: req.game.status },
      predictions: await findByUser(req.participant.id),
    });
  } catch (err) {
    next(err);
  }
};

export const savePrediction = async (req, res, next) => {
  try {
    if (req.game.status !== 'open') {
      return res.status(403).json({ message: 'The game has started — predictions are locked' });
    }

    const { match_id, prediction } = req.body;
    const match = await Match.findById(match_id);
    if (!match || match.game_id !== req.participant.game_id) {
      return res.status(404).json({ message: 'Match not found in your game' });
    }

    if (!prediction) {
      await remove({ user_id: req.participant.id, match_id });
      return res.json({ message: 'Cleared' });
    }
    if (!PREDICTIONS.includes(prediction)) {
      return res.status(400).json({ message: 'Invalid prediction' });
    }
    await upsert({ user_id: req.participant.id, match_id, prediction });
    res.json({ message: 'Saved' });
  } catch (err) {
    next(err);
  }
};

// Confirms a participant has finished entering predictions and returns the
// admin-configured confirmation message (or a sensible default). Predictions
// already save as they are picked, so this is a confirmation, not a lock. (US-35)
export const finish = async (req, res, next) => {
  try {
    if (req.game.status !== 'open') {
      return res.status(403).json({ message: 'The game has started — predictions are locked' });
    }
    const settings = await getSettings(req.game.id);
    const message = settings.finish_message?.trim() || DEFAULT_FINISH_MESSAGE;
    res.json({ message });
  } catch (err) {
    next(err);
  }
};
