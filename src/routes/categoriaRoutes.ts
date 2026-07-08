import { Router } from 'express';

import { CategoriaController } from '../controllers/CategoriaController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import { idParamValidator } from './validators/clienteValidators';
import { createCategoriaValidator, updateCategoriaValidator } from './validators/categoriaValidators';

const router = Router();

router.post('/', createCategoriaValidator, validateRequest, asyncHandler(CategoriaController.create));
router.get('/', asyncHandler(CategoriaController.list));
router.get('/:id', idParamValidator, validateRequest, asyncHandler(CategoriaController.findById));
router.put('/:id', idParamValidator, updateCategoriaValidator, validateRequest, asyncHandler(CategoriaController.update));
router.delete('/:id', idParamValidator, validateRequest, asyncHandler(CategoriaController.delete));

export default router;
