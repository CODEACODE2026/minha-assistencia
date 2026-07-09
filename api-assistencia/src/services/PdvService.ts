import PDFDocument from 'pdfkit';
import { Op, Transaction, WhereOptions } from 'sequelize';

import { Cliente } from '../models/Cliente';
import { MovimentacaoEstoque } from '../models/MovimentacaoEstoque';
import { Produto } from '../models/Produto';
import { Venda, VendaAttributes, VendaFormaPagamento } from '../models/Venda';
import { VendaItem } from '../models/VendaItem';
import { sequelize } from '../database/sequelize';
import { AppError } from '../utils/AppError';
import { roundMoney, toNumber } from '../utils/money';
import { buildPaginatedResult, parsePagination } from '../utils/pagination';

type VendaItemInput = {
  produto_id: number;
  quantidade: number;
};

type CreateVendaInput = {
  cliente_id?: number | null;
  forma_pagamento: VendaFormaPagamento;
  desconto?: number;
  observacao?: string | null;
  itens: VendaItemInput[];
};

type CancelVendaInput = {
  motivo?: string | null;
};

type ListVendasFilters = {
  status?: string;
  inicio?: string;
  fim?: string;
  cliente_id?: string | number;
  termo?: string;
  page?: string | number;
  limit?: string | number;
};

type CompanyProfileInput = {
  nome?: string;
  documento?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  site?: string;
  observacaoPdf?: string;
};

const vendaInclude = [
  { model: Cliente, as: 'cliente' },
  { model: VendaItem, as: 'itens', include: [{ model: Produto, as: 'produto' }] },
  { model: MovimentacaoEstoque, as: 'movimentacoes_estoque', include: [{ model: Produto, as: 'produto' }] }
];

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

function formatMoney(value: number | string) {
  return toNumber(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formaPagamentoLabel(value: string) {
  const labels: Record<string, string> = {
    pix: 'PIX',
    credito: 'Credito',
    debito: 'Debito',
    dinheiro: 'Dinheiro',
    outro: 'Outro'
  };

  return labels[value] ?? value;
}

function writePdfLine(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value);
}

function buildPdf(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function consolidateItems(items: VendaItemInput[]) {
  const consolidated = new Map<number, number>();

  for (const item of items) {
    const produtoId = Number(item.produto_id);
    const quantidade = Number(item.quantidade);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new AppError('Produto invalido no carrinho', 422);
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new AppError('Quantidade deve ser maior que zero', 422);
    }

    consolidated.set(produtoId, (consolidated.get(produtoId) ?? 0) + quantidade);
  }

  return Array.from(consolidated.entries()).map(([produto_id, quantidade]) => ({ produto_id, quantidade }));
}

export class PdvService {
  static async listVendas(filters: ListVendasFilters = {}) {
    const where: WhereOptions = {};
    const pagination = parsePagination(filters as Record<string, unknown>);
    const status = String(filters.status || 'todos');
    const clienteId = Number(filters.cliente_id);
    const inicio = parseDate(filters.inicio as string | undefined);
    const fim = parseDate(filters.fim as string | undefined);
    const termo = String(filters.termo || '').trim();
    const createdAt: Record<symbol, Date> = {};

    if (status !== 'todos') {
      where.status = status as VendaAttributes['status'];
    }

    if (Number.isInteger(clienteId) && clienteId > 0) {
      where.cliente_id = clienteId;
    }

    if (inicio) {
      createdAt[Op.gte] = startOfDay(inicio);
    }
    if (fim) {
      createdAt[Op.lt] = nextDay(fim);
    }
    if (Object.getOwnPropertySymbols(createdAt).length) {
      where.createdAt = createdAt;
    }

    if (termo) {
      const like = `%${termo}%`;
      const [clientes, itens] = await Promise.all([
        Cliente.findAll({
          attributes: ['id'],
          where: {
            [Op.or]: [{ nome: { [Op.like]: like } }, { telefone: { [Op.like]: like } }, { cpf: { [Op.like]: like } }]
          }
        }),
        VendaItem.findAll({
          attributes: ['venda_id'],
          where: { nome_produto_snapshot: { [Op.like]: like } }
        })
      ]);
      const clienteIds = clientes.map((cliente) => cliente.id);
      const vendaIds = Array.from(new Set(itens.map((item) => item.venda_id)));

      (where as Record<symbol, unknown>)[Op.or] = [
        ...(clienteIds.length ? [{ cliente_id: { [Op.in]: clienteIds } }] : []),
        ...(vendaIds.length ? [{ id: { [Op.in]: vendaIds } }] : [])
      ];

      if (!clienteIds.length && !vendaIds.length) {
        where.id = { [Op.in]: [] };
      }
    }

    const result = await Venda.findAndCountAll({
      where,
      include: vendaInclude,
      distinct: true,
      order: [['createdAt', 'DESC']],
      limit: pagination.limit,
      offset: pagination.offset
    });

    return buildPaginatedResult(result.rows, result.count, pagination);
  }

  static async createVenda(data: CreateVendaInput, usuarioId?: number | null) {
    const itens = consolidateItems(data.itens || []);

    if (!itens.length) {
      throw new AppError('Carrinho vazio', 422);
    }

    return sequelize.transaction(async (transaction) => {
      if (data.cliente_id) {
        const cliente = await Cliente.findByPk(data.cliente_id, { transaction });
        if (!cliente) {
          throw new AppError('Cliente informado nao existe', 404);
        }
      }

      const productIds = itens.map((item) => item.produto_id);
      const produtos = await Produto.findAll({
        where: { id: { [Op.in]: productIds } },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (produtos.length !== productIds.length) {
        throw new AppError('Um ou mais produtos do carrinho nao existem', 404);
      }

      const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));
      const preparedItems = itens.map((item) => {
        const produto = produtosPorId.get(item.produto_id);
        if (!produto) {
          throw new AppError('Produto nao encontrado', 404);
        }

        const estoqueAtual = Number(produto.quantidade);
        if (estoqueAtual < item.quantidade) {
          throw new AppError(`Estoque insuficiente para ${produto.nome}. Disponivel: ${estoqueAtual}`, 400);
        }

        const valorUnitario = toNumber(produto.preco_venda);
        const custoUnitario = toNumber(produto.preco_custo);
        const valorTotal = roundMoney(valorUnitario * item.quantidade);

        return { item, produto, valorUnitario, custoUnitario, valorTotal, estoqueAtual };
      });

      const subtotal = roundMoney(preparedItems.reduce((total, prepared) => total + prepared.valorTotal, 0));
      const desconto = roundMoney(toNumber(data.desconto));
      if (desconto < 0) {
        throw new AppError('Desconto nao pode ser negativo', 422);
      }
      if (desconto > subtotal) {
        throw new AppError('Desconto nao pode ser maior que o subtotal', 422);
      }

      const venda = await Venda.create(
        {
          cliente_id: data.cliente_id || null,
          usuario_id: usuarioId || null,
          subtotal,
          desconto,
          total: roundMoney(subtotal - desconto),
          forma_pagamento: data.forma_pagamento,
          status: 'concluida',
          observacao: data.observacao ?? null
        } as VendaAttributes,
        { transaction }
      );

      for (const prepared of preparedItems) {
        const estoqueAtual = prepared.estoqueAtual - prepared.item.quantidade;
        const vendaItem = await VendaItem.create(
          {
            venda_id: venda.id,
            produto_id: prepared.produto.id,
            nome_produto_snapshot: prepared.produto.nome,
            quantidade: prepared.item.quantidade,
            valor_unitario: prepared.valorUnitario,
            valor_total: prepared.valorTotal,
            custo_unitario_snapshot: prepared.custoUnitario
          },
          { transaction }
        );

        await prepared.produto.update({ quantidade: estoqueAtual }, { transaction });
        await MovimentacaoEstoque.create(
          {
            produto_id: prepared.produto.id,
            venda_id: venda.id,
            venda_item_id: vendaItem.id,
            tipo: 'saida_venda',
            quantidade: prepared.item.quantidade,
            estoque_anterior: prepared.estoqueAtual,
            estoque_atual: estoqueAtual,
            observacao: `Saida automatica da venda PDV #${venda.id}`
          },
          { transaction }
        );
      }

      return this.findById(venda.id, transaction);
    });
  }

  static async findById(id: number, transaction?: Transaction) {
    const venda = await Venda.findByPk(id, {
      include: vendaInclude,
      transaction
    });

    if (!venda) {
      throw new AppError('Venda nao encontrada', 404);
    }

    return venda;
  }

  static async cancelVenda(id: number, data: CancelVendaInput = {}, usuarioId?: number | null) {
    return sequelize.transaction(async (transaction) => {
      const venda = await Venda.findByPk(id, {
        include: [{ model: VendaItem, as: 'itens' }],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!venda) {
        throw new AppError('Venda nao encontrada', 404);
      }

      if (venda.status !== 'concluida') {
        throw new AppError('Venda ja esta cancelada', 400);
      }

      const itens = (venda as Venda & { itens?: VendaItem[] }).itens ?? [];
      if (!itens.length) {
        throw new AppError('Venda sem itens para estornar', 422);
      }

      const productIds = itens.map((item) => item.produto_id);
      const produtos = await Produto.findAll({
        where: { id: { [Op.in]: productIds } },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (produtos.length !== new Set(productIds).size) {
        throw new AppError('Um ou mais produtos da venda nao existem', 404);
      }

      const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));
      const motivo = data.motivo?.trim() || null;

      for (const item of itens) {
        const produto = produtosPorId.get(item.produto_id);
        if (!produto) {
          throw new AppError('Produto da venda nao encontrado', 404);
        }

        const estoqueAnterior = Number(produto.quantidade);
        const estoqueAtual = estoqueAnterior + Number(item.quantidade);

        await produto.update({ quantidade: estoqueAtual }, { transaction });
        await MovimentacaoEstoque.create(
          {
            produto_id: produto.id,
            venda_id: venda.id,
            venda_item_id: item.id,
            tipo: 'estorno_venda',
            quantidade: Number(item.quantidade),
            estoque_anterior: estoqueAnterior,
            estoque_atual: estoqueAtual,
            observacao: motivo ? `Estorno da venda PDV #${venda.id}: ${motivo}` : `Estorno da venda PDV #${venda.id}`
          },
          { transaction }
        );
      }

      await venda.update(
        {
          status: 'cancelada',
          cancelado_em: new Date(),
          motivo_cancelamento: motivo,
          cancelado_por_usuario_id: usuarioId || null
        },
        { transaction }
      );

      return this.findById(venda.id, transaction);
    });
  }

  static async reciboPdf(id: number, company?: CompanyProfileInput | null) {
    const venda = (await this.findById(id)) as Venda & {
      cliente?: Cliente | null;
      itens?: VendaItem[];
    };
    const itens = venda.itens ?? [];
    const doc = new PDFDocument({ size: 'A4', margin: 48, compress: false });
    doc.info.Title = `Recibo PDV #${venda.id}`;
    doc.info.Author = company?.nome || 'Minha Assistencia';
    doc.info.Subject = company?.nome ? `Recibo emitido por ${company.nome}` : 'Recibo PDV';

    doc.font('Helvetica-Bold').fontSize(18).text(`Recibo PDV #${venda.id}`);
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827').text(company?.nome || 'Minha Assistencia');
    doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
    const companyLines = [company?.documento, company?.telefone || company?.whatsapp, company?.email, company?.endereco, company?.cidade, company?.site].filter(Boolean);
    if (companyLines.length) {
      doc.text(companyLines.join(' | '));
    }
    doc.moveDown();
    doc.fillColor('#111827').fontSize(11);
    writePdfLine(doc, 'Data', venda.createdAt ? venda.createdAt.toLocaleString('pt-BR') : '-');
    writePdfLine(doc, 'Status', venda.status);
    writePdfLine(doc, 'Cliente', venda.cliente?.nome ?? 'Consumidor nao identificado');
    writePdfLine(doc, 'Forma de pagamento', formaPagamentoLabel(venda.forma_pagamento));

    if (venda.status === 'cancelada') {
      writePdfLine(doc, 'Cancelado em', venda.cancelado_em ? venda.cancelado_em.toLocaleString('pt-BR') : '-');
      writePdfLine(doc, 'Motivo do cancelamento', venda.motivo_cancelamento || '-');
    }

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Itens');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const columns = {
      item: 48,
      quantidade: 300,
      unitario: 365,
      total: 450
    };

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Item', columns.item, tableTop);
    doc.text('Qtd.', columns.quantidade, tableTop, { width: 50, align: 'right' });
    doc.text('Unitario', columns.unitario, tableTop, { width: 70, align: 'right' });
    doc.text('Total', columns.total, tableTop, { width: 70, align: 'right' });
    doc.moveTo(48, tableTop + 16).lineTo(530, tableTop + 16).strokeColor('#d1d5db').stroke();

    doc.font('Helvetica').strokeColor('#111827');
    let y = tableTop + 24;
    for (const item of itens) {
      if (y > 720) {
        doc.addPage();
        y = 48;
      }
      doc.text(item.nome_produto_snapshot, columns.item, y, { width: 235 });
      doc.text(String(item.quantidade), columns.quantidade, y, { width: 50, align: 'right' });
      doc.text(formatMoney(item.valor_unitario), columns.unitario, y, { width: 70, align: 'right' });
      doc.text(formatMoney(item.valor_total), columns.total, y, { width: 70, align: 'right' });
      y += 22;
    }

    doc.moveDown();
    const totalsTop = Math.max(y + 12, doc.y + 12);
    doc.fontSize(11);
    doc.font('Helvetica').text('Subtotal', 360, totalsTop, { width: 80 });
    doc.font('Helvetica-Bold').text(formatMoney(venda.subtotal), 440, totalsTop, { width: 90, align: 'right' });
    doc.font('Helvetica').text('Desconto', 360, totalsTop + 20, { width: 80 });
    doc.font('Helvetica-Bold').text(formatMoney(venda.desconto), 440, totalsTop + 20, { width: 90, align: 'right' });
    doc.font('Helvetica').text('Total', 360, totalsTop + 44, { width: 80 });
    doc.font('Helvetica-Bold').fontSize(14).text(formatMoney(venda.total), 440, totalsTop + 42, { width: 90, align: 'right' });

    if (company?.observacaoPdf) {
      doc.moveDown(4);
      doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(company.observacaoPdf, 48, doc.y, { width: 482 });
    }

    return buildPdf(doc);
  }
}
