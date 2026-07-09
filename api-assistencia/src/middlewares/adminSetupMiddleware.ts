import { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export function adminSetupMiddleware(req: Request, _res: Response, next: NextFunction) {
  const setupToken = req.header('x-admin-setup-token');

  if (!env.adminSetupToken) {
    throw new AppError('Cadastro publico de admin desabilitado', 403);
  }

  if (!setupToken || setupToken !== env.adminSetupToken) {
    throw new AppError('Token de setup invalido', 403);
  }

  return next();
}
