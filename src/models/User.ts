import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface UserAttributes {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  role: 'admin';
  createdAt?: Date;
  updatedAt?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'role'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare nome: string;
  declare email: string;
  declare senha_hash: string;
  declare role: 'admin';
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    User.init(
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
        email: {
          type: DataTypes.STRING(160),
          allowNull: false,
          unique: true
        },
        senha_hash: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        role: {
          type: DataTypes.ENUM('admin'),
          allowNull: false,
          defaultValue: 'admin'
        }
      },
      {
        sequelize,
        tableName: 'users'
      }
    );
  }
}
