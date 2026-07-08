import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function readEnv(name: string, fallback?: string) {
  const value = process.env[name];

  if (value !== undefined && value !== '') {
    return value;
  }

  if (!isProduction && fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
}

function readNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    if (!isProduction) {
      return fallback;
    }

    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(`Variavel de ambiente invalida: ${name}`);
  }

  return value;
}

function parseOrigins(value: string) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function readCorsOrigins() {
  const fallbackOrigins = 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001';
  return parseOrigins(readEnv('CORS_ORIGINS', fallbackOrigins));
}

const jwtSecret = readEnv('JWT_SECRET', 'dev_secret');

if (isProduction && ['dev_secret', 'troque_esta_chave_em_producao'].includes(jwtSecret)) {
  throw new Error('JWT_SECRET inseguro para producao');
}

export const env = {
  isProduction,
  port: readNumberEnv('PORT', 3333),
  db: {
    host: readEnv('DB_HOST', 'localhost'),
    port: readNumberEnv('DB_PORT', 3306),
    user: readEnv('DB_USER', 'root'),
    pass: readEnv('DB_PASS', ''),
    name: readEnv('DB_NAME', 'minha_assistencia')
  },
  jwtSecret,
  corsOrigins: readCorsOrigins(),
  adminSetupToken: process.env.ADMIN_SETUP_TOKEN || '',
  uploadsPublic: process.env.UPLOADS_PUBLIC === 'true',
  quepasa: {
    baseUrl: process.env.QUEPASA_BASE_URL || '',
    token: process.env.QUEPASA_TOKEN || ''
  }
};
