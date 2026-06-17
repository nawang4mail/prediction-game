import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import requireGameStatus from '../../middleware/requireGameStatus.js';
import { list, upsert, remove } from '../../controllers/admin/predictionsController.js';

const router = Router();

router.use(requireAuth, gameScope);

// A user's predictions can only be edited before the game starts (draft/open);
// once it is locked (started) or finished they are read-only. (US-37, US-63)
const editable = requireGameStatus('draft', 'open');

router.get('/', list);
router.post('/', editable, upsert);
router.delete('/:userId/:matchId', editable, remove);

export default router;
