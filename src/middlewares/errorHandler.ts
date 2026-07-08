import { ErrorRequestHandler } from 'express';
import { ValidationError } from 'sequelize';

import { AppError } from '../utils/AppError';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors
    });
  }

  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validacao',
      errors: error.errors.map((item) => ({
        field: item.path,
        message: item.message
      }))
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
};
