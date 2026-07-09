'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('movimentacoes_estoque', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      produto_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'produtos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      orcamento_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'orcamentos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      tipo: {
        type: Sequelize.ENUM('entrada', 'saida_os', 'saida_venda', 'estorno_os', 'ajuste_manual'),
        allowNull: false
      },
      quantidade: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      estoque_anterior: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      estoque_atual: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      observacao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movimentacoes_estoque');
  }
};
