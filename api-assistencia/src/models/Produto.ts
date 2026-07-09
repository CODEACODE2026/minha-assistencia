import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface ProdutoAttributes {
  id: number;
  nome: string;
  categoria?: string | null;
  categoria_id?: number | null;
  modelo_aparelho?: string | null;
  marca_aparelho?: string | null;
  quantidade: number;
  preco_custo: number;
  preco_venda: number;
  localizacao_estoque?: string | null;
  observacao?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type ProdutoCreationAttributes = Optional<
  ProdutoAttributes,
  'id' | 'categoria' | 'categoria_id' | 'quantidade' | 'preco_custo' | 'preco_venda'
>;

export class Produto extends Model<ProdutoAttributes, ProdutoCreationAttributes> implements ProdutoAttributes {
  declare id: number;
  declare nome: string;
  declare categoria: string | null;
  declare categoria_id: number | null;
  declare modelo_aparelho: string | null;
  declare marca_aparelho: string | null;
  declare quantidade: number;
  declare preco_custo: number;
  declare preco_venda: number;
  declare localizacao_estoque: string | null;
  declare observacao: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    Produto.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true
        },
        nome: {
          type: DataTypes.STRING(140),
          allowNull: false
        },
        categoria: {
          type: DataTypes.STRING(80),
          allowNull: true
        },
        categoria_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true
        },
        modelo_aparelho: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        marca_aparelho: {
          type: DataTypes.STRING(80),
          allowNull: true
        },
        quantidade: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0
        },
        preco_custo: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        preco_venda: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        localizacao_estoque: {
          type: DataTypes.STRING(160),
          allowNull: true
        },
        observacao: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        tableName: 'produtos'
      }
    );
  }
}
