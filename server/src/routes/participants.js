import { Router } from 'express';
import participantAuth from '../middleware/participantAuth.js';
import {
  join,
  me,
  savePrediction,
  saveBracketPick,
  finish,
} from '../controllers/participantsController.js';

const router = Router();

router.post('/', join);
router.get('/me', participantAuth, me);
router.put('/me/predictions', participantAuth, savePrediction);
router.put('/me/bracket', participantAuth, saveBracketPick);
router.post('/me/finish', participantAuth, finish);

export default router;
