import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import requireGameStatus from '../../middleware/requireGameStatus.js';
import { list, create, update, setStatus, remove, bulkCreate, bulkCreateWithPredictions } from '../../controllers/admin/usersController.js';

const router = Router();

router.use(requireAuth, gameScope);

// The participant list is read-only once a game is finished. (US-40)
const editable = requireGameStatus('draft', 'open', 'locked');

router.get('/', list);
router.post('/bulk', editable, bulkCreate);
router.post('/bulk-with-predictions', editable, bulkCreateWithPredictions);
router.post('/', editable, create);
router.put('/:id', editable, update);
router.put('/:id/status', editable, setStatus);
router.delete('/:id', editable, remove);

export default router;
