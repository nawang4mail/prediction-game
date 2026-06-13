import { Router } from 'express';
import { findAll } from '../models/gameModel.js';

const router = Router();

// Public game list for the join page and the leaderboard game selector.
router.get('/', async (req, res, next) => {
  try {
    const games = await findAll();
    res.json(games.map(({ id, name, status, created_at }) => ({ id, name, status, created_at })));
  } catch (err) {
    next(err);
  }
});

export default router;
