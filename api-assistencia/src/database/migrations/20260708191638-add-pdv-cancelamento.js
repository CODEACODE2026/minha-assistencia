'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('movimentacoes_estoque', 'tipo', {
      type: Sequelize.ENUM('entrada', 'saida_os', 'saida_venda', 'estorno_os', 'estorno_venda', 'ajuste_manual'),
      allowNull: false
    });

    await queryInterface.addColumn('vendas', 'cancelado_em', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('vendas', 'motivo_cancelamento', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('vendas', 'cancelado_por_usuario_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('vendas', 'cancelado_por_usuario_id');
    await queryInterface.removeColumn('vendas', 'motivo_cancelamento');
    await queryInterface.removeColumn('vendas', 'cancelado_em');

    await queryInterface.changeColumn('movimentacoes_estoque', 'tipo', {
      type: Sequelize.ENUM('entrada', 'saida_os', 'saida_venda', 'estorno_os', 'ajuste_manual'),
      allowNull: false
    });
  }
};
