import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';

interface JwtPayload {
  sub: number;
  email: string;
  role: 'admin';
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError('Token nao informado', 401);
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    throw new AppError('Token invalido', 401);
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as unknown as JwtPayload;
    const user = await User.findByPk(decoded.sub);

    if (!user) {
      throw new AppError('Usuario nao encontrado', 401);
    }

    req.user = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role
    };

    return next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Token invalido ou expirado', 401);
  }
}
