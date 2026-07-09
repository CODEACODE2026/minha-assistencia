import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface VendaItemAttributes {
  id: number;
  venda_id: number;
  produto_id: number;
  nome_produto_snapshot: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  custo_unitario_snapshot: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type VendaItemCreationAttributes = Optional<VendaItemAttributes, 'id'>;

export class VendaItem extends Model<VendaItemAttributes, VendaItemCreationAttributes> implements VendaItemAttributes {
  declare id: number;
  declare venda_id: number;
  declare produto_id: number;
  declare nome_produto_snapshot: string;
  declare quantidade: number;
  declare valor_unitario: number;
  declare valor_total: number;
  declare custo_unitario_snapshot: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    VendaItem.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        venda_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        produto_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        nome_produto_snapshot: { type: DataTypes.STRING(140), allowNull: false },
        quantidade: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        valor_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        valor_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        custo_unitario_snapshot: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }
      },
      { sequelize, tableName: 'venda_itens' }
    );
  }
}
