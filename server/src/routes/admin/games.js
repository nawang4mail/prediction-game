import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import { list, create, updateStatus } from '../../controllers/admin/gamesController.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', create);
router.put('/:id/status', updateStatus);

export default router;
