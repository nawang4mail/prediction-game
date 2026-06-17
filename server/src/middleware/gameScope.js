import { findActive, findLatest, findLatestVisible } from '../models/gameModel.js';

// Resolves which game a request operates on: explicit ?game_id, otherwise the
// active (open/locked) game, otherwise the most recent non-draft game. Drafts
// are never auto-selected so the public side never sees an unpublished game.
//
// As a last resort, an authenticated admin (req.admin is set by requireAuth,
// which runs before this on admin routes) with no visible game at all falls back
// to the latest game including drafts — so an admin preparing the very first
// game, which is a draft (US-38/US-70), can still manage it instead of getting a
// 404. This only changes behaviour when there is no non-draft game; whenever any
// published game exists, scoping is unchanged for both admin and public.
export default async function gameScope(req, res, next) {
  try {
    const queried = Number.parseInt(req.query.game_id, 10);
    if (Number.isInteger(queried) && queried > 0) {
      req.gameId = queried;
      return next();
    }
    const game =
      (await findActive()) ??
      (await findLatestVisible()) ??
      (req.admin ? await findLatest() : null);
    if (!game) return res.status(404).json({ message: 'No games exist yet' });
    req.gameId = game.id;
    next();
  } catch (err) {
    next(err);
  }
}
