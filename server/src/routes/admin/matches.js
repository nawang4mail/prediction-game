import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import { list, create, update, remove } from '../../controllers/admin/matchesController.js';

const router = Router();

router.use(requireAuth, gameScope);

router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
