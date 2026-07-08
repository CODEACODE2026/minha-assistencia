import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export type OrcamentoStatus = 'aberto' | 'aprovado' | 'recusado' | 'finalizado';

export interface OrcamentoAttributes {
  id: number;
  cliente_id: number;
  aparelho: string;
  defeito_relatado: string;
  servico: string;
  pecas_usadas?: unknown[] | null;
  valor_pecas: number;
  valor_mao_obra: number;
  desconto: number;
  valor_total: number;
  status: OrcamentoStatus;
  estoque_baixado: boolean;
  observacao?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type OrcamentoCreationAttributes = Optional<
  OrcamentoAttributes,
  'id' | 'pecas_usadas' | 'valor_pecas' | 'valor_mao_obra' | 'desconto' | 'valor_total' | 'status'
  | 'estoque_baixado'
>;

export class Orcamento extends Model<OrcamentoAttributes, OrcamentoCreationAttributes> implements OrcamentoAttributes {
  declare id: number;
  declare cliente_id: number;
  declare aparelho: string;
  declare defeito_relatado: string;
  declare servico: string;
  declare pecas_usadas: unknown[] | null;
  declare valor_pecas: number;
  declare valor_mao_obra: number;
  declare desconto: number;
  declare valor_total: number;
  declare status: OrcamentoStatus;
  declare estoque_baixado: boolean;
  declare observacao: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    Orcamento.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true
        },
        cliente_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false
        },
        aparelho: {
          type: DataTypes.STRING(140),
          allowNull: false
        },
        defeito_relatado: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        servico: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        pecas_usadas: {
          type: DataTypes.JSON,
          allowNull: true
        },
        valor_pecas: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        valor_mao_obra: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        desconto: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        valor_total: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        status: {
          type: DataTypes.ENUM('aberto', 'aprovado', 'recusado', 'finalizado'),
          allowNull: false,
          defaultValue: 'aberto'
        },
        estoque_baixado: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        observacao: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        tableName: 'orcamentos'
      }
    );
  }
}
