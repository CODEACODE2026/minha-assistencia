import { body, param } from 'express-validator';

export const createSimuladorCompraValidator = [
  body('modelo_aparelho').isString().trim().notEmpty().withMessage('modelo_aparelho e obrigatorio'),
  body('valor_compra').isFloat({ min: 0 }).withMessage('valor_compra invalido'),
  body('valor_frete').optional().isFloat({ min: 0 }),
  body('pecas_necessarias').optional({ nullable: true }).isArray(),
  body('valor_total_pecas').optional().isFloat({ min: 0 }),
  body('outros_custos').optional().isFloat({ min: 0 }),
  body('margem_lucro_percentual').isFloat({ min: 0 }).withMessage('margem_lucro_percentual invalida'),
  body('valor_venda_estimado').isFloat({ min: 0 }).withMessage('valor_venda_estimado invalido')
];

export const updateSimuladorCompraValidator = [
  param('id').isInt({ min: 1 }).withMessage('id invalido'),
  ...createSimuladorCompraValidator
];

export const deleteSimuladorCompraValidator = [param('id').isInt({ min: 1 }).withMessage('id invalido')];
