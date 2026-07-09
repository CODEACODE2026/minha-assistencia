import { Router } from 'express';

import { ClienteController } from '../controllers/ClienteController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import { paginationQueryValidator } from '../utils/pagination';
import { createClienteValidator, idParamValidator, updateClienteValidator } from './validators/clienteValidators';

const router = Router();

router.post('/', createClienteValidator, validateRequest, asyncHandler(ClienteController.create));
router.get('/', paginationQueryValidator, validateRequest, asyncHandler(ClienteController.list));
router.get('/:id', idParamValidator, validateRequest, asyncHandler(ClienteController.findById));
router.put('/:id', idParamValidator, updateClienteValidator, validateRequest, asyncHandler(ClienteController.update));
router.delete('/:id', idParamValidator, validateRequest, asyncHandler(ClienteController.delete));

export default router;
