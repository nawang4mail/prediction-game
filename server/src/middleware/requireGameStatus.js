import { findById } from '../models/gameModel.js';

// Loads the scoped game (req.gameId, set by gameScope) and rejects the request
// when its status is not one of `allowed`. Attaches req.game for downstream use.
// Used to keep finished/locked games read-only on write endpoints.
export default function requireGameStatus(...allowed) {
  return async (req, res, next) => {
    try {
      const game = await findById(req.gameId);
      if (!game) return res.status(404).json({ message: 'Game not found' });
      req.game = game;
      if (!allowed.includes(game.status)) {
        return res.status(403).json({
          message: `This action is not allowed while the game is ${game.status}`,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
