import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export type TesteFinalStatus = 'aprovado' | 'reprovado' | 'nao_testado';
export type TestesFinaisMap = Record<string, { status: TesteFinalStatus; observacao?: string | null }>;

export interface TermoEntregaAttributes {
  id: number;
  ordem_servico_id: number;
  cliente_id: number;
  usuario_id?: number | null;
  garantia_dias: number;
  cobertura_garantia?: string | null;
  servico_realizado: string;
  testes_finais?: TestesFinaisMap | null;
  observacoes_entrega?: string | null;
  data_entrega: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type TermoEntregaCreationAttributes = Optional<
  TermoEntregaAttributes,
  'id' | 'usuario_id' | 'garantia_dias' | 'cobertura_garantia' | 'testes_finais' | 'observacoes_entrega' | 'data_entrega'
>;

export class TermoEntrega extends Model<TermoEntregaAttributes, TermoEntregaCreationAttributes> implements TermoEntregaAttributes {
  declare id: number;
  declare ordem_servico_id: number;
  declare cliente_id: number;
  declare usuario_id: number | null;
  declare garantia_dias: number;
  declare cobertura_garantia: string | null;
  declare servico_realizado: string;
  declare testes_finais: TestesFinaisMap | null;
  declare observacoes_entrega: string | null;
  declare data_entrega: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    TermoEntrega.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        ordem_servico_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        cliente_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
        garantia_dias: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        cobertura_garantia: { type: DataTypes.TEXT, allowNull: true },
        servico_realizado: { type: DataTypes.TEXT, allowNull: false },
        testes_finais: { type: DataTypes.JSON, allowNull: true },
        observacoes_entrega: { type: DataTypes.TEXT, allowNull: true },
        data_entrega: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      },
      { sequelize, tableName: 'termos_entrega' }
    );
  }
}
