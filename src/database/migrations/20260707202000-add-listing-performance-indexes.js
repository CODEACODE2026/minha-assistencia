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
  async up(queryInterface) {
    await addIndexIfMissing(queryInterface, 'clientes', ['nome'], 'idx_clientes_nome');
    await addIndexIfMissing(queryInterface, 'clientes', ['telefone'], 'idx_clientes_telefone');
    await addIndexIfMissing(queryInterface, 'produtos', ['nome'], 'idx_produtos_nome');
    await addIndexIfMissing(queryInterface, 'produtos', ['categoria_id'], 'idx_produtos_categoria_id');
    await addIndexIfMissing(queryInterface, 'produtos', ['quantidade'], 'idx_produtos_quantidade');
    await addIndexIfMissing(queryInterface, 'orcamentos', ['cliente_id'], 'idx_orcamentos_cliente_id');
    await addIndexIfMissing(queryInterface, 'orcamentos', ['status', 'created_at'], 'idx_orcamentos_status_created_at');
    await addIndexIfMissing(queryInterface, 'diagnosticos_entrada', ['cliente_id'], 'idx_diagnosticos_entrada_cliente_id');
    await addIndexIfMissing(queryInterface, 'diagnosticos_entrada', ['status', 'created_at'], 'idx_diagnosticos_entrada_status_created_at');
    await addIndexIfMissing(queryInterface, 'diagnosticos_entrada', ['aparelho'], 'idx_diagnosticos_entrada_aparelho');
  },

  async down(queryInterface) {
    await removeIndexIfExists(queryInterface, 'diagnosticos_entrada', 'idx_diagnosticos_entrada_aparelho');
    await removeIndexIfExists(queryInterface, 'diagnosticos_entrada', 'idx_diagnosticos_entrada_status_created_at');
    await removeIndexIfExists(queryInterface, 'diagnosticos_entrada', 'idx_diagnosticos_entrada_cliente_id');
    await removeIndexIfExists(queryInterface, 'orcamentos', 'idx_orcamentos_status_created_at');
    await removeIndexIfExists(queryInterface, 'orcamentos', 'idx_orcamentos_cliente_id');
    await removeIndexIfExists(queryInterface, 'produtos', 'idx_produtos_quantidade');
    await removeIndexIfExists(queryInterface, 'produtos', 'idx_produtos_categoria_id');
    await removeIndexIfExists(queryInterface, 'produtos', 'idx_produtos_nome');
    await removeIndexIfExists(queryInterface, 'clientes', 'idx_clientes_telefone');
    await removeIndexIfExists(queryInterface, 'clientes', 'idx_clientes_nome');
  }
};
