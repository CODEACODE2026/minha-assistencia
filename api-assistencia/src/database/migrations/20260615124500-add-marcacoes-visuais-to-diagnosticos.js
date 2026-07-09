'use strict';

async function columnExists(queryInterface, tableName, columnName) {
  try {
    const table = await queryInterface.describeTable(tableName);
    return Boolean(table[columnName]);
  } catch {
    return false;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, 'diagnosticos_entrada', 'marcacoes_visuais'))) {
      await queryInterface.addColumn('diagnosticos_entrada', 'marcacoes_visuais', {
        type: Sequelize.JSON,
        allowNull: true,
        after: 'checklist_funcional'
      });
    }
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, 'diagnosticos_entrada', 'marcacoes_visuais')) {
      await queryInterface.removeColumn('diagnosticos_entrada', 'marcacoes_visuais');
    }
  }
};
