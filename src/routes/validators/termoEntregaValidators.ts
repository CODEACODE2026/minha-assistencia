import { body, param, query } from 'express-validator';

const testeStatus = ['aprovado', 'reprovado', 'nao_testado'];
const fotoTipo = ['frente', 'verso', 'lateral', 'servico_realizado', 'outra'];

function testesValidator(field: string) {
  return body(field)
    .optional({ nullable: true })
    .custom((value) => {
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${field} invalido`);
      }
      for (const item of Object.values(value as Record<string, { status?: string }>)) {
        if (!item || !testeStatus.includes(item.status ?? '')) {
          throw new Error(`${field} possui status invalido`);
        }
      }
      return true;
    });
}

export const createTermoEntregaValidator = [
  body('ordem_servico_id').isInt({ min: 1 }).withMessage('ordem_servico_id e obrigatorio'),
  body('garantia_dias').optional().isInt({ min: 0 }),
  body('cobertura_garantia').optional({ nullable: true }).isString().trim(),
  body('servico_realizado').isString().trim().notEmpty().withMessage('servico_realizado e obrigatorio'),
  body('observacoes_entrega').optional({ nullable: true }).isString().trim(),
  body('data_entrega').optional().isISO8601(),
  testesValidator('testes_finais')
];

export const updateTermoEntregaValidator = [
  param('id').isInt({ min: 1 }).withMessage('id invalido'),
  body('garantia_dias').optional().isInt({ min: 0 }),
  body('cobertura_garantia').optional({ nullable: true }).isString().trim(),
  body('servico_realizado').optional().isString().trim().notEmpty(),
  body('observacoes_entrega').optional({ nullable: true }).isString().trim(),
  body('data_entrega').optional().isISO8601(),
  testesValidator('testes_finais')
];

export const idTermoEntregaValidator = [param('id').isInt({ min: 1 }).withMessage('id invalido')];

export const listTermoEntregaValidator = [query('ordem_servico_id').optional().isInt({ min: 1 })];

export const addFotosTermoEntregaValidator = [
  param('id').isInt({ min: 1 }).withMessage('id invalido'),
  body('fotos').isArray({ min: 1 }).withMessage('fotos deve conter ao menos uma imagem'),
  body('fotos.*.arquivo_base64').isString().notEmpty().withMessage('arquivo_base64 e obrigatorio'),
  body('fotos.*.descricao').optional({ nullable: true }).isString().trim(),
  body('fotos.*.tipo_foto').optional().isIn(fotoTipo)
];

export const deleteFotoTermoEntregaValidator = [
  param('id').isInt({ min: 1 }).withMessage('id invalido'),
  param('fotoId').isInt({ min: 1 }).withMessage('fotoId invalido')
];
