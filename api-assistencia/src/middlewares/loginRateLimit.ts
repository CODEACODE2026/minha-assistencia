import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/AppError';

type Attempt = {
  count: number;
  firstAttemptAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  maxAttempts: number;
  message: string;
  keyFromRequest: (req: Request) => string;
};

function createMemoryRateLimit(options: RateLimitOptions) {
  const attempts = new Map<string, Attempt>();

  return function memoryRateLimit(req: Request, _res: Response, next: NextFunction) {
    const now = Date.now();
    const key = options.keyFromRequest(req);
    const current = attempts.get(key);

    if (!current || now - current.firstAttemptAt > options.windowMs) {
      attempts.set(key, { count: 1, firstAttemptAt: now });
      return next();
    }

    if (current.count >= options.maxAttempts) {
      throw new AppError(options.message, 429);
    }

    current.count += 1;
    attempts.set(key, current);
    return next();
  };
}

function loginKeyFromRequest(req: Request) {
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : 'unknown';
  return `${req.ip}:${email}`;
}

const ipKeyFromRequest = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';

export const apiRateLimit = createMemoryRateLimit({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 300,
  message: 'Muitas requisicoes. Tente novamente em alguns minutos.',
  keyFromRequest: ipKeyFromRequest
});

export const adminSetupRateLimit = createMemoryRateLimit({
  windowMs: 60 * 60 * 1000,
  maxAttempts: 10,
  message: 'Muitas tentativas de cadastro admin. Tente novamente mais tarde.',
  keyFromRequest: ipKeyFromRequest
});

export const loginRateLimit = createMemoryRateLimit({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
  keyFromRequest: loginKeyFromRequest
});
