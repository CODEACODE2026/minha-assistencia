import { body } from 'express-validator';

export const createOrcamentoValidator = [
  body('cliente_id').isInt({ min: 1 }).withMessage('cliente_id invalido'),
  body('aparelho').isString().trim().notEmpty().withMessage('aparelho e obrigatorio'),
  body('defeito_relatado').isString().trim().notEmpty().withMessage('defeito_relatado e obrigatorio'),
  body('servico').isString().trim().notEmpty().withMessage('servico e obrigatorio'),
  body('pecas_usadas').optional({ nullable: true }).isArray().withMessage('pecas_usadas deve ser uma lista'),
  body('valor_pecas').optional().isFloat({ min: 0 }),
  body('valor_mao_obra').optional().isFloat({ min: 0 }),
  body('desconto').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['aberto', 'aprovado', 'recusado', 'finalizado']),
  body('observacao').optional({ nullable: true }).isString()
];

export const updateOrcamentoValidator = [
  body('cliente_id').optional().isInt({ min: 1 }),
  body('aparelho').optional().isString().trim().notEmpty(),
  body('defeito_relatado').optional().isString().trim().notEmpty(),
  body('servico').optional().isString().trim().notEmpty(),
  body('pecas_usadas').optional({ nullable: true }).isArray(),
  body('valor_pecas').optional().isFloat({ min: 0 }),
  body('valor_mao_obra').optional().isFloat({ min: 0 }),
  body('desconto').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['aberto', 'aprovado', 'recusado', 'finalizado']),
  body('observacao').optional({ nullable: true }).isString()
];
