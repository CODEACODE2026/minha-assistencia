import { Op } from 'sequelize';

import { Cliente } from '../models/Cliente';
import { MovimentacaoEstoque } from '../models/MovimentacaoEstoque';
import { Orcamento } from '../models/Orcamento';
import { Produto } from '../models/Produto';
import { Venda } from '../models/Venda';
import { VendaItem } from '../models/VendaItem';
import { roundMoney, toNumber } from '../utils/money';

const RECENT_LIMIT = 8;
const ORIGENS = ['todos', 'os', 'pdv'] as const;

type FinanceiroFilters = {
  periodo?: string;
  inicio?: string;
  fim?: string;
  origem?: string;
};

type FinanceiroOrigem = (typeof ORIGENS)[number];

type PecaUsada = {
  produto_id?: number;
  nome: string;
  quantidade: number;
  valor: number;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nextDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolvePeriod(filters: FinanceiroFilters) {
  const customStart = parseDate(filters.inicio);
  const customEnd = parseDate(filters.fim);

  if (customStart || customEnd) {
    return {
      label: 'personalizado',
      start: customStart ? startOfDay(customStart) : null,
      end: customEnd ? nextDay(customEnd) : null
    };
  }

  const now = new Date();
  const periodo = filters.periodo || 'mes_atual';

  if (periodo === 'todos') {
    return { label: periodo, start: null, end: null };
  }

  if (periodo === 'ultimos_30_dias') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { label: periodo, start: startOfDay(start), end: nextDay(now) };
  }

  if (periodo === 'ano_atual') {
    return { label: periodo, start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
  }

  return { label: 'mes_atual', start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}

function resolveOrigem(value?: string): FinanceiroOrigem {
  return ORIGENS.includes(value as FinanceiroOrigem) ? (value as FinanceiroOrigem) : 'todos';
}

function dateWhere(period: ReturnType<typeof resolvePeriod>) {
  const range: Record<symbol, Date> = {};
  if (period.start) {
    range[Op.gte] = period.start;
  }
  if (period.end) {
    range[Op.lt] = period.end;
  }

  return Object.keys(range).length || Object.getOwnPropertySymbols(range).length ? { updatedAt: range } : {};
}

function createdAtWhere(period: ReturnType<typeof resolvePeriod>) {
  const range: Record<symbol, Date> = {};
  if (period.start) {
    range[Op.gte] = period.start;
  }
  if (period.end) {
    range[Op.lt] = period.end;
  }

  return Object.keys(range).length || Object.getOwnPropertySymbols(range).length ? { createdAt: range } : {};
}

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

  return parsed.map((peca) => peca as Partial<PecaUsada>).map((peca) => ({
    produto_id: Number(peca.produto_id) || undefined,
    nome: String(peca.nome || 'Peca sem nome'),
    quantidade: Number(peca.quantidade) || 0,
    valor: toNumber(peca.valor)
  }));
}

async function estimatePartsCost(orcamentos: Orcamento[]) {
  const partsByOrder = orcamentos.map((orcamento) => ({
    orcamento,
    parts: normalizeParts(orcamento.pecas_usadas)
  }));
  const productIds = Array.from(
    new Set(partsByOrder.flatMap(({ parts }) => parts.map((part) => part.produto_id).filter((id): id is number => Boolean(id))))
  );
  const produtos = productIds.length
    ? await Produto.findAll({
        where: { id: productIds }
      })
    : [];
  const productCost = new Map(produtos.map((produto) => [produto.id, toNumber(produto.preco_custo)]));

  return partsByOrder.reduce((total, { parts }) => {
    const orderCost = parts.reduce((sum, part) => {
      const unitCost = part.produto_id ? productCost.get(part.produto_id) ?? 0 : 0;
      return sum + part.quantidade * unitCost;
    }, 0);

    return total + orderCost;
  }, 0);
}

export class FinanceiroService {
  static async summary(filters: FinanceiroFilters) {
    const period = resolvePeriod(filters);
    const origem = resolveOrigem(filters.origem);
    const includeOs = origem === 'todos' || origem === 'os';
    const includePdv = origem === 'todos' || origem === 'pdv';
    const finalizedWhere = {
      status: 'finalizado',
      ...dateWhere(period)
    };
    const vendasWhere = {
      status: 'concluida',
      ...createdAtWhere(period)
    };
    const movementTypes = [
      ...(includeOs ? ['saida_os', 'estorno_os'] : []),
      ...(includePdv ? ['saida_venda', 'estorno_venda'] : [])
    ];

    const [orcamentosFinalizados, vendasPdv, movimentacoesRecentes] = await Promise.all([
      includeOs
        ? Orcamento.findAll({
            where: finalizedWhere,
            include: [{ model: Cliente, as: 'cliente' }],
            order: [['updatedAt', 'DESC']]
          })
        : Promise.resolve([]),
      includePdv
        ? Venda.findAll({
            where: vendasWhere,
            include: [
              { model: Cliente, as: 'cliente' },
              { model: VendaItem, as: 'itens', include: [{ model: Produto, as: 'produto' }] }
            ],
            order: [['createdAt', 'DESC']]
          })
        : Promise.resolve([]),
      MovimentacaoEstoque.findAll({
        where: {
          ...createdAtWhere(period),
          ...(movementTypes.length ? { tipo: { [Op.in]: movementTypes } } : {})
        },
        include: [{ model: Produto, as: 'produto' }],
        order: [['createdAt', 'DESC']],
        limit: RECENT_LIMIT
      })
    ]);

    const receitaOs = includeOs ? orcamentosFinalizados.reduce((total, orcamento) => total + toNumber(orcamento.valor_total), 0) : 0;
    const custoOs = includeOs ? await estimatePartsCost(orcamentosFinalizados) : 0;
    const receitaPdv = includePdv ? vendasPdv.reduce((total, venda) => total + toNumber(venda.total), 0) : 0;
    const custoPdv = includePdv
      ? vendasPdv.reduce((total, venda) => {
          const itens = (venda as Venda & { itens?: VendaItem[] }).itens ?? [];
          return total + itens.reduce((sum, item) => sum + toNumber(item.custo_unitario_snapshot) * Number(item.quantidade), 0);
        }, 0)
      : 0;

    const receita = roundMoney(receitaOs + receitaPdv);
    const despesas = roundMoney(custoOs + custoPdv);
    const saldo = roundMoney(receita - despesas);
    const osFinalizadas = orcamentosFinalizados.length;
    const vendasPdvConcluidas = vendasPdv.length;
    const totalLancamentos = osFinalizadas + vendasPdvConcluidas;
    const ticketMedio = totalLancamentos > 0 ? roundMoney(receita / totalLancamentos) : 0;
    const margemMedia = receita > 0 ? roundMoney((saldo / receita) * 100) : 0;
    const lancamentos = [
      ...orcamentosFinalizados.map((orcamento) => ({
        origem: 'OS' as const,
        id: orcamento.id,
        cliente_nome: (orcamento as Orcamento & { cliente?: Cliente }).cliente?.nome ?? `Cliente #${orcamento.cliente_id}`,
        descricao: orcamento.aparelho,
        receita: toNumber(orcamento.valor_total),
        custo: 0,
        data: orcamento.updatedAt,
        status: orcamento.status
      })),
      ...vendasPdv.map((venda) => {
        const itens = (venda as Venda & { itens?: VendaItem[] }).itens ?? [];
        const custo = itens.reduce((sum, item) => sum + toNumber(item.custo_unitario_snapshot) * Number(item.quantidade), 0);

        return {
          origem: 'PDV' as const,
          id: venda.id,
          cliente_nome: (venda as Venda & { cliente?: Cliente | null }).cliente?.nome ?? 'Consumidor nao identificado',
          descricao: `${itens.length} item(ns)`,
          receita: toNumber(venda.total),
          custo: roundMoney(custo),
          data: venda.createdAt,
          status: venda.status
        };
      })
    ]
      .sort((a, b) => new Date(b.data ?? 0).getTime() - new Date(a.data ?? 0).getTime())
      .slice(0, RECENT_LIMIT);

    return {
      periodo: {
        tipo: period.label,
        inicio: period.start?.toISOString() ?? null,
        fim: period.end?.toISOString() ?? null
      },
      origem,
      indicadores: {
        receita,
        despesas,
        saldo,
        os_finalizadas: osFinalizadas,
        vendas_pdv_concluidas: vendasPdvConcluidas,
        lancamentos_total: totalLancamentos,
        ticket_medio: ticketMedio,
        margem_media_percentual: margemMedia
      },
      os_finalizadas: orcamentosFinalizados.slice(0, RECENT_LIMIT),
      vendas_pdv: vendasPdv.slice(0, RECENT_LIMIT),
      lancamentos,
      movimentacoes_relacionadas: movimentacoesRecentes.map((movimentacao) => {
        const tipo = movimentacao.tipo;
        const movimento = movimentacao.toJSON() as unknown as Record<string, unknown>;
        return {
          ...movimento,
          origem: tipo === 'saida_venda' || tipo === 'estorno_venda' ? 'PDV' : 'OS'
        };
      })
    };
  }
}
