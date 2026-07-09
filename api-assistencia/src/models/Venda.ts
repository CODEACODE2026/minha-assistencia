import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export type VendaFormaPagamento = 'pix' | 'credito' | 'debito' | 'dinheiro' | 'outro';
export type VendaStatus = 'concluida' | 'cancelada';

export interface VendaAttributes {
  id: number;
  cliente_id?: number | null;
  usuario_id?: number | null;
  subtotal: number;
  desconto: number;
  total: number;
  forma_pagamento: VendaFormaPagamento;
  status: VendaStatus;
  observacao?: string | null;
  cancelado_em?: Date | null;
  motivo_cancelamento?: string | null;
  cancelado_por_usuario_id?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type VendaCreationAttributes = Optional<
  VendaAttributes,
  'id' | 'cliente_id' | 'usuario_id' | 'status' | 'observacao' | 'cancelado_em' | 'motivo_cancelamento' | 'cancelado_por_usuario_id'
>;

export class Venda extends Model<VendaAttributes, VendaCreationAttributes> implements VendaAttributes {
  declare id: number;
  declare cliente_id: number | null;
  declare usuario_id: number | null;
  declare subtotal: number;
  declare desconto: number;
  declare total: number;
  declare forma_pagamento: VendaFormaPagamento;
  declare status: VendaStatus;
  declare observacao: string | null;
  declare cancelado_em: Date | null;
  declare motivo_cancelamento: string | null;
  declare cancelado_por_usuario_id: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    Venda.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        cliente_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
        usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
        subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        desconto: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        forma_pagamento: { type: DataTypes.ENUM('pix', 'credito', 'debito', 'dinheiro', 'outro'), allowNull: false },
        status: { type: DataTypes.ENUM('concluida', 'cancelada'), allowNull: false, defaultValue: 'concluida' },
        observacao: { type: DataTypes.TEXT, allowNull: true },
        cancelado_em: { type: DataTypes.DATE, allowNull: true },
        motivo_cancelamento: { type: DataTypes.TEXT, allowNull: true },
        cancelado_por_usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }
      },
      { sequelize, tableName: 'vendas' }
    );
  }
}
