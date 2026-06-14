import { Router } from 'express';
import gameScope from '../middleware/gameScope.js';
import { getAll } from '../models/settingsModel.js';

const router = Router();

router.get('/', gameScope, async (req, res, next) => {
  try {
    res.json(await getAll(req.gameId));
  } catch (err) {
    next(err);
  }
});

export default router;
