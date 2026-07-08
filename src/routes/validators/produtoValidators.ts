import { body, query } from 'express-validator';

export const createProdutoValidator = [
  body('nome').isString().trim().notEmpty().withMessage('nome e obrigatorio'),
  body('categoria').optional({ nullable: true }).isString().trim().notEmpty(),
  body('categoria_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('categoria_id invalido'),
  body().custom((value) => {
    if (!value.categoria && !value.categoria_id) {
      throw new Error('categoria_id ou categoria e obrigatorio');
    }

    return true;
  }),
  body('modelo_aparelho').optional({ nullable: true }).isString(),
  body('marca_aparelho').optional({ nullable: true }).isString(),
  body('quantidade').optional().isInt({ min: 0 }).withMessage('quantidade invalida'),
  body('preco_custo').optional().isFloat({ min: 0 }).withMessage('preco_custo invalido'),
  body('preco_venda').optional().isFloat({ min: 0 }).withMessage('preco_venda invalido'),
  body('localizacao_estoque').optional({ nullable: true }).isString(),
  body('observacao').optional({ nullable: true }).isString()
];

export const updateProdutoValidator = [
  body('nome').optional().isString().trim().notEmpty(),
  body('categoria').optional({ nullable: true }).isString().trim().notEmpty(),
  body('categoria_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('categoria_id invalido'),
  body('modelo_aparelho').optional({ nullable: true }).isString(),
  body('marca_aparelho').optional({ nullable: true }).isString(),
  body('quantidade').optional().isInt({ min: 0 }),
  body('preco_custo').optional().isFloat({ min: 0 }),
  body('preco_venda').optional().isFloat({ min: 0 }),
  body('localizacao_estoque').optional({ nullable: true }).isString(),
  body('observacao').optional({ nullable: true }).isString()
];

export const searchProdutoValidator = [
  query('termo').isString().trim().notEmpty().withMessage('termo e obrigatorio')
];
