import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface CategoriaAttributes {
  id: number;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type CategoriaCreationAttributes = Optional<CategoriaAttributes, 'id' | 'ativo'>;

export class Categoria extends Model<CategoriaAttributes, CategoriaCreationAttributes> implements CategoriaAttributes {
  declare id: number;
  declare nome: string;
  declare descricao: string | null;
  declare ativo: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    Categoria.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true
        },
        nome: {
          type: DataTypes.STRING(80),
          allowNull: false,
          unique: true
        },
        descricao: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        ativo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }
      },
      {
        sequelize,
        tableName: 'categorias'
      }
    );
  }
}
