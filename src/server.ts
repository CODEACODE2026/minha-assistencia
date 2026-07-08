import app from './app';
import { env } from './config/env';
import { connectDatabase } from './database';

async function bootstrap() {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`API Minha Assistencia rodando na porta ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Erro ao iniciar a API:', error);
  process.exit(1);
});
