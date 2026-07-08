'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('termos_entrega', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      ordem_servico_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'orcamentos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
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
      garantia_dias: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      cobertura_garantia: { type: Sequelize.TEXT, allowNull: true },
      servico_realizado: { type: Sequelize.TEXT, allowNull: false },
      testes_finais: { type: Sequelize.JSON, allowNull: true },
      observacoes_entrega: { type: Sequelize.TEXT, allowNull: true },
      data_entrega: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.createTable('termo_entrega_fotos', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      termo_entrega_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'termos_entrega', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      foto: { type: Sequelize.STRING(255), allowNull: false },
      descricao: { type: Sequelize.STRING(255), allowNull: true },
      tipo_foto: { type: Sequelize.ENUM('frente', 'verso', 'lateral', 'servico_realizado', 'outra'), allowNull: false, defaultValue: 'outra' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('termo_entrega_fotos');
    await queryInterface.dropTable('termos_entrega');
  }
};
