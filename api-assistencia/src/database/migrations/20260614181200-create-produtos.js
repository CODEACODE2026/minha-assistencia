'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('produtos', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      nome: {
        type: Sequelize.STRING(140),
        allowNull: false
      },
      categoria: {
        type: Sequelize.STRING(80),
        allowNull: false
      },
      modelo_aparelho: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      marca_aparelho: {
        type: Sequelize.STRING(80),
        allowNull: true
      },
      quantidade: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      preco_custo: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      preco_venda: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      localizacao_estoque: {
        type: Sequelize.STRING(160),
        allowNull: true
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
    await queryInterface.dropTable('produtos');
  }
};
