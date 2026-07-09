import { Router } from 'express';

import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import authRoutes from './authRoutes';
import categoriaRoutes from './categoriaRoutes';
import clienteRoutes from './clienteRoutes';
import dashboardRoutes from './dashboardRoutes';
import diagnosticoEntradaRoutes from './diagnosticoEntradaRoutes';
import estoqueRoutes from './estoqueRoutes';
import financeiroRoutes from './financeiroRoutes';
import orcamentoRoutes from './orcamentoRoutes';
import pdvRoutes from './pdvRoutes';
import produtoRoutes from './produtoRoutes';
import simuladorCompraRoutes from './simuladorCompraRoutes';
import termoEntregaRoutes from './termoEntregaRoutes';
import whatsappRoutes from './whatsappRoutes';

const routes = Router();
const authenticated = asyncHandler(authMiddleware);

routes.use('/auth', authRoutes);
routes.use('/categorias', authenticated, categoriaRoutes);
routes.use('/clientes', authenticated, clienteRoutes);
routes.use('/dashboard', authenticated, dashboardRoutes);
routes.use('/diagnosticos-entrada', authenticated, diagnosticoEntradaRoutes);
routes.use('/estoque', authenticated, estoqueRoutes);
routes.use('/financeiro', authenticated, financeiroRoutes);
routes.use('/produtos', authenticated, produtoRoutes);
routes.use('/orcamentos', authenticated, orcamentoRoutes);
routes.use('/pdv', authenticated, pdvRoutes);
routes.use('/simulador-compra', authenticated, simuladorCompraRoutes);
routes.use('/termos-entrega', authenticated, termoEntregaRoutes);
routes.use('/whatsapp', authenticated, whatsappRoutes);

export default routes;
