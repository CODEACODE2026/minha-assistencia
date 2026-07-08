import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

import { AppError } from '../utils/AppError';

export function validateRequest(req: Request, _res: Response, next: NextFunction) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    throw new AppError('Dados invalidos', 422, result.array());
  }

  return next();
}
