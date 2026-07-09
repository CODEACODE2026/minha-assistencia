import cors from 'cors';
import express from 'express';
import path from 'path';

import { env } from './config/env';
import { authMiddleware } from './middlewares/authMiddleware';
import { corsOptions } from './middlewares/corsOptions';
import { errorHandler } from './middlewares/errorHandler';
import { apiRateLimit } from './middlewares/loginRateLimit';
import routes from './routes';
import { asyncHandler } from './utils/asyncHandler';

const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: '12mb' }));
app.use(
  '/uploads',
  env.uploadsPublic ? express.static(path.resolve(process.cwd(), 'uploads')) : asyncHandler(authMiddleware),
  express.static(path.resolve(process.cwd(), 'uploads'))
);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API Minha Assistencia online' });
});

app.use(apiRateLimit);
app.use(routes);
app.use(errorHandler);

export default app;
