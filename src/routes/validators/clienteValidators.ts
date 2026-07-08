import { body, param } from 'express-validator';

export const idParamValidator = [param('id').isInt({ min: 1 }).withMessage('id invalido')];

export const createClienteValidator = [
  body('nome').isString().trim().notEmpty().withMessage('nome e obrigatorio'),
  body('telefone').isString().trim().notEmpty().withMessage('telefone e obrigatorio'),
  body('cpf').optional({ nullable: true }).isString(),
  body('endereco').optional({ nullable: true }).isString(),
  body('observacao').optional({ nullable: true }).isString()
];

export const updateClienteValidator = [
  body('nome').optional().isString().trim().notEmpty(),
  body('telefone').optional().isString().trim().notEmpty(),
  body('cpf').optional({ nullable: true }).isString(),
  body('endereco').optional({ nullable: true }).isString(),
  body('observacao').optional({ nullable: true }).isString()
];
