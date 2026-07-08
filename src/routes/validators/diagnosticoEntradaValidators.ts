import { body, param, query } from 'express-validator';

import { paginationQueryValidator } from '../../utils/pagination';

const checklistValue = [
  'ok',
  'com_problema',
  'nao_testado',
  'nao_possui',
  'boa',
  'com_avarias',
  'nao_funciona',
  'quebrada',
  'muito_danificada',
  'funcionando',
  'parcial',
  'nao_funcionam',
  'bom',
  'com_folga',
  'nao_carrega',
  'nao_encontrado',
  'suspeita',
  'confirmado',
  'com_defeito'
];
const status = ['aberto', 'finalizado', 'cancelado'];
const fotoTipo = ['frente', 'verso', 'lateral_esquerda', 'lateral_direita', 'superior', 'inferior', 'tela', 'tampa_traseira', 'conector_carga', 'detalhe_defeito', 'outro'];

const booleanFields = [
  'possui_chip',
  'possui_cartao_memoria',
  'possui_capinha',
  'possui_pelicula',
  'acompanha_carregador',
  'acompanha_cabo',
  'acompanha_caixa',
  'acompanha_nota_fiscal'
];

function checklistValidator(field: string) {
  return body(field)
    .optional({ nullable: true })
    .custom((value) => {
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${field} invalido`);
      }
      for (const item of Object.values(value as Record<string, { status?: string }>)) {
        if (!item || !checklistValue.includes(item.status ?? '')) {
          throw new Error(`${field} possui status invalido`);
        }
      }
      return true;
    });
}

export const createDiagnosticoEntradaValidator = [
  body('cliente_id').isInt({ min: 1 }).withMessage('cliente_id e obrigatorio'),
  body('aparelho').isString().trim().notEmpty().withMessage('aparelho e obrigatorio'),
  body('defeito_relatado').isString().trim().notEmpty().withMessage('defeito_relatado e obrigatorio'),
  body('marca').optional({ nullable: true }).isString().trim(),
  body('modelo').optional({ nullable: true }).isString().trim(),
  body('cor').optional({ nullable: true }).isString().trim(),
  body('imei').optional({ nullable: true }).isString().trim(),
  body('senha_desbloqueio').optional({ nullable: true }).isString().trim(),
  body('observacao_geral').optional({ nullable: true }).isString().trim(),
  body('status').optional().isIn(status),
  ...booleanFields.map((field) => body(field).optional().isBoolean()),
  checklistValidator('checklist_fisico'),
  checklistValidator('checklist_funcional'),
  body('marcacoes_visuais').optional({ nullable: true }).isArray()
];

export const updateDiagnosticoEntradaValidator = [
  param('id').isInt({ min: 1 }).withMessage('id invalido'),
  ...createDiagnosticoEntradaValidator
];

export const idDiagnosticoEntradaValidator = [param('id').isInt({ min: 1 }).withMessage('id invalido')];

export const listDiagnosticoEntradaValidator = [
  ...paginationQueryValidator,
  query('termo').optional().isString().trim(),
  query('status').optional().isIn(status),
  query('data').optional().isISO8601()
];

export const addFotosDiagnosticoEntradaValidator = [
  param('id').isInt({ min: 1 }).withMessage('id invalido'),
  body('fotos').isArray({ min: 1 }).withMessage('fotos deve conter ao menos uma imagem'),
  body('fotos.*.arquivo_base64').isString().notEmpty().withMessage('arquivo_base64 e obrigatorio'),
  body('fotos.*.descricao').optional({ nullable: true }).isString().trim(),
  body('fotos.*.tipo_foto').optional().isIn(fotoTipo)
];

export const deleteFotoDiagnosticoEntradaValidator = [
  param('id').isInt({ min: 1 }).withMessage('id invalido'),
  param('fotoId').isInt({ min: 1 }).withMessage('fotoId invalido')
];
