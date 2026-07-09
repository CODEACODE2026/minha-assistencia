# Minha Assistencia API

API backend em Node.js, Express, TypeScript, Sequelize e MySQL/MariaDB para controle de assistencia tecnica de celulares.

## Requisitos

- Node.js 20 ou superior
- MySQL ou MariaDB
- NPM

## Instalação

```bash
npm install
```

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Configure as variaveis:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=minha_assistencia
JWT_SECRET=troque_esta_chave_em_producao
PORT=3333
QUEPASA_BASE_URL=https://seu-servidor-quepasa.com
QUEPASA_TOKEN=seu_token_quepasa
CORS_ORIGINS=http://localhost:3000,https://seu-front.vercel.app
ADMIN_SETUP_TOKEN=troque_este_token_de_setup
UPLOADS_PUBLIC=false
```

Crie o banco no MySQL/MariaDB:

```sql
CREATE DATABASE minha_assistencia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Rode as migrations:

```bash
npm run db:migrate
```

Inicie em desenvolvimento:

```bash
npm run dev
```

Build e produção:

```bash
npm run build
npm start
```

Desfazer a ultima migration:

```bash
npm run db:undo
```

## Rotas

### Auth

- `POST /auth/admin`: cadastra usuario admin
- `POST /auth/login`: retorna JWT
- `GET /auth/me`: retorna usuario autenticado

Exemplo de login:

```json
{
  "email": "admin@minhaassistencia.com",
  "senha": "123456"
}
```

Use o token nas demais rotas:

```http
Authorization: Bearer seu_token
```

### Clientes

- `POST /clientes`
- `GET /clientes`
- `GET /clientes/:id`
- `PUT /clientes/:id`
- `DELETE /clientes/:id`

### Categorias

- `POST /categorias`
- `GET /categorias`
- `GET /categorias/:id`
- `PUT /categorias/:id`
- `DELETE /categorias/:id`

Exemplo:

```json
{
  "nome": "Peliculas",
  "descricao": "Peliculas de vidro e hidrogel",
  "ativo": true
}
```

### Produtos / Estoque

- `POST /produtos`
- `GET /produtos`
- `GET /produtos/:id`
- `PUT /produtos/:id`
- `DELETE /produtos/:id`
- `GET /produtos/buscar?termo=redmi`

Produtos podem ser vinculados a uma categoria cadastrada usando `categoria_id`:

```json
{
  "nome": "Pelicula Redmi Note 12",
  "categoria_id": 1,
  "quantidade": 10,
  "preco_custo": 5,
  "preco_venda": 15
}
```

O campo `localizacao_estoque` permite salvar descricoes como `Prateleira A, Caixa 2`. A API tambem retorna `localizacao_formatada`, por exemplo: `Pelicula Redmi Note 12 esta na Prateleira A, Caixa 2`.

### Orcamentos

- `POST /orcamentos`
- `GET /orcamentos`
- `GET /orcamentos/:id`
- `PUT /orcamentos/:id`
- `DELETE /orcamentos/:id`
- `GET /orcamentos/:id/pdf`

`valor_total` e calculado pela API:

```txt
valor_pecas + valor_mao_obra - desconto
```

### Simulador de compra

- `POST /simulador-compra`
- `GET /simulador-compra`

A rota calcula:

- `custo_total`
- `lucro_estimado`
- `preco_minimo_recomendado`
- `margem_real_percentual`
- `compensa_comprar`

### WhatsApp Quepasa

- `POST /whatsapp/enviar`
- `POST /whatsapp/webhook`

Quando `QUEPASA_BASE_URL` e `QUEPASA_TOKEN` nao estiverem configurados, a API retorna uma resposta simulada para manter o fluxo pronto para integracao.

## Estrutura

```txt
src/
  config/
  controllers/
  database/
    migrations/
  middlewares/
  models/
  routes/
    validators/
  services/
  types/
  utils/
```

## Observacoes de seguranca

- Troque `JWT_SECRET` em producao.
- Configure `CORS_ORIGINS` com os dominios autorizados do frontend.
- Mantenha `UPLOADS_PUBLIC=false` por padrao para proteger arquivos enviados.
- A rota `POST /auth/admin` exige o header `x-admin-setup-token` igual ao `ADMIN_SETUP_TOKEN`.
