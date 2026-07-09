import { Router } from 'express';

import { AuthController } from '../controllers/AuthController';
import { adminSetupMiddleware } from '../middlewares/adminSetupMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminSetupRateLimit, loginRateLimit } from '../middlewares/loginRateLimit';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import { loginValidator, registerAdminValidator } from './validators/authValidators';

const router = Router();

router.post('/admin', adminSetupRateLimit, adminSetupMiddleware, registerAdminValidator, validateRequest, asyncHandler(AuthController.registerAdmin));
router.post('/login', loginRateLimit, loginValidator, validateRequest, asyncHandler(AuthController.login));
router.get('/me', asyncHandler(authMiddleware), AuthController.me);

export default router;
