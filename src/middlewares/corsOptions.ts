import { CorsOptions } from 'cors';

import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError('Origem nao autorizada pelo CORS', 403));
  },
  credentials: true
};
