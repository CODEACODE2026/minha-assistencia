import { Router } from 'express';

import { WhatsAppController } from '../controllers/WhatsAppController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import { sendWhatsAppValidator } from './validators/whatsappValidators';

const router = Router();

router.post('/enviar', sendWhatsAppValidator, validateRequest, asyncHandler(WhatsAppController.send));
router.post('/webhook', asyncHandler(WhatsAppController.webhook));

export default router;
