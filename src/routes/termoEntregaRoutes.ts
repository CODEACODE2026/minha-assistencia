import { Router } from 'express';

import { TermoEntregaController } from '../controllers/TermoEntregaController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import {
  addFotosTermoEntregaValidator,
  createTermoEntregaValidator,
  deleteFotoTermoEntregaValidator,
  idTermoEntregaValidator,
  listTermoEntregaValidator,
  updateTermoEntregaValidator
} from './validators/termoEntregaValidators';

const router = Router();

router.post('/', createTermoEntregaValidator, validateRequest, asyncHandler(TermoEntregaController.create));
router.get('/', listTermoEntregaValidator, validateRequest, asyncHandler(TermoEntregaController.list));
router.post('/:id/pdf', idTermoEntregaValidator, validateRequest, asyncHandler(TermoEntregaController.pdf));
router.get('/:id/pdf', idTermoEntregaValidator, validateRequest, asyncHandler(TermoEntregaController.pdf));
router.get('/:id', idTermoEntregaValidator, validateRequest, asyncHandler(TermoEntregaController.findById));
router.put('/:id', updateTermoEntregaValidator, validateRequest, asyncHandler(TermoEntregaController.update));
router.delete('/:id', idTermoEntregaValidator, validateRequest, asyncHandler(TermoEntregaController.delete));
router.post('/:id/fotos', addFotosTermoEntregaValidator, validateRequest, asyncHandler(TermoEntregaController.addPhotos));
router.delete('/:id/fotos/:fotoId', deleteFotoTermoEntregaValidator, validateRequest, asyncHandler(TermoEntregaController.deletePhoto));

export default router;
