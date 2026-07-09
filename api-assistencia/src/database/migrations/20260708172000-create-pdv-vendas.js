'use strict';

async function addIndexIfMissing(queryInterface, tableName, fields, name) {
  const indexes = await queryInterface.showIndex(tableName);
  if (!indexes.some((index) => index.name === name)) {
    await queryInterface.addIndex(tableName, fields, { name });
  }
}

async function removeIndexIfExists(queryInterface, tableName, name) {
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === name)) {
    await queryInterface.removeIndex(tableName, name);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vendas', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      cliente_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'clientes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      usuario_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      desconto: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      forma_pagamento: {
        type: Sequelize.ENUM('pix', 'credito', 'debito', 'dinheiro', 'outro'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('concluida', 'cancelada'),
        allowNull: false,
        defaultValue: 'concluida'
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

    await queryInterface.createTable('venda_itens', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      venda_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'vendas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      produto_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'produtos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      nome_produto_snapshot: {
        type: Sequelize.STRING(140),
        allowNull: false
      },
      quantidade: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      valor_unitario: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      valor_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      custo_unitario_snapshot: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
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

    await queryInterface.addColumn('movimentacoes_estoque', 'venda_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'vendas', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('movimentacoes_estoque', 'venda_item_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'venda_itens', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await addIndexIfMissing(queryInterface, 'vendas', ['cliente_id'], 'idx_vendas_cliente_id');
    await addIndexIfMissing(queryInterface, 'vendas', ['usuario_id'], 'idx_vendas_usuario_id');
    await addIndexIfMissing(queryInterface, 'vendas', ['status', 'created_at'], 'idx_vendas_status_created_at');
    await addIndexIfMissing(queryInterface, 'vendas', ['forma_pagamento', 'created_at'], 'idx_vendas_forma_pagamento_created_at');
    await addIndexIfMissing(queryInterface, 'venda_itens', ['venda_id'], 'idx_venda_itens_venda_id');
    await addIndexIfMissing(queryInterface, 'venda_itens', ['produto_id'], 'idx_venda_itens_produto_id');
    await addIndexIfMissing(queryInterface, 'movimentacoes_estoque', ['venda_id'], 'idx_movimentacoes_estoque_venda_id');
    await addIndexIfMissing(queryInterface, 'movimentacoes_estoque', ['venda_item_id'], 'idx_movimentacoes_estoque_venda_item_id');
  },

  async down(queryInterface) {
    await removeIndexIfExists(queryInterface, 'movimentacoes_estoque', 'idx_movimentacoes_estoque_venda_item_id');
    await removeIndexIfExists(queryInterface, 'movimentacoes_estoque', 'idx_movimentacoes_estoque_venda_id');
    await queryInterface.removeColumn('movimentacoes_estoque', 'venda_item_id');
    await queryInterface.removeColumn('movimentacoes_estoque', 'venda_id');
    await removeIndexIfExists(queryInterface, 'venda_itens', 'idx_venda_itens_produto_id');
    await removeIndexIfExists(queryInterface, 'venda_itens', 'idx_venda_itens_venda_id');
    await removeIndexIfExists(queryInterface, 'vendas', 'idx_vendas_forma_pagamento_created_at');
    await removeIndexIfExists(queryInterface, 'vendas', 'idx_vendas_status_created_at');
    await removeIndexIfExists(queryInterface, 'vendas', 'idx_vendas_usuario_id');
    await removeIndexIfExists(queryInterface, 'vendas', 'idx_vendas_cliente_id');
    await queryInterface.dropTable('venda_itens');
    await queryInterface.dropTable('vendas');
  }
};
