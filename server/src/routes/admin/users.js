import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import { list, create, update, remove } from '../../controllers/admin/usersController.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
