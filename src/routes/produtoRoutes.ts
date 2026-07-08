import { Router } from 'express';

import { ProdutoController } from '../controllers/ProdutoController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import { paginationQueryValidator } from '../utils/pagination';
import { idParamValidator } from './validators/clienteValidators';
import { createProdutoValidator, searchProdutoValidator, updateProdutoValidator } from './validators/produtoValidators';

const router = Router();

router.post('/', createProdutoValidator, validateRequest, asyncHandler(ProdutoController.create));
router.get('/', paginationQueryValidator, validateRequest, asyncHandler(ProdutoController.list));
router.get('/buscar', searchProdutoValidator, validateRequest, asyncHandler(ProdutoController.search));
router.get('/:id', idParamValidator, validateRequest, asyncHandler(ProdutoController.findById));
router.put('/:id', idParamValidator, updateProdutoValidator, validateRequest, asyncHandler(ProdutoController.update));
router.delete('/:id', idParamValidator, validateRequest, asyncHandler(ProdutoController.delete));

export default router;
