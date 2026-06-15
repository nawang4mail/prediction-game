import { Router } from 'express';
import gameScope from '../middleware/gameScope.js';
import { breakdown } from '../models/bracketStageModel.js';

const router = Router();

// Public per-stage breakdown for a Bracket Prediction game (US-49).
router.get('/', gameScope, async (req, res, next) => {
  try {
    res.json(await breakdown(req.gameId));
  } catch (err) {
    next(err);
  }
});

export default router;
