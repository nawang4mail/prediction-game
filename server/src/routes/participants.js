import { Router } from 'express';
import participantAuth from '../middleware/participantAuth.js';
import { join, me, savePrediction } from '../controllers/participantsController.js';

const router = Router();

router.post('/', join);
router.get('/me', participantAuth, me);
router.put('/me/predictions', participantAuth, savePrediction);

export default router;
