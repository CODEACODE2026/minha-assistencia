import { body } from 'express-validator';

export const sendWhatsAppValidator = [
  body('telefone').isString().trim().notEmpty().withMessage('telefone e obrigatorio'),
  body('mensagem').isString().trim().notEmpty().withMessage('mensagem e obrigatoria')
];
