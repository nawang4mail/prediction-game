import { Router } from 'express';
import requireAuth from '../../middleware/auth.js';
import gameScope from '../../middleware/gameScope.js';
import { getStats } from '../../controllers/admin/dashboardController.js';

const router = Router();
router.get('/', requireAuth, gameScope, getStats);

export default router;
