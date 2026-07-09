import { Router } from 'express';

import { PdvController } from '../controllers/PdvController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import { cancelVendaValidator, createVendaValidator, listVendasValidator, vendaIdParamValidator } from './validators/pdvValidators';

const router = Router();

router.get('/vendas', listVendasValidator, validateRequest, asyncHandler(PdvController.listVendas));
router.post('/vendas', createVendaValidator, validateRequest, asyncHandler(PdvController.createVenda));
router.post('/vendas/:id/cancelar', cancelVendaValidator, validateRequest, asyncHandler(PdvController.cancelVenda));
router.get('/vendas/:id/recibo', vendaIdParamValidator, validateRequest, asyncHandler(PdvController.reciboVenda));
router.post('/vendas/:id/recibo', vendaIdParamValidator, validateRequest, asyncHandler(PdvController.reciboVenda));
router.get('/vendas/:id', vendaIdParamValidator, validateRequest, asyncHandler(PdvController.findVenda));

export default router;
