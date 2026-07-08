import { Op } from 'sequelize';

import { Categoria } from '../models/Categoria';
import { Produto, ProdutoAttributes } from '../models/Produto';
import { AppError } from '../utils/AppError';
import { buildPaginatedResult, PaginationParams } from '../utils/pagination';

const produtoInclude = [{ model: Categoria, as: 'categoria_cadastro' }];

function formatProduto(produto: Produto) {
  const json = produto.toJSON() as unknown as Record<string, unknown>;
  const nome = [produto.nome, produto.modelo_aparelho].filter(Boolean).join(' ');
  const localizacao = produto.localizacao_estoque || 'localizacao nao informada';

  return {
    ...json,
    localizacao_formatada: `${nome} esta na ${localizacao}`
  };
}

export class ProdutoService {
  static async create(data: Partial<ProdutoAttributes>) {
    const payload = await this.prepareCategoriaPayload(data);
    const produto = await Produto.create(payload as ProdutoAttributes);
    return this.findById(produto.id);
  }

  static async list(pagination?: PaginationParams) {
    const options = {
      include: produtoInclude,
      order: [['nome', 'ASC']] as [string, string][]
    };

    if (!pagination?.enabled) {
      const produtos = await Produto.findAll(options);
      return produtos.map(formatProduto);
    }

    const result = await Produto.findAndCountAll({
      ...options,
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset
    });

    return buildPaginatedResult(result.rows.map(formatProduto), result.count, pagination);
  }

  static async findById(id: number) {
    const produto = await Produto.findByPk(id, { include: produtoInclude });

    if (!produto) {
      throw new AppError('Produto nao encontrado', 404);
    }

    return formatProduto(produto);
  }

  static async update(id: number, data: Partial<ProdutoAttributes>) {
    const produto = await Produto.findByPk(id);

    if (!produto) {
      throw new AppError('Produto nao encontrado', 404);
    }

    const payload = await this.prepareCategoriaPayload(data);
    await produto.update(payload);
    return this.findById(produto.id);
  }

  static async delete(id: number) {
    const produto = await Produto.findByPk(id);

    if (!produto) {
      throw new AppError('Produto nao encontrado', 404);
    }

    await produto.destroy();
  }

  static async search(termo: string) {
    const like = `%${termo}%`;
    const produtos = await Produto.findAll({
      include: produtoInclude,
      where: {
        [Op.or]: [
          { nome: { [Op.like]: like } },
          { categoria: { [Op.like]: like } },
          { '$categoria_cadastro.nome$': { [Op.like]: like } },
          { modelo_aparelho: { [Op.like]: like } },
          { marca_aparelho: { [Op.like]: like } },
          { localizacao_estoque: { [Op.like]: like } },
          { observacao: { [Op.like]: like } }
        ]
      },
      order: [
        ['quantidade', 'DESC'],
        ['nome', 'ASC']
      ]
    });

    return produtos.map(formatProduto);
  }

  private static async prepareCategoriaPayload(data: Partial<ProdutoAttributes>) {
    if (data.categoria_id === undefined || data.categoria_id === null) {
      return data;
    }

    const categoria = await Categoria.findByPk(data.categoria_id);

    if (!categoria) {
      throw new AppError('Categoria nao encontrada', 404);
    }

    return {
      ...data,
      categoria: data.categoria || categoria.nome
    };
  }
}
