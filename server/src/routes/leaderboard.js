import { Router } from 'express';
import gameScope from '../middleware/gameScope.js';
import { getLeaderboard, getUserPredictions } from '../controllers/leaderboardController.js';

const router = Router();

router.get('/', gameScope, getLeaderboard);
router.get('/:userId/predictions', getUserPredictions);

export default router;
