import { body, param, query } from 'express-validator';

import { paginationQueryValidator } from '../../utils/pagination';

export const listVendasValidator = [
  query('status').optional().isIn(['todos', 'concluida', 'cancelada']).withMessage('status invalido'),
  query('inicio').optional().isISO8601().withMessage('inicio invalido'),
  query('fim').optional().isISO8601().withMessage('fim invalido'),
  query('cliente_id').optional().isInt({ min: 1 }).withMessage('cliente_id invalido'),
  query('termo').optional().isString().trim().isLength({ max: 120 }).withMessage('termo invalido'),
  ...paginationQueryValidator
];

export const createVendaValidator = [
  body('cliente_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('cliente_id invalido'),
  body('forma_pagamento').isIn(['pix', 'credito', 'debito', 'dinheiro', 'outro']).withMessage('forma_pagamento invalida'),
  body('desconto').optional().isFloat({ min: 0 }).withMessage('desconto invalido'),
  body('observacao').optional({ nullable: true }).isString().withMessage('observacao invalida'),
  body('itens').isArray({ min: 1 }).withMessage('itens deve conter ao menos um produto'),
  body('itens.*.produto_id').isInt({ min: 1 }).withMessage('produto_id invalido'),
  body('itens.*.quantidade').isInt({ min: 1 }).withMessage('quantidade invalida')
];

export const vendaIdParamValidator = [param('id').isInt({ min: 1 }).withMessage('id invalido')];

export const cancelVendaValidator = [
  ...vendaIdParamValidator,
  body('motivo').optional({ nullable: true }).isString().trim().isLength({ max: 500 }).withMessage('motivo invalido')
];
