import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export type TermoEntregaFotoTipo = 'frente' | 'verso' | 'lateral' | 'servico_realizado' | 'outra';

export interface TermoEntregaFotoAttributes {
  id: number;
  termo_entrega_id: number;
  foto: string;
  descricao?: string | null;
  tipo_foto: TermoEntregaFotoTipo;
  createdAt?: Date;
  updatedAt?: Date;
}

type TermoEntregaFotoCreationAttributes = Optional<TermoEntregaFotoAttributes, 'id' | 'descricao' | 'tipo_foto'>;

export class TermoEntregaFoto extends Model<TermoEntregaFotoAttributes, TermoEntregaFotoCreationAttributes> implements TermoEntregaFotoAttributes {
  declare id: number;
  declare termo_entrega_id: number;
  declare foto: string;
  declare descricao: string | null;
  declare tipo_foto: TermoEntregaFotoTipo;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    TermoEntregaFoto.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        termo_entrega_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        foto: { type: DataTypes.STRING(255), allowNull: false },
        descricao: { type: DataTypes.STRING(255), allowNull: true },
        tipo_foto: {
          type: DataTypes.ENUM('frente', 'verso', 'lateral', 'servico_realizado', 'outra'),
          allowNull: false,
          defaultValue: 'outra'
        }
      },
      { sequelize, tableName: 'termo_entrega_fotos' }
    );
  }
}
