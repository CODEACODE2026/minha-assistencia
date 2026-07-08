import { SimuladorCompra, SimuladorCompraAttributes } from '../models/SimuladorCompra';
import { AppError } from '../utils/AppError';
import { roundMoney, toNumber } from '../utils/money';

export class SimuladorCompraService {
  static calculate(data: Partial<SimuladorCompraAttributes>) {
    const valorCompra = toNumber(data.valor_compra);
    const valorFrete = toNumber(data.valor_frete);
    const valorTotalPecas = toNumber(data.valor_total_pecas);
    const outrosCustos = toNumber(data.outros_custos);
    const margemDesejada = toNumber(data.margem_lucro_percentual);
    const valorVendaEstimado = toNumber(data.valor_venda_estimado);
    const custoTotal = roundMoney(valorCompra + valorFrete + valorTotalPecas + outrosCustos);
    const lucroEstimado = roundMoney(valorVendaEstimado - custoTotal);
    const precoMinimoRecomendado = roundMoney(custoTotal * (1 + margemDesejada / 100));
    const margemRealPercentual = custoTotal > 0 ? roundMoney((lucroEstimado / custoTotal) * 100) : 0;

    return {
      custo_total: custoTotal,
      lucro_estimado: lucroEstimado,
      preco_minimo_recomendado: precoMinimoRecomendado,
      margem_real_percentual: margemRealPercentual,
      compensa_comprar: valorVendaEstimado >= precoMinimoRecomendado && lucroEstimado > 0
    };
  }

  static async create(data: Partial<SimuladorCompraAttributes>) {
    const result = this.calculate(data);

    return SimuladorCompra.create({
      ...data,
      ...result
    } as SimuladorCompraAttributes);
  }

  static async list() {
    return SimuladorCompra.findAll({ order: [['createdAt', 'DESC']] });
  }

  static async findById(id: number) {
    const simulacao = await SimuladorCompra.findByPk(id);

    if (!simulacao) {
      throw new AppError('Simulacao nao encontrada', 404);
    }

    return simulacao;
  }

  static async update(id: number, data: Partial<SimuladorCompraAttributes>) {
    const simulacao = await this.findById(id);
    const merged = {
      ...simulacao.get(),
      ...data
    };
    const result = this.calculate(merged);

    await simulacao.update({
      ...data,
      ...result
    });

    return this.findById(id);
  }

  static async delete(id: number) {
    const simulacao = await this.findById(id);
    await simulacao.destroy();
  }
}
