import { Op, Transaction } from 'sequelize';

import { MovimentacaoEstoque, MovimentacaoEstoqueTipo } from '../models/MovimentacaoEstoque';
import { Orcamento } from '../models/Orcamento';
import { Produto } from '../models/Produto';
import { AppError } from '../utils/AppError';

type PecaUsada = {
  produto_id?: number;
  nome: string;
  quantidade: number;
  valor: number;
};

type ManualMovementPayload = {
  produto_id: number;
  tipo: 'entrada' | 'ajuste_manual';
  quantidade: number;
  observacao?: string | null;
};

const produtoInclude = [{ model: Produto, as: 'produto' }];

function normalizeParts(pecas: unknown): PecaUsada[] {
  let parsed = pecas;
  if (typeof pecas === 'string') {
    try {
      parsed = JSON.parse(pecas || '[]');
    } catch {
      parsed = [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((peca) => peca as Partial<PecaUsada>)
    .filter((peca) => Number(peca.produto_id) > 0 && Number(peca.quantidade) > 0)
    .map((peca) => ({
      produto_id: Number(peca.produto_id),
      nome: String(peca.nome || ''),
      quantidade: Number(peca.quantidade),
      valor: Number(peca.valor || 0)
    }));
}

export class MovimentacaoEstoqueService {
  static async list(filters: { produto_id?: number; orcamento_id?: number } = {}) {
    const where: Record<string, number> = {};
    if (filters.produto_id) {
      where.produto_id = filters.produto_id;
    }
    if (filters.orcamento_id) {
      where.orcamento_id = filters.orcamento_id;
    }

    return MovimentacaoEstoque.findAll({
      where,
      include: produtoInclude,
      order: [['createdAt', 'DESC']]
    });
  }

  static async createManual(data: ManualMovementPayload) {
    const quantidade = Number(data.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 422);
    }

    const produto = await Produto.findByPk(data.produto_id);
    if (!produto) {
      throw new AppError('Produto nao encontrado', 404);
    }

    const estoqueAnterior = Number(produto.quantidade);
    const estoqueAtual = data.tipo === 'entrada' ? estoqueAnterior + quantidade : quantidade;

    await produto.update({ quantidade: estoqueAtual });

    return MovimentacaoEstoque.create({
      produto_id: produto.id,
      tipo: data.tipo,
      quantidade,
      estoque_anterior: estoqueAnterior,
      estoque_atual: estoqueAtual,
      observacao: data.observacao ?? null
    });
  }

  static async applyOsStockOut(orcamento: Orcamento, transaction?: Transaction) {
    const parts = normalizeParts(orcamento.pecas_usadas);
    for (const part of parts) {
      const produto = await Produto.findByPk(part.produto_id, { transaction });
      if (!produto) {
        throw new AppError(`Produto vinculado nao encontrado: ${part.nome}`, 404);
      }

      const quantidade = Number(part.quantidade);
      const estoqueAnterior = Number(produto.quantidade);
      if (estoqueAnterior < quantidade) {
        throw new AppError(`Estoque insuficiente para ${produto.nome}. Disponivel: ${estoqueAnterior}`, 400);
      }

      const estoqueAtual = estoqueAnterior - quantidade;
      await produto.update({ quantidade: estoqueAtual }, { transaction });
      await MovimentacaoEstoque.create(
        {
          produto_id: produto.id,
          orcamento_id: orcamento.id,
          tipo: 'saida_os',
          quantidade,
          estoque_anterior: estoqueAnterior,
          estoque_atual: estoqueAtual,
          observacao: `Baixa automatica da OS/orcamento #${orcamento.id}`
        },
        { transaction }
      );
    }
  }

  static async reverseOsStockOut(orcamento: Orcamento, transaction?: Transaction) {
    const lastReversal = await MovimentacaoEstoque.findOne({
      where: { orcamento_id: orcamento.id, tipo: 'estorno_os' },
      order: [['createdAt', 'DESC']],
      transaction
    });

    const movements = await MovimentacaoEstoque.findAll({
      where: {
        orcamento_id: orcamento.id,
        tipo: 'saida_os',
        ...(lastReversal ? { id: { [Op.gt]: lastReversal.id } } : {})
      },
      order: [['createdAt', 'ASC']],
      transaction
    });

    for (const movement of movements) {
      const produto = await Produto.findByPk(movement.produto_id, { transaction });
      if (!produto) {
        continue;
      }

      const estoqueAnterior = Number(produto.quantidade);
      const quantidade = Number(movement.quantidade);
      const estoqueAtual = estoqueAnterior + quantidade;

      await produto.update({ quantidade: estoqueAtual }, { transaction });
      await MovimentacaoEstoque.create(
        {
          produto_id: produto.id,
          orcamento_id: orcamento.id,
          tipo: 'estorno_os',
          quantidade,
          estoque_anterior: estoqueAnterior,
          estoque_atual: estoqueAtual,
          observacao: `Estorno automatico da OS/orcamento #${orcamento.id}`
        },
        { transaction }
      );
    }
  }
}
