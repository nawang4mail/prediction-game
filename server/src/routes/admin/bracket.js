import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import requireGameStatus from '../../middleware/requireGameStatus.js';
import { list, create, update, remove } from '../../controllers/admin/bracketController.js';

const router = Router();

router.use(requireAuth, gameScope);

// Stages, like fixtures (US-39), can only be edited before the game starts.
const editable = requireGameStatus('draft', 'open');

router.get('/', list);
router.post('/', editable, create);
router.put('/:id', editable, update);
router.delete('/:id', editable, remove);

export default router;
