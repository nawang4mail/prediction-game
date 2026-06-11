import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import { getStats } from '../../controllers/admin/dashboardController.js';

const router = Router();
router.get('/', requireAuth, getStats);

export default router;
