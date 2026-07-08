import { Router } from 'express';

import { SimuladorCompraController } from '../controllers/SimuladorCompraController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import { createSimuladorCompraValidator, deleteSimuladorCompraValidator, updateSimuladorCompraValidator } from './validators/simuladorCompraValidators';

const router = Router();

router.post('/', createSimuladorCompraValidator, validateRequest, asyncHandler(SimuladorCompraController.create));
router.get('/', asyncHandler(SimuladorCompraController.list));
router.put('/:id', updateSimuladorCompraValidator, validateRequest, asyncHandler(SimuladorCompraController.update));
router.delete('/:id', deleteSimuladorCompraValidator, validateRequest, asyncHandler(SimuladorCompraController.delete));

export default router;
