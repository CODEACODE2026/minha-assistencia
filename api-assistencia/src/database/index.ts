import { Categoria } from '../models/Categoria';
import { Cliente } from '../models/Cliente';
import { DiagnosticoEntrada } from '../models/DiagnosticoEntrada';
import { DiagnosticoFoto } from '../models/DiagnosticoFoto';
import { MovimentacaoEstoque } from '../models/MovimentacaoEstoque';
import { Orcamento } from '../models/Orcamento';
import { Produto } from '../models/Produto';
import { SimuladorCompra } from '../models/SimuladorCompra';
import { TermoEntrega } from '../models/TermoEntrega';
import { TermoEntregaFoto } from '../models/TermoEntregaFoto';
import { User } from '../models/User';
import { Venda } from '../models/Venda';
import { VendaItem } from '../models/VendaItem';
import { sequelize } from './sequelize';

export function initModels() {
  User.initModel(sequelize);
  Categoria.initModel(sequelize);
  Cliente.initModel(sequelize);
  Produto.initModel(sequelize);
  Orcamento.initModel(sequelize);
  DiagnosticoEntrada.initModel(sequelize);
  DiagnosticoFoto.initModel(sequelize);
  MovimentacaoEstoque.initModel(sequelize);
  SimuladorCompra.initModel(sequelize);
  TermoEntrega.initModel(sequelize);
  TermoEntregaFoto.initModel(sequelize);
  Venda.initModel(sequelize);
  VendaItem.initModel(sequelize);

  Cliente.hasMany(Orcamento, { foreignKey: 'cliente_id', as: 'orcamentos' });
  Orcamento.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
  Cliente.hasMany(DiagnosticoEntrada, { foreignKey: 'cliente_id', as: 'diagnosticos_entrada' });
  DiagnosticoEntrada.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
  DiagnosticoEntrada.hasMany(DiagnosticoFoto, { foreignKey: 'diagnostico_id', as: 'fotos' });
  DiagnosticoFoto.belongsTo(DiagnosticoEntrada, { foreignKey: 'diagnostico_id', as: 'diagnostico' });
  Categoria.hasMany(Produto, { foreignKey: 'categoria_id', as: 'produtos' });
  Produto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria_cadastro' });
  Produto.hasMany(MovimentacaoEstoque, { foreignKey: 'produto_id', as: 'movimentacoes' });
  MovimentacaoEstoque.belongsTo(Produto, { foreignKey: 'produto_id', as: 'produto' });
  Orcamento.hasMany(MovimentacaoEstoque, { foreignKey: 'orcamento_id', as: 'movimentacoes_estoque' });
  MovimentacaoEstoque.belongsTo(Orcamento, { foreignKey: 'orcamento_id', as: 'orcamento' });
  Cliente.hasMany(Venda, { foreignKey: 'cliente_id', as: 'vendas' });
  Venda.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
  User.hasMany(Venda, { foreignKey: 'usuario_id', as: 'vendas' });
  Venda.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });
  Venda.hasMany(VendaItem, { foreignKey: 'venda_id', as: 'itens' });
  VendaItem.belongsTo(Venda, { foreignKey: 'venda_id', as: 'venda' });
  Produto.hasMany(VendaItem, { foreignKey: 'produto_id', as: 'venda_itens' });
  VendaItem.belongsTo(Produto, { foreignKey: 'produto_id', as: 'produto' });
  Venda.hasMany(MovimentacaoEstoque, { foreignKey: 'venda_id', as: 'movimentacoes_estoque' });
  MovimentacaoEstoque.belongsTo(Venda, { foreignKey: 'venda_id', as: 'venda' });
  VendaItem.hasMany(MovimentacaoEstoque, { foreignKey: 'venda_item_id', as: 'movimentacoes_estoque' });
  MovimentacaoEstoque.belongsTo(VendaItem, { foreignKey: 'venda_item_id', as: 'venda_item' });
  Orcamento.hasMany(TermoEntrega, { foreignKey: 'ordem_servico_id', as: 'termos_entrega' });
  TermoEntrega.belongsTo(Orcamento, { foreignKey: 'ordem_servico_id', as: 'ordem_servico' });
  Cliente.hasMany(TermoEntrega, { foreignKey: 'cliente_id', as: 'termos_entrega' });
  TermoEntrega.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
  TermoEntrega.hasMany(TermoEntregaFoto, { foreignKey: 'termo_entrega_id', as: 'fotos' });
  TermoEntregaFoto.belongsTo(TermoEntrega, { foreignKey: 'termo_entrega_id', as: 'termo_entrega' });
}

export async function connectDatabase() {
  initModels();
  await sequelize.authenticate();
}

export { sequelize };
