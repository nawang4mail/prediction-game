import { Router } from 'express';
import participantAuth from '../middleware/participantAuth.js';
import {
  join,
  me,
  statuses,
  savePrediction,
  saveBracketPick,
  deleteMe,
  finish,
  publicPicks,
  complete,
} from '../controllers/participantsController.js';

const router = Router();

router.post('/', join);
router.post('/complete', complete); // atomic join: create entry + all picks in one go (US-99)
router.post('/statuses', statuses); // approval status for a device's entry tokens (US-67)
router.get('/me', participantAuth, me);
router.put('/me/predictions', participantAuth, savePrediction);
router.put('/me/bracket', participantAuth, saveBracketPick);
router.delete('/me', participantAuth, deleteMe); // remove a cancelled, incomplete entry (US-68)
router.post('/me/finish', participantAuth, finish);
router.get('/:id/picks', publicPicks); // public view of a participant's picks (US-97)

export default router;
