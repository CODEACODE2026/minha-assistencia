import { Router } from 'express';

import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import authRoutes from './authRoutes';
import categoriaRoutes from './categoriaRoutes';
import clienteRoutes from './clienteRoutes';
import diagnosticoEntradaRoutes from './diagnosticoEntradaRoutes';
import estoqueRoutes from './estoqueRoutes';
import orcamentoRoutes from './orcamentoRoutes';
import produtoRoutes from './produtoRoutes';
import simuladorCompraRoutes from './simuladorCompraRoutes';
import termoEntregaRoutes from './termoEntregaRoutes';
import whatsappRoutes from './whatsappRoutes';

const routes = Router();
const authenticated = asyncHandler(authMiddleware);

routes.use('/auth', authRoutes);
routes.use('/categorias', authenticated, categoriaRoutes);
routes.use('/clientes', authenticated, clienteRoutes);
routes.use('/diagnosticos-entrada', authenticated, diagnosticoEntradaRoutes);
routes.use('/estoque', authenticated, estoqueRoutes);
routes.use('/produtos', authenticated, produtoRoutes);
routes.use('/orcamentos', authenticated, orcamentoRoutes);
routes.use('/simulador-compra', authenticated, simuladorCompraRoutes);
routes.use('/termos-entrega', authenticated, termoEntregaRoutes);
routes.use('/whatsapp', authenticated, whatsappRoutes);

export default routes;
