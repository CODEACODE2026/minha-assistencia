import { Router } from 'express';

import { MovimentacaoEstoqueController } from '../controllers/MovimentacaoEstoqueController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import { createMovimentacaoEstoqueValidator, listMovimentacaoEstoqueValidator } from './validators/movimentacaoEstoqueValidators';

const router = Router();

router.get('/movimentacoes', listMovimentacaoEstoqueValidator, validateRequest, asyncHandler(MovimentacaoEstoqueController.list));
router.post('/movimentacoes', createMovimentacaoEstoqueValidator, validateRequest, asyncHandler(MovimentacaoEstoqueController.create));

export default router;
