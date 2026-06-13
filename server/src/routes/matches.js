import { Router } from 'express';
import gameScope from '../middleware/gameScope.js';
import { findAllWithPredictionCounts } from '../models/matchModel.js';

const router = Router();

// Public match list with per-option prediction counts (US-33).
router.get('/', gameScope, async (req, res, next) => {
  try {
    res.json(await findAllWithPredictionCounts(req.gameId));
  } catch (err) {
    next(err);
  }
});

export default router;
