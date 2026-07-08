# Checklist de Deploy - Minha Assistencia

Este checklist cobre deploy local/VPS da API e do frontend sem alterar regras de negocio.

## Pre-requisitos

- Node.js 20 ou superior.
- MySQL ou MariaDB ativo.
- Banco criado com charset `utf8mb4`.
- Variaveis de ambiente configuradas a partir dos arquivos `.env.example`.
- Portas liberadas conforme o proxy usado na VPS.
- Chrome/Chromium disponivel para PDFs gerados com Puppeteer.

## API

```bash
cd /opt/codeacode/repos/minha-assistencia/api-assistencia
npm ci
cp .env.example .env
npm run db:migrate
npm run build
npm start
```

Em producao, configure no `.env`:

```env
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=minha_assistencia
DB_PASS=senha_forte
DB_NAME=minha_assistencia
JWT_SECRET=chave_longa_e_segura
PORT=3333
CORS_ORIGINS=https://dominio-do-front
ADMIN_SETUP_TOKEN=token_forte_para_setup
UPLOADS_PUBLIC=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
QUEPASA_BASE_URL=
QUEPASA_TOKEN=
```

Validacoes rapidas:

```bash
curl http://127.0.0.1:3333/health
npm run db:migrate
npm run build
npm run test:smoke
```

## Frontend

```bash
cd /opt/codeacode/repos/minha-assistencia/front-assistencia
npm ci
cp .env.example .env.local
npm run build
npm start
```

Variavel minima:

```env
NEXT_PUBLIC_API_URL=https://dominio-da-api
```

## Ordem Recomendada na VPS

1. Atualizar codigo.
2. Rodar `npm ci` na API e no frontend.
3. Conferir `.env` da API e `.env.local` do frontend.
4. Rodar migrations da API.
5. Rodar build da API.
6. Rodar build do frontend.
7. Reiniciar processos com PM2 ou systemd.
8. Testar login, `/auth/me`, `/clientes`, CORS e `/uploads`.

## PM2

Exemplo API:

```bash
pm2 start npm --name minha-assistencia-api -- start
```

Exemplo frontend:

```bash
pm2 start npm --name minha-assistencia-front -- start
```

## Observacoes

- Nao use `JWT_SECRET` de exemplo em producao.
- Mantenha `UPLOADS_PUBLIC=false` por padrao.
- Configure `CORS_ORIGINS` com o dominio real do frontend.
- A criacao de admin exige `x-admin-setup-token` igual ao `ADMIN_SETUP_TOKEN`.
- PDFs de diagnostico e termo usam Puppeteer. Configure `PUPPETEER_EXECUTABLE_PATH` com o caminho real do Chrome/Chromium na VPS.
