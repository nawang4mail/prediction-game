import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import {
  list,
  create,
  updateStatus,
  updateType,
  remove,
} from '../../controllers/admin/gamesController.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', create);
router.put('/:id/status', updateStatus);
router.put('/:id/type', updateType);
router.delete('/:id', remove);

export default router;
