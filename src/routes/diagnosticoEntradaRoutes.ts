import { Router } from 'express';

import { DiagnosticoEntradaController } from '../controllers/DiagnosticoEntradaController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';
import {
  addFotosDiagnosticoEntradaValidator,
  createDiagnosticoEntradaValidator,
  deleteFotoDiagnosticoEntradaValidator,
  idDiagnosticoEntradaValidator,
  listDiagnosticoEntradaValidator,
  updateDiagnosticoEntradaValidator
} from './validators/diagnosticoEntradaValidators';

const router = Router();

router.post('/', createDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.create));
router.get('/', listDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.list));
router.get('/:id', idDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.findById));
router.put('/:id', updateDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.update));
router.delete('/:id', idDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.delete));
router.post('/:id/fotos', addFotosDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.addPhotos));
router.delete('/:id/fotos/:fotoId', deleteFotoDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.deletePhoto));
router.post('/:id/pdf', idDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.pdf));
router.get('/:id/pdf', idDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.pdf));
router.post('/:id/finalizar', idDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.finish));
router.post('/:id/cancelar', idDiagnosticoEntradaValidator, validateRequest, asyncHandler(DiagnosticoEntradaController.cancel));

export default router;
