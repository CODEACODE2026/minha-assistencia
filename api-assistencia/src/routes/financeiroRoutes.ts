import { Router } from 'express';
import { query } from 'express-validator';

import { FinanceiroController } from '../controllers/FinanceiroController';
import { validateRequest } from '../middlewares/validateRequest';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const summaryValidators = [
  query('periodo').optional().isIn(['mes_atual', 'ultimos_30_dias', 'ano_atual', 'todos']).withMessage('periodo invalido'),
  query('origem').optional().isIn(['todos', 'os', 'pdv']).withMessage('origem invalida'),
  query('inicio').optional().isISO8601().withMessage('inicio invalido'),
  query('fim').optional().isISO8601().withMessage('fim invalido')
];

router.get('/', summaryValidators, validateRequest, asyncHandler(FinanceiroController.summary));

export default router;
