import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface SimuladorCompraAttributes {
  id: number;
  modelo_aparelho: string;
  valor_compra: number;
  valor_frete: number;
  pecas_necessarias?: unknown[] | null;
  valor_total_pecas: number;
  outros_custos: number;
  margem_lucro_percentual: number;
  valor_venda_estimado: number;
  custo_total: number;
  lucro_estimado: number;
  preco_minimo_recomendado: number;
  margem_real_percentual: number;
  compensa_comprar: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type SimuladorCompraCreationAttributes = Optional<
  SimuladorCompraAttributes,
  'id' | 'pecas_necessarias' | 'custo_total' | 'lucro_estimado' | 'preco_minimo_recomendado' | 'margem_real_percentual' | 'compensa_comprar'
>;

export class SimuladorCompra
  extends Model<SimuladorCompraAttributes, SimuladorCompraCreationAttributes>
  implements SimuladorCompraAttributes
{
  declare id: number;
  declare modelo_aparelho: string;
  declare valor_compra: number;
  declare valor_frete: number;
  declare pecas_necessarias: unknown[] | null;
  declare valor_total_pecas: number;
  declare outros_custos: number;
  declare margem_lucro_percentual: number;
  declare valor_venda_estimado: number;
  declare custo_total: number;
  declare lucro_estimado: number;
  declare preco_minimo_recomendado: number;
  declare margem_real_percentual: number;
  declare compensa_comprar: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    SimuladorCompra.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true
        },
        modelo_aparelho: {
          type: DataTypes.STRING(140),
          allowNull: false
        },
        valor_compra: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        valor_frete: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        pecas_necessarias: {
          type: DataTypes.JSON,
          allowNull: true
        },
        valor_total_pecas: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        outros_custos: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        margem_lucro_percentual: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0
        },
        valor_venda_estimado: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        custo_total: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        lucro_estimado: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        preco_minimo_recomendado: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
        },
        margem_real_percentual: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false
        },
        compensa_comprar: {
          type: DataTypes.BOOLEAN,
          allowNull: false
        }
      },
      {
        sequelize,
        tableName: 'simulador_compras'
      }
    );
  }
}
