'use strict';

async function tableExists(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'diagnosticos_entrada'))) {
      await queryInterface.createTable('diagnosticos_entrada', {
        id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
        cliente_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'clientes', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        usuario_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        aparelho: { type: Sequelize.STRING(140), allowNull: false },
        marca: { type: Sequelize.STRING(80), allowNull: true },
        modelo: { type: Sequelize.STRING(100), allowNull: true },
        cor: { type: Sequelize.STRING(60), allowNull: true },
        imei: { type: Sequelize.STRING(30), allowNull: true },
        senha_desbloqueio: { type: Sequelize.STRING(120), allowNull: true },
        possui_chip: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        possui_cartao_memoria: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        possui_capinha: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        possui_pelicula: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        acompanha_carregador: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        acompanha_cabo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        acompanha_caixa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        acompanha_nota_fiscal: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        defeito_relatado: { type: Sequelize.TEXT, allowNull: false },
        observacao_geral: { type: Sequelize.TEXT, allowNull: true },
        checklist_fisico: { type: Sequelize.JSON, allowNull: true },
        checklist_funcional: { type: Sequelize.JSON, allowNull: true },
        status: { type: Sequelize.ENUM('aberto', 'finalizado', 'cancelado'), allowNull: false, defaultValue: 'aberto' },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false }
      });
    }

    if (!(await tableExists(queryInterface, 'diagnostico_fotos'))) {
      await queryInterface.createTable('diagnostico_fotos', {
        id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true },
        diagnostico_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'diagnosticos_entrada', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        caminho_arquivo: { type: Sequelize.STRING(255), allowNull: false },
        descricao: { type: Sequelize.STRING(255), allowNull: true },
        tipo_foto: {
          type: Sequelize.ENUM('frente', 'verso', 'lateral_esquerda', 'lateral_direita', 'superior', 'inferior', 'tela', 'tampa_traseira', 'conector_carga', 'detalhe_defeito', 'outro'),
          allowNull: false,
          defaultValue: 'outro'
        },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false }
      });
    }
  },

  async down() {}
};
