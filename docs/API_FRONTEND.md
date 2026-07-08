# Documentacao da API para o Frontend

Base URL em desenvolvimento:

```txt
http://localhost:3333
```

Todas as rotas, exceto `/health`, `/auth/admin` e `/auth/login`, exigem JWT:

```http
Authorization: Bearer SEU_TOKEN
Content-Type: application/json
```

## Padrao de resposta

Sucesso:

```json
{
  "success": true,
  "message": "Operacao realizada com sucesso",
  "data": {}
}
```

Erro:

```json
{
  "success": false,
  "message": "Dados invalidos",
  "errors": []
}
```

Codigos comuns:

- `200`: sucesso
- `201`: criado
- `400`: regra de negocio invalida
- `401`: token ausente, invalido ou expirado
- `404`: registro nao encontrado
- `409`: conflito, como email ja cadastrado
- `422`: validacao de campos
- `500`: erro interno

## Health

### GET /health

Verifica se a API esta online.

Resposta:

```json
{
  "success": true,
  "message": "API Minha Assistencia online"
}
```

## Auth

### POST /auth/admin

Cadastra usuario admin.

Body:

```json
{
  "nome": "Admin",
  "email": "admin@minhaassistencia.com",
  "senha": "123456"
}
```

Regras:

- `nome`: obrigatorio
- `email`: obrigatorio e valido
- `senha`: obrigatoria, minimo 6 caracteres

Resposta `201`:

```json
{
  "success": true,
  "message": "Usuario admin cadastrado",
  "data": {
    "id": 1,
    "nome": "Admin",
    "email": "admin@minhaassistencia.com",
    "role": "admin"
  }
}
```

### POST /auth/login

Autentica usuario e retorna JWT valido por 8 horas.

Body:

```json
{
  "email": "admin@minhaassistencia.com",
  "senha": "123456"
}
```

Resposta:

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "token": "jwt",
    "user": {
      "id": 1,
      "nome": "Admin",
      "email": "admin@minhaassistencia.com",
      "role": "admin"
    }
  }
}
```

## Clientes

Objeto cliente:

```json
{
  "id": 1,
  "nome": "Joao Silva",
  "telefone": "11999999999",
  "cpf": "000.000.000-00",
  "endereco": "Rua Exemplo, 123",
  "observacao": "Cliente recorrente",
  "createdAt": "2026-06-14T23:00:00.000Z",
  "updatedAt": "2026-06-14T23:00:00.000Z"
}
```

### POST /clientes

Body:

```json
{
  "nome": "Joao Silva",
  "telefone": "11999999999",
  "cpf": "000.000.000-00",
  "endereco": "Rua Exemplo, 123",
  "observacao": "Cliente recorrente"
}
```

Obrigatorios: `nome`, `telefone`.

Resposta `201`: cliente criado.

### GET /clientes

Lista clientes ordenados por nome.

Resposta: array de clientes em `data`.

### GET /clientes/:id

Busca cliente por id.

### PUT /clientes/:id

Atualiza cliente. Todos os campos sao opcionais.

Body:

```json
{
  "nome": "Joao Santos",
  "telefone": "11988888888",
  "cpf": null,
  "endereco": "Novo endereco",
  "observacao": "Nova observacao"
}
```

### DELETE /clientes/:id

Remove cliente.

Resposta:

```json
{
  "success": true,
  "message": "Cliente removido",
  "data": null
}
```

## Categorias

Objeto categoria:

```json
{
  "id": 1,
  "nome": "Peliculas",
  "descricao": "Peliculas de vidro e hidrogel",
  "ativo": true,
  "createdAt": "2026-06-14T23:00:00.000Z",
  "updatedAt": "2026-06-14T23:00:00.000Z"
}
```

### POST /categorias

Body:

```json
{
  "nome": "Peliculas",
  "descricao": "Peliculas de vidro e hidrogel",
  "ativo": true
}
```

Obrigatorio: `nome`.

Opcionais: `descricao`, `ativo`.

Resposta `201`: categoria criada.

### GET /categorias

Lista categorias ordenadas por nome.

### GET /categorias/:id

Busca categoria por id.

### PUT /categorias/:id

Atualiza categoria. Todos os campos sao opcionais.

Body:

```json
{
  "nome": "Pecas",
  "descricao": "Pecas para manutencao",
  "ativo": true
}
```

### DELETE /categorias/:id

Remove categoria.

Observacao: se houver produtos vinculados, retorna erro `400`:

```json
{
  "success": false,
  "message": "Categoria possui produtos vinculados"
}
```

## Produtos / Estoque

Objeto produto:

```json
{
  "id": 1,
  "nome": "Pelicula Redmi Note 12",
  "categoria": "Peliculas",
  "categoria_id": 1,
  "categoria_cadastro": {
    "id": 1,
    "nome": "Peliculas",
    "descricao": "Peliculas de vidro e hidrogel",
    "ativo": true,
    "createdAt": "2026-06-14T23:00:00.000Z",
    "updatedAt": "2026-06-14T23:00:00.000Z"
  },
  "modelo_aparelho": "Redmi Note 12",
  "marca_aparelho": "Xiaomi",
  "quantidade": 10,
  "preco_custo": "5.00",
  "preco_venda": "15.00",
  "localizacao_estoque": "Prateleira A, Caixa 2",
  "observacao": null,
  "createdAt": "2026-06-14T23:00:00.000Z",
  "updatedAt": "2026-06-14T23:00:00.000Z",
  "localizacao_formatada": "Pelicula Redmi Note 12 Redmi Note 12 esta na Prateleira A, Caixa 2"
}
```

### POST /produtos

Body com categoria cadastrada:

```json
{
  "nome": "Pelicula Redmi Note 12",
  "categoria_id": 1,
  "modelo_aparelho": "Redmi Note 12",
  "marca_aparelho": "Xiaomi",
  "quantidade": 10,
  "preco_custo": 5,
  "preco_venda": 15,
  "localizacao_estoque": "Prateleira A, Caixa 2",
  "observacao": null
}
```

Body usando categoria em texto, para compatibilidade:

```json
{
  "nome": "Cabo USB-C",
  "categoria": "Acessorios",
  "quantidade": 5,
  "preco_custo": 8,
  "preco_venda": 20
}
```

Obrigatorios:

- `nome`
- `categoria_id` ou `categoria`

Opcionais:

- `modelo_aparelho`
- `marca_aparelho`
- `quantidade`, padrao `0`
- `preco_custo`, padrao `0`
- `preco_venda`, padrao `0`
- `localizacao_estoque`
- `observacao`

Resposta `201`: produto criado.

### GET /produtos

Lista produtos ordenados por nome.

### GET /produtos/:id

Busca produto por id.

### PUT /produtos/:id

Atualiza produto. Todos os campos sao opcionais.

Body:

```json
{
  "categoria_id": 2,
  "quantidade": 12,
  "preco_venda": 18
}
```

### DELETE /produtos/:id

Remove produto.

### GET /produtos/buscar?termo=redmi

Busca por:

- nome do produto
- categoria em texto
- nome da categoria cadastrada
- modelo do aparelho
- marca do aparelho
- localizacao no estoque
- observacao

Query obrigatoria:

- `termo`: texto nao vazio

## Orcamentos

Status permitidos:

- `aberto`
- `aprovado`
- `recusado`
- `finalizado`

Objeto orcamento:

```json
{
  "id": 1,
  "cliente_id": 1,
  "aparelho": "iPhone 11",
  "defeito_relatado": "Tela quebrada",
  "servico": "Troca de tela",
  "pecas_usadas": [
    {
      "nome": "Tela iPhone 11",
      "quantidade": 1,
      "valor": 250
    }
  ],
  "valor_pecas": "250.00",
  "valor_mao_obra": "100.00",
  "desconto": "20.00",
  "valor_total": "330.00",
  "status": "aberto",
  "observacao": null,
  "createdAt": "2026-06-14T23:00:00.000Z",
  "updatedAt": "2026-06-14T23:00:00.000Z",
  "cliente": {
    "id": 1,
    "nome": "Joao Silva",
    "telefone": "11999999999"
  }
}
```

O campo `valor_total` e calculado pela API:

```txt
valor_pecas + valor_mao_obra - desconto
```

### POST /orcamentos

Body:

```json
{
  "cliente_id": 1,
  "aparelho": "iPhone 11",
  "defeito_relatado": "Tela quebrada",
  "servico": "Troca de tela",
  "pecas_usadas": [
    {
      "nome": "Tela iPhone 11",
      "quantidade": 1,
      "valor": 250
    }
  ],
  "valor_pecas": 250,
  "valor_mao_obra": 100,
  "desconto": 20,
  "status": "aberto",
  "observacao": "Cliente aprovou pelo WhatsApp"
}
```

Obrigatorios:

- `cliente_id`
- `aparelho`
- `defeito_relatado`
- `servico`

Opcionais:

- `pecas_usadas`: array
- `valor_pecas`, padrao `0`
- `valor_mao_obra`, padrao `0`
- `desconto`, padrao `0`
- `status`, padrao `aberto`
- `observacao`

Resposta `201`: orcamento criado.

### GET /orcamentos

Lista orcamentos ordenados por criacao mais recente, com dados do cliente.

### GET /orcamentos/:id

Busca orcamento por id, com dados do cliente.

### PUT /orcamentos/:id

Atualiza orcamento. Todos os campos sao opcionais. Ao atualizar valores, o `valor_total` e recalculado.

Body:

```json
{
  "status": "aprovado",
  "valor_mao_obra": 120,
  "desconto": 10
}
```

### DELETE /orcamentos/:id

Remove orcamento.

### GET /orcamentos/:id/pdf

Retorna um PDF do orcamento.

Headers da resposta:

```http
Content-Type: application/pdf
Content-Disposition: inline; filename=orcamento-1.pdf
```

Observacao para o front: essa rota nao retorna o envelope JSON. Trate como `blob`.

Exemplo com Axios:

```ts
const response = await api.get('/orcamentos/1/pdf', {
  responseType: 'blob'
});
```

## Simulador de Compra

Objeto simulacao:

```json
{
  "id": 1,
  "modelo_aparelho": "iPhone 11",
  "valor_compra": "500.00",
  "valor_frete": "30.00",
  "pecas_necessarias": [
    {
      "nome": "Tela",
      "valor": 250
    }
  ],
  "valor_total_pecas": "250.00",
  "outros_custos": "20.00",
  "margem_lucro_percentual": "30.00",
  "valor_venda_estimado": "1100.00",
  "custo_total": "800.00",
  "lucro_estimado": "300.00",
  "preco_minimo_recomendado": "1040.00",
  "margem_real_percentual": "37.50",
  "compensa_comprar": true,
  "createdAt": "2026-06-14T23:00:00.000Z",
  "updatedAt": "2026-06-14T23:00:00.000Z"
}
```

Calculos feitos pela API:

- `custo_total = valor_compra + valor_frete + valor_total_pecas + outros_custos`
- `lucro_estimado = valor_venda_estimado - custo_total`
- `preco_minimo_recomendado = custo_total * (1 + margem_lucro_percentual / 100)`
- `margem_real_percentual = lucro_estimado / custo_total * 100`
- `compensa_comprar = valor_venda_estimado >= preco_minimo_recomendado && lucro_estimado > 0`

### POST /simulador-compra

Body:

```json
{
  "modelo_aparelho": "iPhone 11",
  "valor_compra": 500,
  "valor_frete": 30,
  "pecas_necessarias": [
    {
      "nome": "Tela",
      "valor": 250
    }
  ],
  "valor_total_pecas": 250,
  "outros_custos": 20,
  "margem_lucro_percentual": 30,
  "valor_venda_estimado": 1100
}
```

Obrigatorios:

- `modelo_aparelho`
- `valor_compra`
- `margem_lucro_percentual`
- `valor_venda_estimado`

Opcionais:

- `valor_frete`, padrao `0`
- `pecas_necessarias`: array
- `valor_total_pecas`, padrao `0`
- `outros_custos`, padrao `0`

### GET /simulador-compra

Lista simulacoes ordenadas por criacao mais recente.

## WhatsApp Quepasa

### POST /whatsapp/enviar

Envia mensagem via Quepasa. Se `QUEPASA_BASE_URL` ou `QUEPASA_TOKEN` nao estiverem configurados, a API retorna uma resposta simulada.

Body:

```json
{
  "telefone": "5511999999999",
  "mensagem": "Ola, seu orcamento esta pronto."
}
```

Obrigatorios:

- `telefone`
- `mensagem`

Resposta sem Quepasa configurado:

```json
{
  "success": true,
  "message": "Processamento de envio concluido",
  "data": {
    "enviado": false,
    "provider": "quepasa",
    "message": "Integracao Quepasa ainda nao configurada",
    "telefone": "5511999999999",
    "mensagem": "Ola, seu orcamento esta pronto."
  }
}
```

### POST /whatsapp/webhook

Recebe webhook do Quepasa.

Body: qualquer JSON enviado pelo provedor.

Resposta:

```json
{
  "success": true,
  "message": "Webhook recebido",
  "data": {
    "recebido": true,
    "payload": {}
  }
}
```

## Resumo rapido de rotas

Publicas:

- `GET /health`
- `POST /auth/admin`
- `POST /auth/login`

Protegidas:

- `POST /clientes`
- `GET /clientes`
- `GET /clientes/:id`
- `PUT /clientes/:id`
- `DELETE /clientes/:id`
- `POST /categorias`
- `GET /categorias`
- `GET /categorias/:id`
- `PUT /categorias/:id`
- `DELETE /categorias/:id`
- `POST /produtos`
- `GET /produtos`
- `GET /produtos/:id`
- `PUT /produtos/:id`
- `DELETE /produtos/:id`
- `GET /produtos/buscar?termo=redmi`
- `POST /orcamentos`
- `GET /orcamentos`
- `GET /orcamentos/:id`
- `PUT /orcamentos/:id`
- `DELETE /orcamentos/:id`
- `GET /orcamentos/:id/pdf`
- `POST /simulador-compra`
- `GET /simulador-compra`
- `POST /whatsapp/enviar`
- `POST /whatsapp/webhook`
