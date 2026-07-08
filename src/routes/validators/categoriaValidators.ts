import { body } from 'express-validator';

export const createCategoriaValidator = [
  body('nome').isString().trim().notEmpty().withMessage('nome e obrigatorio'),
  body('descricao').optional({ nullable: true }).isString(),
  body('ativo').optional().isBoolean().withMessage('ativo invalido')
];

export const updateCategoriaValidator = [
  body('nome').optional().isString().trim().notEmpty(),
  body('descricao').optional({ nullable: true }).isString(),
  body('ativo').optional().isBoolean().withMessage('ativo invalido')
];
