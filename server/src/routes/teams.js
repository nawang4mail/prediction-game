import { Router } from 'express';
import * as Team from '../models/teamModel.js';

const router = Router();

// Public list of reference teams (US-114). Used by the client to render team icons
// (name → icon map) and to populate the admin team pickers.
router.get('/', async (req, res, next) => {
  try {
    res.json(await Team.findAll());
  } catch (err) {
    next(err);
  }
});

export default router;
