'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('clientes', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      nome: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      telefone: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      cpf: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      endereco: {
        type: Sequelize.STRING(255),
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
    await queryInterface.dropTable('clientes');
  }
};
