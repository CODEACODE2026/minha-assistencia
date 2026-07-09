import { fn, literal, Op } from 'sequelize';

import { Cliente } from '../models/Cliente';
import { MovimentacaoEstoque } from '../models/MovimentacaoEstoque';
import { Orcamento, OrcamentoStatus } from '../models/Orcamento';
import { Produto } from '../models/Produto';
import { roundMoney, toNumber } from '../utils/money';

const LOW_STOCK_LIMIT = 5;
const RECENT_LIMIT = 5;

type StatusCount = {
  status: OrcamentoStatus;
  count: number | string;
};

function currentPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return { start, end };
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '');
}

function buildLastSixMonths() {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      month: monthLabel(date),
      start: date,
      end: next
    };
  });
}

function emptyStatusCounts() {
  return {
    aberto: 0,
    aprovado: 0,
    recusado: 0,
    finalizado: 0
  };
}

export class DashboardService {
  static async summary() {
    const period = currentPeriod();
    const months = buildLastSixMonths();

    const [
      statusRows,
      receitaPeriodo,
      totalFinalizadasPeriodo,
      totalClientes,
      produtosEstoqueBaixo,
      movimentacoesRecentes,
      orcamentosRecentes,
      monthlyRows
    ] = await Promise.all([
      Orcamento.findAll({
        attributes: ['status', [fn('COUNT', literal('*')), 'count']],
        group: ['status'],
        raw: true
      }) as unknown as Promise<StatusCount[]>,
      Orcamento.sum('valor_total', {
        where: {
          status: 'finalizado',
          updatedAt: { [Op.gte]: period.start, [Op.lt]: period.end }
        }
      }),
      Orcamento.count({
        where: {
          status: 'finalizado',
          updatedAt: { [Op.gte]: period.start, [Op.lt]: period.end }
        }
      }),
      Cliente.count(),
      Produto.findAll({
        where: { quantidade: { [Op.lte]: LOW_STOCK_LIMIT } },
        order: [
          ['quantidade', 'ASC'],
          ['nome', 'ASC']
        ],
        limit: RECENT_LIMIT
      }),
      MovimentacaoEstoque.findAll({
        include: [{ model: Produto, as: 'produto' }],
        order: [['createdAt', 'DESC']],
        limit: RECENT_LIMIT
      }),
      Orcamento.findAll({
        include: [{ model: Cliente, as: 'cliente' }],
        order: [['createdAt', 'DESC']],
        limit: RECENT_LIMIT
      }),
      Orcamento.findAll({
        attributes: [
          [fn('DATE_FORMAT', literal('updated_at'), '%Y-%m'), 'month'],
          [fn('SUM', literal('valor_total')), 'value']
        ],
        where: {
          status: 'finalizado',
          updatedAt: { [Op.gte]: months[0].start, [Op.lt]: months[months.length - 1].end }
        },
        group: ['month'],
        raw: true
      }) as unknown as Promise<Array<{ month: string; value: number | string }>>
    ]);

    const osPorStatus = emptyStatusCounts();
    for (const row of statusRows) {
      osPorStatus[row.status] = Number(row.count) || 0;
    }

    const receita = roundMoney(toNumber(receitaPeriodo));
    const finalizadasPeriodo = Number(totalFinalizadasPeriodo) || 0;
    const monthlyMap = new Map(monthlyRows.map((row) => [row.month, roundMoney(toNumber(row.value))]));

    return {
      periodo: {
        inicio: period.start.toISOString(),
        fim: period.end.toISOString()
      },
      indicadores: {
        clientes: totalClientes,
        os_abertas: osPorStatus.aberto,
        os_em_andamento: osPorStatus.aprovado,
        os_aguardando_aprovacao: osPorStatus.aberto,
        os_finalizadas: osPorStatus.finalizado,
        receita_periodo: receita,
        ticket_medio: finalizadasPeriodo > 0 ? roundMoney(receita / finalizadasPeriodo) : 0,
        produtos_estoque_baixo: produtosEstoqueBaixo.length,
        movimentacoes_recentes: movimentacoesRecentes.length
      },
      os_por_status: osPorStatus,
      receita_mensal: months.map((item) => ({
        month: item.month,
        value: monthlyMap.get(item.key) ?? 0
      })),
      produtos_estoque_baixo: produtosEstoqueBaixo,
      movimentacoes_recentes: movimentacoesRecentes,
      os_recentes: orcamentosRecentes
    };
  }
}
