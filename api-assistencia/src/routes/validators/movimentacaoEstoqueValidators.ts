import { body, query } from 'express-validator';

export const listMovimentacaoEstoqueValidator = [
  query('produto_id').optional().isInt({ min: 1 }).withMessage('produto_id invalido'),
  query('orcamento_id').optional().isInt({ min: 1 }).withMessage('orcamento_id invalido')
];

export const createMovimentacaoEstoqueValidator = [
  body('produto_id').isInt({ min: 1 }).withMessage('produto_id obrigatorio'),
  body('tipo').isIn(['entrada', 'ajuste_manual']).withMessage('tipo deve ser entrada ou ajuste_manual'),
  body('quantidade').isInt({ min: 1 }).withMessage('quantidade deve ser maior que zero'),
  body('observacao').optional({ nullable: true }).isString().withMessage('observacao invalida')
];
