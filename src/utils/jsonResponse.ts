import { Response } from 'express';

export function successResponse(res: Response, data: unknown, message = 'Operacao realizada com sucesso', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}
