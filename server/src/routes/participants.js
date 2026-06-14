import { Router } from 'express';
import participantAuth from '../middleware/participantAuth.js';
import { join, me, savePrediction, finish } from '../controllers/participantsController.js';

const router = Router();

router.post('/', join);
router.get('/me', participantAuth, me);
router.put('/me/predictions', participantAuth, savePrediction);
router.post('/me/finish', participantAuth, finish);

export default router;
