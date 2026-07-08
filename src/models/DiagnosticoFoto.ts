import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export type DiagnosticoFotoTipo =
  | 'frente'
  | 'verso'
  | 'lateral_esquerda'
  | 'lateral_direita'
  | 'superior'
  | 'inferior'
  | 'tela'
  | 'tampa_traseira'
  | 'conector_carga'
  | 'detalhe_defeito'
  | 'outro';

export interface DiagnosticoFotoAttributes {
  id: number;
  diagnostico_id: number;
  caminho_arquivo: string;
  descricao?: string | null;
  tipo_foto: DiagnosticoFotoTipo;
  createdAt?: Date;
  updatedAt?: Date;
}

type DiagnosticoFotoCreationAttributes = Optional<DiagnosticoFotoAttributes, 'id' | 'descricao' | 'tipo_foto'>;

export class DiagnosticoFoto extends Model<DiagnosticoFotoAttributes, DiagnosticoFotoCreationAttributes> implements DiagnosticoFotoAttributes {
  declare id: number;
  declare diagnostico_id: number;
  declare caminho_arquivo: string;
  declare descricao: string | null;
  declare tipo_foto: DiagnosticoFotoTipo;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    DiagnosticoFoto.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        diagnostico_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        caminho_arquivo: { type: DataTypes.STRING(255), allowNull: false },
        descricao: { type: DataTypes.STRING(255), allowNull: true },
        tipo_foto: {
          type: DataTypes.ENUM('frente', 'verso', 'lateral_esquerda', 'lateral_direita', 'superior', 'inferior', 'tela', 'tampa_traseira', 'conector_carga', 'detalhe_defeito', 'outro'),
          allowNull: false,
          defaultValue: 'outro'
        }
      },
      { sequelize, tableName: 'diagnostico_fotos' }
    );
  }
}
