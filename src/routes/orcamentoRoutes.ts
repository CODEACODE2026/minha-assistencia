import { Router } from 'express';

import { OrcamentoController } from '../controllers/OrcamentoController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import { paginationQueryValidator } from '../utils/pagination';
import { idParamValidator } from './validators/clienteValidators';
import { createOrcamentoValidator, updateOrcamentoValidator } from './validators/orcamentoValidators';

const router = Router();

router.post('/', createOrcamentoValidator, validateRequest, asyncHandler(OrcamentoController.create));
router.get('/', paginationQueryValidator, validateRequest, asyncHandler(OrcamentoController.list));
router.get('/:id/pdf', idParamValidator, validateRequest, asyncHandler(OrcamentoController.pdf));
router.get('/:id', idParamValidator, validateRequest, asyncHandler(OrcamentoController.findById));
router.put('/:id', idParamValidator, updateOrcamentoValidator, validateRequest, asyncHandler(OrcamentoController.update));
router.delete('/:id', idParamValidator, validateRequest, asyncHandler(OrcamentoController.delete));

export default router;
