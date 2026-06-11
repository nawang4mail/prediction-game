import { Router } from 'express';
import { login } from '../../controllers/admin/authController.js';

const router = Router();

router.post('/login', login);

export default router;
