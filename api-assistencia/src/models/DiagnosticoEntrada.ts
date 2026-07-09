import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export type DiagnosticoEntradaStatus = 'aberto' | 'finalizado' | 'cancelado';
export type ChecklistValue = 'ok' | 'com_problema' | 'nao_testado' | 'nao_possui';
export type ChecklistMap = Record<string, { status: ChecklistValue; observacao?: string | null }>;

export interface DiagnosticoEntradaAttributes {
  id: number;
  cliente_id: number;
  usuario_id?: number | null;
  aparelho: string;
  marca?: string | null;
  modelo?: string | null;
  cor?: string | null;
  imei?: string | null;
  senha_desbloqueio?: string | null;
  possui_chip: boolean;
  possui_cartao_memoria: boolean;
  possui_capinha: boolean;
  possui_pelicula: boolean;
  acompanha_carregador: boolean;
  acompanha_cabo: boolean;
  acompanha_caixa: boolean;
  acompanha_nota_fiscal: boolean;
  defeito_relatado: string;
  observacao_geral?: string | null;
  checklist_fisico?: ChecklistMap | null;
  checklist_funcional?: ChecklistMap | null;
  marcacoes_visuais?: unknown[] | null;
  status: DiagnosticoEntradaStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

type DiagnosticoEntradaCreationAttributes = Optional<
  DiagnosticoEntradaAttributes,
  | 'id'
  | 'usuario_id'
  | 'marca'
  | 'modelo'
  | 'cor'
  | 'imei'
  | 'senha_desbloqueio'
  | 'possui_chip'
  | 'possui_cartao_memoria'
  | 'possui_capinha'
  | 'possui_pelicula'
  | 'acompanha_carregador'
  | 'acompanha_cabo'
  | 'acompanha_caixa'
  | 'acompanha_nota_fiscal'
  | 'observacao_geral'
  | 'checklist_fisico'
  | 'checklist_funcional'
  | 'marcacoes_visuais'
  | 'status'
>;

export class DiagnosticoEntrada extends Model<DiagnosticoEntradaAttributes, DiagnosticoEntradaCreationAttributes> implements DiagnosticoEntradaAttributes {
  declare id: number;
  declare cliente_id: number;
  declare usuario_id: number | null;
  declare aparelho: string;
  declare marca: string | null;
  declare modelo: string | null;
  declare cor: string | null;
  declare imei: string | null;
  declare senha_desbloqueio: string | null;
  declare possui_chip: boolean;
  declare possui_cartao_memoria: boolean;
  declare possui_capinha: boolean;
  declare possui_pelicula: boolean;
  declare acompanha_carregador: boolean;
  declare acompanha_cabo: boolean;
  declare acompanha_caixa: boolean;
  declare acompanha_nota_fiscal: boolean;
  declare defeito_relatado: string;
  declare observacao_geral: string | null;
  declare checklist_fisico: ChecklistMap | null;
  declare checklist_funcional: ChecklistMap | null;
  declare marcacoes_visuais: unknown[] | null;
  declare status: DiagnosticoEntradaStatus;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize) {
    DiagnosticoEntrada.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        cliente_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
        aparelho: { type: DataTypes.STRING(140), allowNull: false },
        marca: { type: DataTypes.STRING(80), allowNull: true },
        modelo: { type: DataTypes.STRING(100), allowNull: true },
        cor: { type: DataTypes.STRING(60), allowNull: true },
        imei: { type: DataTypes.STRING(30), allowNull: true },
        senha_desbloqueio: { type: DataTypes.STRING(120), allowNull: true },
        possui_chip: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        possui_cartao_memoria: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        possui_capinha: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        possui_pelicula: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        acompanha_carregador: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        acompanha_cabo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        acompanha_caixa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        acompanha_nota_fiscal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        defeito_relatado: { type: DataTypes.TEXT, allowNull: false },
        observacao_geral: { type: DataTypes.TEXT, allowNull: true },
        checklist_fisico: { type: DataTypes.JSON, allowNull: true },
        checklist_funcional: { type: DataTypes.JSON, allowNull: true },
        marcacoes_visuais: { type: DataTypes.JSON, allowNull: true },
        status: { type: DataTypes.ENUM('aberto', 'finalizado', 'cancelado'), allowNull: false, defaultValue: 'aberto' }
      },
      { sequelize, tableName: 'diagnosticos_entrada' }
    );
  }
}
