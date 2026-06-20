import { Router } from 'express';
import { findAll } from '../models/gameModel.js';

const router = Router();

// Public game list for the join page and the leaderboard game selector.
// Draft games are unpublished, so they are never exposed here. (US-38)
// `type` is included so the public Matches tab knows to show a bracket
// breakdown rather than a (non-existent) match list for bracket games. (US-54)
router.get('/', async (req, res, next) => {
  try {
    const games = await findAll();
    res.json(
      games
        .filter((g) => g.status !== 'draft')
        .map(({ id, name, status, type, created_at, participant_count }) => ({ id, name, status, type, created_at, participant_count: Number(participant_count) }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
