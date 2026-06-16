import { Router } from 'express';
import participantAuth from '../middleware/participantAuth.js';
import {
  join,
  me,
  statuses,
  savePrediction,
  saveBracketPick,
  finish,
} from '../controllers/participantsController.js';

const router = Router();

router.post('/', join);
router.post('/statuses', statuses); // approval status for a device's entry tokens (US-67)
router.get('/me', participantAuth, me);
router.put('/me/predictions', participantAuth, savePrediction);
router.put('/me/bracket', participantAuth, saveBracketPick);
router.post('/me/finish', participantAuth, finish);

export default router;
