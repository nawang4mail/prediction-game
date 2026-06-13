import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import { list, upsert, remove } from '../../controllers/admin/predictionsController.js';

const router = Router();

router.use(requireAuth, gameScope);

router.get('/', list);
router.post('/', upsert);
router.delete('/:userId/:matchId', remove);

export default router;
