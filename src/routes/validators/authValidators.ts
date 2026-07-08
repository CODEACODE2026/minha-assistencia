import { body } from 'express-validator';

export const registerAdminValidator = [
  body('nome').isString().trim().notEmpty().withMessage('nome e obrigatorio'),
  body('email').isEmail().withMessage('email invalido'),
  body('senha').isString().isLength({ min: 6 }).withMessage('senha deve ter no minimo 6 caracteres')
];

export const loginValidator = [
  body('email').isEmail().withMessage('email invalido'),
  body('senha').isString().notEmpty().withMessage('senha e obrigatoria')
];
