'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('simulador_compras', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      modelo_aparelho: {
        type: Sequelize.STRING(140),
        allowNull: false
      },
      valor_compra: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      valor_frete: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      pecas_necessarias: {
        type: Sequelize.JSON,
        allowNull: true
      },
      valor_total_pecas: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      outros_custos: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      margem_lucro_percentual: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_venda_estimado: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      custo_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      lucro_estimado: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      preco_minimo_recomendado: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      margem_real_percentual: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      compensa_comprar: {
        type: Sequelize.BOOLEAN,
        allowNull: false
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
    await queryInterface.dropTable('simulador_compras');
  }
};
