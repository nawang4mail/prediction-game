import { Router } from 'express';
import { getAll } from '../models/settingsModel.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await getAll());
  } catch (err) {
    next(err);
  }
});

export default router;
