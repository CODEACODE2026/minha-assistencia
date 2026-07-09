import { Router } from 'express';

import { DashboardController } from '../controllers/DashboardController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(DashboardController.summary));

export default router;
