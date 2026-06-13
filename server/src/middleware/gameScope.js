import { findActive, findLatest } from '../models/gameModel.js';

// Resolves which game a request operates on: explicit ?game_id, otherwise the
// active (open/locked) game, otherwise the most recent game.
export default async function gameScope(req, res, next) {
  try {
    const queried = Number.parseInt(req.query.game_id, 10);
    if (Number.isInteger(queried) && queried > 0) {
      req.gameId = queried;
      return next();
    }
    const game = (await findActive()) ?? (await findLatest());
    if (!game) return res.status(404).json({ message: 'No games exist yet' });
    req.gameId = game.id;
    next();
  } catch (err) {
    next(err);
  }
}
