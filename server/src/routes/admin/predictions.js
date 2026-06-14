import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import requireGameStatus from '../../middleware/requireGameStatus.js';
import { list, upsert, remove } from '../../controllers/admin/predictionsController.js';

const router = Router();

router.use(requireAuth, gameScope);

// Predictions are read-only once a game is finished (US-37); editing is still
// allowed while a game is being set up or is in progress.
const editable = requireGameStatus('draft', 'open', 'locked');

router.get('/', list);
router.post('/', editable, upsert);
router.delete('/:userId/:matchId', editable, remove);

export default router;
