import { Router } from 'express';
import { getLeaderboard, getUserPredictions } from '../controllers/leaderboardController.js';

const router = Router();

router.get('/', getLeaderboard);
router.get('/:userId/predictions', getUserPredictions);

export default router;
