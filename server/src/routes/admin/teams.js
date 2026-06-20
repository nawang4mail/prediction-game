import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import { list, create, update, remove } from '../../controllers/admin/teamsController.js';

const router = Router();

// Teams are global (not game-scoped), like /api/admin/games.
router.use(requireAuth);

router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
