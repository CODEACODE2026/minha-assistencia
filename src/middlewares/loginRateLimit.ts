import { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/AppError';

type Attempt = {
  count: number;
  firstAttemptAt: number;
};

const attempts = new Map<string, Attempt>();
const windowMs = 15 * 60 * 1000;
const maxAttempts = 5;

function keyFromRequest(req: Request) {
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : 'unknown';
  return `${req.ip}:${email}`;
}

export function loginRateLimit(req: Request, _res: Response, next: NextFunction) {
  const now = Date.now();
  const key = keyFromRequest(req);
  const current = attempts.get(key);

  if (!current || now - current.firstAttemptAt > windowMs) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
    return next();
  }

  if (current.count >= maxAttempts) {
    throw new AppError('Muitas tentativas de login. Tente novamente em alguns minutos.', 429);
  }

  current.count += 1;
  attempts.set(key, current);
  return next();
}
