import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import { list, create, update, remove, bulkCreate, bulkCreateWithPredictions } from '../../controllers/admin/usersController.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/bulk', bulkCreate);
router.post('/bulk-with-predictions', bulkCreateWithPredictions);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
