import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface ClienteAttributes {
  id: number;
  nome: string;
  telefone: string;
  cpf?: string | null;
  endereco?: string | null;
  observacao?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type ClienteCreationAttributes = Optional<ClienteAttributes, 'id'>;

export class Cliente extends Model<ClienteAttributes, ClienteCreationAttributes> implements ClienteAttributes {
  declare id: number;
  declare nome: string;
  declare telefone: string;
  declare cpf: string | null;
  declare endereco: string | null;
  declare observacao: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    Cliente.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true
        },
        nome: {
          type: DataTypes.STRING(120),
          allowNull: false
        },
        telefone: {
          type: DataTypes.STRING(30),
          allowNull: false
        },
        cpf: {
          type: DataTypes.STRING(20),
          allowNull: true
        },
        endereco: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        observacao: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        tableName: 'clientes'
      }
    );
  }
}
