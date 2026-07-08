import PDFDocument from 'pdfkit';
import { Transaction } from 'sequelize';

import { Cliente } from '../models/Cliente';
import { Orcamento, OrcamentoAttributes } from '../models/Orcamento';
import { sequelize } from '../database/sequelize';
import { MovimentacaoEstoqueService } from './MovimentacaoEstoqueService';
import { AppError } from '../utils/AppError';
import { roundMoney, toNumber } from '../utils/money';
import { buildPaginatedResult, PaginationParams } from '../utils/pagination';

export class OrcamentoService {
  private static shouldHoldStock(status?: string) {
    return status === 'aprovado' || status === 'finalizado';
  }

  static calculateTotal(data: Partial<OrcamentoAttributes>) {
    const valorPecas = toNumber(data.valor_pecas);
    const valorMaoObra = toNumber(data.valor_mao_obra);
    const desconto = toNumber(data.desconto);

    return roundMoney(valorPecas + valorMaoObra - desconto);
  }

  static async create(data: Partial<OrcamentoAttributes>) {
    const cliente = await Cliente.findByPk(data.cliente_id);

    if (!cliente) {
      throw new AppError('Cliente informado nao existe', 404);
    }

    return sequelize.transaction(async (transaction) => {
      const orcamento = await Orcamento.create(
        {
          ...data,
          valor_total: this.calculateTotal(data)
        } as OrcamentoAttributes,
        { transaction }
      );

      if (this.shouldHoldStock(orcamento.status)) {
        await MovimentacaoEstoqueService.applyOsStockOut(orcamento, transaction);
        await orcamento.update({ estoque_baixado: true }, { transaction });
      }

      return this.findById(orcamento.id, transaction);
    });
  }

  static async list(pagination?: PaginationParams) {
    const options = {
      include: [{ model: Cliente, as: 'cliente' }],
      order: [['createdAt', 'DESC']] as [string, string][]
    };

    if (!pagination?.enabled) {
      return Orcamento.findAll(options);
    }

    const result = await Orcamento.findAndCountAll({
      ...options,
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset
    });

    return buildPaginatedResult(result.rows, result.count, pagination);
  }

  static async findById(id: number, transaction?: Transaction) {
    const orcamento = await Orcamento.findByPk(id, {
      include: [{ model: Cliente, as: 'cliente' }],
      transaction
    });

    if (!orcamento) {
      throw new AppError('Orcamento nao encontrado', 404);
    }

    return orcamento;
  }

  static async update(id: number, data: Partial<OrcamentoAttributes>) {
    return sequelize.transaction(async (transaction) => {
      const orcamento = await Orcamento.findByPk(id, { transaction });

      if (!orcamento) {
        throw new AppError('Orcamento nao encontrado', 404);
      }

      if (orcamento.status === 'finalizado') {
        throw new AppError('Ordem de servico finalizada nao pode ser editada. Exclua a OS se precisar desfazer.', 400);
      }

      const wasStockApplied = Boolean(orcamento.estoque_baixado);
      const merged = { ...orcamento.toJSON(), ...data } as OrcamentoAttributes;
      const shouldHoldStock = this.shouldHoldStock(merged.status);
      const stockSensitiveDataChanged = data.pecas_usadas !== undefined || data.valor_pecas !== undefined;

      if (data.cliente_id) {
        const cliente = await Cliente.findByPk(data.cliente_id, { transaction });

        if (!cliente) {
          throw new AppError('Cliente informado nao existe', 404);
        }
      }

      if (wasStockApplied && (!shouldHoldStock || stockSensitiveDataChanged)) {
        await MovimentacaoEstoqueService.reverseOsStockOut(orcamento, transaction);
      }

      await orcamento.update(
        {
          ...data,
          valor_total: this.calculateTotal(merged),
          estoque_baixado: wasStockApplied && shouldHoldStock && !stockSensitiveDataChanged
        },
        { transaction }
      );

      if (shouldHoldStock && !orcamento.estoque_baixado) {
        await MovimentacaoEstoqueService.applyOsStockOut(orcamento, transaction);
        await orcamento.update({ estoque_baixado: true }, { transaction });
      }

      return this.findById(id, transaction);
    });
  }

  static async delete(id: number, options: { estornarEstoque?: boolean } = {}) {
    await sequelize.transaction(async (transaction) => {
      const orcamento = await Orcamento.findByPk(id, { transaction });

      if (!orcamento) {
        throw new AppError('Orcamento nao encontrado', 404);
      }

      if (orcamento.estoque_baixado && options.estornarEstoque !== false) {
        await MovimentacaoEstoqueService.reverseOsStockOut(orcamento, transaction);
      }

      await orcamento.destroy({ transaction });
    });
  }

  static async generatePdf(id: number) {
    const orcamento = await this.findById(id);
    const data = orcamento.toJSON() as OrcamentoAttributes & { cliente?: Cliente };
    const cliente = data.cliente as Cliente | undefined;
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    const finished = new Promise<void>((resolve) => doc.on('end', resolve));

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

    doc.fontSize(18).text('Minha Assistencia', { align: 'center' });
    doc.fontSize(12).text('Orcamento de assistencia tecnica', { align: 'center' });
    doc.moveDown();
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
    doc.text(`Orcamento: #${data.id}`);
    doc.moveDown();
    doc.fontSize(14).text('Cliente');
    doc.fontSize(11).text(`Nome: ${cliente?.nome || ''}`);
    doc.text(`Telefone: ${cliente?.telefone || ''}`);
    doc.text(`CPF: ${cliente?.cpf || ''}`);
    doc.text(`Endereco: ${cliente?.endereco || ''}`);
    doc.moveDown();
    doc.fontSize(14).text('Aparelho e servico');
    doc.fontSize(11).text(`Aparelho: ${data.aparelho}`);
    doc.text(`Defeito relatado: ${data.defeito_relatado}`);
    doc.text(`Servico: ${data.servico}`);
    doc.text(`Pecas usadas: ${JSON.stringify(data.pecas_usadas || [])}`);
    doc.moveDown();
    doc.fontSize(14).text('Valores');
    doc.fontSize(11).text(`Valor pecas: R$ ${data.valor_pecas}`);
    doc.text(`Valor mao de obra: R$ ${data.valor_mao_obra}`);
    doc.text(`Desconto: R$ ${data.desconto}`);
    doc.text(`Valor total: R$ ${data.valor_total}`);
    doc.text(`Status: ${data.status}`);
    doc.moveDown();
    doc.fontSize(14).text('Observacao');
    doc.fontSize(11).text(data.observacao || 'Sem observacao');
    doc.end();

    await finished;

    return Buffer.concat(chunks);
  }
}
