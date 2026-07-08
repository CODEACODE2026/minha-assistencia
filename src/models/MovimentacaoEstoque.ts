import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export type MovimentacaoEstoqueTipo = 'entrada' | 'saida_os' | 'saida_venda' | 'estorno_os' | 'ajuste_manual';

export interface MovimentacaoEstoqueAttributes {
  id: number;
  produto_id: number;
  orcamento_id?: number | null;
  tipo: MovimentacaoEstoqueTipo;
  quantidade: number;
  estoque_anterior: number;
  estoque_atual: number;
  observacao?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type MovimentacaoEstoqueCreationAttributes = Optional<MovimentacaoEstoqueAttributes, 'id' | 'orcamento_id' | 'observacao'>;

export class MovimentacaoEstoque
  extends Model<MovimentacaoEstoqueAttributes, MovimentacaoEstoqueCreationAttributes>
  implements MovimentacaoEstoqueAttributes
{
  declare id: number;
  declare produto_id: number;
  declare orcamento_id: number | null;
  declare tipo: MovimentacaoEstoqueTipo;
  declare quantidade: number;
  declare estoque_anterior: number;
  declare estoque_atual: number;
  declare observacao: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    MovimentacaoEstoque.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true
        },
        produto_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false
        },
        orcamento_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true
        },
        tipo: {
          type: DataTypes.ENUM('entrada', 'saida_os', 'saida_venda', 'estorno_os', 'ajuste_manual'),
          allowNull: false
        },
        quantidade: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false
        },
        estoque_anterior: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false
        },
        estoque_atual: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false
        },
        observacao: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        tableName: 'movimentacoes_estoque'
      }
    );
  }
}
