import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const setupToken = process.env.SMOKE_ADMIN_SETUP_TOKEN || 'smoke-setup-token';
const password = process.env.SMOKE_ADMIN_PASSWORD || '123456';
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const marker = `smoke-critical-flows:${runId}`;
const warnings = [];
const created = {
  adminEmail: '',
  userId: null,
  clienteId: null,
  produtoId: null,
  orcamentoId: null,
  diagnosticoId: null,
  termoId: null
};

function dbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'minha_assistencia'
  };
}

function localChromiumPath() {
  const candidates = ['/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome-stable'];
  return candidates.find((candidate) => existsSync(candidate));
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHealth(baseUrl, child) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30000) {
    if (child.exitCode !== null) {
      throw new Error(`API encerrou antes do healthcheck. Exit code: ${child.exitCode}`);
    }

    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      await delay(500);
    }
  }

  throw new Error('Timeout aguardando /health');
}

async function request(baseUrl, route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.arrayBuffer();

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${route} retornou ${response.status}: ${JSON.stringify(data)}`);
  }

  return { response, data };
}

async function expectPdf(baseUrl, route, token, label) {
  const response = await fetch(`${baseUrl}${route}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`${label} retornou ${response.status}: ${message.slice(0, 300)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const bytes = await response.arrayBuffer();
  assert.match(contentType, /application\/pdf/, `${label} deve retornar PDF`);
  assert.ok(bytes.byteLength > 100, `${label} deve retornar PDF nao vazio`);
}

async function expectHttpStatus(baseUrl, route, expectedStatus, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    }
  });

  assert.equal(response.status, expectedStatus, `${options.method || 'GET'} ${route} deve retornar ${expectedStatus}`);
}

async function expectPaginatedList(baseUrl, route, token, label) {
  const result = await request(baseUrl, route, { token });
  assert.ok(!Array.isArray(result.data.data), `${label} paginado deve retornar objeto`);
  assert.ok(Array.isArray(result.data.data.items), `${label} paginado deve retornar items`);
  assert.equal(result.data.data.pagination.page, 1, `${label} paginado deve retornar page`);
  assert.equal(result.data.data.pagination.limit, 5, `${label} paginado deve retornar limit`);
  assert.ok(Number.isInteger(result.data.data.pagination.total), `${label} paginado deve retornar total`);
}

async function queryOne(connection, sql, params) {
  const [rows] = await connection.execute(sql, params);
  return rows[0] || null;
}

async function rowHasMarker(connection, table, id, column) {
  if (!id) {
    return false;
  }

  const row = await queryOne(connection, `SELECT ${column} FROM ${table} WHERE id = ?`, [id]);
  return Boolean(row && String(row[column] || '').includes(marker));
}

async function cleanupUploads() {
  const uploadDirs = [];

  if (created.diagnosticoId) {
    uploadDirs.push(path.resolve(process.cwd(), 'uploads', 'diagnosticos-entrada', String(created.diagnosticoId)));
  }

  if (created.termoId) {
    uploadDirs.push(path.resolve(process.cwd(), 'uploads', 'termos-entrega', String(created.termoId)));
  }

  for (const dir of uploadDirs) {
    await rm(dir, { recursive: true, force: true });
  }
}

async function cleanupDatabase() {
  const connection = await mysql.createConnection(dbConfig());
  const cleanup = {
    users: 0,
    clientes: 0,
    produtos: 0,
    orcamentos: 0,
    movimentacoes_estoque: 0,
    diagnosticos_entrada: 0,
    diagnostico_fotos: 0,
    termos_entrega: 0,
    termo_entrega_fotos: 0
  };

  try {
    await connection.beginTransaction();

    const ownsDiagnostico = await rowHasMarker(connection, 'diagnosticos_entrada', created.diagnosticoId, 'observacao_geral');
    const ownsTermo = await rowHasMarker(connection, 'termos_entrega', created.termoId, 'observacoes_entrega');
    const ownsOrcamento = await rowHasMarker(connection, 'orcamentos', created.orcamentoId, 'observacao');
    const ownsProduto = await rowHasMarker(connection, 'produtos', created.produtoId, 'observacao');
    const ownsCliente = await rowHasMarker(connection, 'clientes', created.clienteId, 'observacao');

    if (ownsTermo) {
      const [fotoResult] = await connection.execute('DELETE FROM termo_entrega_fotos WHERE termo_entrega_id = ?', [created.termoId]);
      cleanup.termo_entrega_fotos += fotoResult.affectedRows;
      const [termoResult] = await connection.execute('DELETE FROM termos_entrega WHERE id = ?', [created.termoId]);
      cleanup.termos_entrega += termoResult.affectedRows;
    }

    if (ownsDiagnostico) {
      const [fotoResult] = await connection.execute('DELETE FROM diagnostico_fotos WHERE diagnostico_id = ?', [created.diagnosticoId]);
      cleanup.diagnostico_fotos += fotoResult.affectedRows;
      const [diagnosticoResult] = await connection.execute('DELETE FROM diagnosticos_entrada WHERE id = ?', [created.diagnosticoId]);
      cleanup.diagnosticos_entrada += diagnosticoResult.affectedRows;
    }

    if (ownsOrcamento || ownsProduto) {
      const [movimentacaoResult] = await connection.execute(
        'DELETE FROM movimentacoes_estoque WHERE orcamento_id = ? OR produto_id = ? OR observacao LIKE ?',
        [created.orcamentoId || 0, created.produtoId || 0, `%${marker}%`]
      );
      cleanup.movimentacoes_estoque += movimentacaoResult.affectedRows;
    }

    if (ownsOrcamento) {
      const [orcamentoResult] = await connection.execute('DELETE FROM orcamentos WHERE id = ?', [created.orcamentoId]);
      cleanup.orcamentos += orcamentoResult.affectedRows;
    }

    if (ownsProduto) {
      const [produtoResult] = await connection.execute('DELETE FROM produtos WHERE id = ?', [created.produtoId]);
      cleanup.produtos += produtoResult.affectedRows;
    }

    if (ownsCliente) {
      const [clienteResult] = await connection.execute('DELETE FROM clientes WHERE id = ?', [created.clienteId]);
      cleanup.clientes += clienteResult.affectedRows;
    }

    if (created.adminEmail) {
      const [userResult] = await connection.execute('DELETE FROM users WHERE email = ? AND email LIKE ?', [
        created.adminEmail,
        'smoke-%@minhaassistencia.local'
      ]);
      cleanup.users += userResult.affectedRows;
    }

    await connection.commit();
    return cleanup;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

async function countResidues() {
  const connection = await mysql.createConnection(dbConfig());

  try {
    const checks = {
      users: created.adminEmail
        ? (await queryOne(connection, 'SELECT COUNT(*) count FROM users WHERE email = ?', [created.adminEmail])).count
        : 0,
      clientes: created.clienteId
        ? (await queryOne(connection, 'SELECT COUNT(*) count FROM clientes WHERE id = ? AND observacao LIKE ?', [created.clienteId, `%${marker}%`])).count
        : 0,
      produtos: created.produtoId
        ? (await queryOne(connection, 'SELECT COUNT(*) count FROM produtos WHERE id = ? AND observacao LIKE ?', [created.produtoId, `%${marker}%`])).count
        : 0,
      orcamentos: created.orcamentoId
        ? (await queryOne(connection, 'SELECT COUNT(*) count FROM orcamentos WHERE id = ? AND observacao LIKE ?', [created.orcamentoId, `%${marker}%`])).count
        : 0,
      movimentacoes_estoque:
        created.produtoId || created.orcamentoId
          ? (
              await queryOne(
                connection,
                'SELECT COUNT(*) count FROM movimentacoes_estoque WHERE orcamento_id = ? OR produto_id = ? OR observacao LIKE ?',
                [created.orcamentoId || 0, created.produtoId || 0, `%${marker}%`]
              )
            ).count
          : 0,
      diagnosticos_entrada: created.diagnosticoId
        ? (
            await queryOne(connection, 'SELECT COUNT(*) count FROM diagnosticos_entrada WHERE id = ? AND observacao_geral LIKE ?', [
              created.diagnosticoId,
              `%${marker}%`
            ])
          ).count
        : 0,
      diagnostico_fotos: created.diagnosticoId
        ? (await queryOne(connection, 'SELECT COUNT(*) count FROM diagnostico_fotos WHERE diagnostico_id = ?', [created.diagnosticoId])).count
        : 0,
      termos_entrega: created.termoId
        ? (
            await queryOne(connection, 'SELECT COUNT(*) count FROM termos_entrega WHERE id = ? AND observacoes_entrega LIKE ?', [
              created.termoId,
              `%${marker}%`
            ])
          ).count
        : 0,
      termo_entrega_fotos: created.termoId
        ? (await queryOne(connection, 'SELECT COUNT(*) count FROM termo_entrega_fotos WHERE termo_entrega_id = ?', [created.termoId])).count
        : 0
    };

    return Object.fromEntries(Object.entries(checks).map(([key, value]) => [key, Number(value)]));
  } finally {
    await connection.end();
  }
}

async function main() {
  const port = process.env.SMOKE_PORT || (await getFreePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH || localChromiumPath();
  const childEnv = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: String(port),
    ADMIN_SETUP_TOKEN: setupToken,
    CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3000',
    UPLOADS_PUBLIC: 'false'
  };

  if (chromiumPath) {
    childEnv.PUPPETEER_EXECUTABLE_PATH = chromiumPath;
  }

  const child = spawn(process.execPath, ['dist/server.js'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: childEnv
  });

  let logs = '';
  let cleanup = null;
  let residues = null;
  child.stdout.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk.toString();
  });

  try {
    await waitForHealth(baseUrl, child);

    created.adminEmail = `smoke-${runId}@minhaassistencia.local`;
    const admin = await request(baseUrl, '/auth/admin', {
      method: 'POST',
      headers: { 'x-admin-setup-token': setupToken },
      body: JSON.stringify({ nome: `Smoke Admin ${runId}`, email: created.adminEmail, senha: password })
    });
    created.userId = admin.data.data.id;

    const login = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: created.adminEmail, senha: password })
    });
    const token = login.data.data.token;
    assert.ok(token, 'login deve retornar token');

    const me = await request(baseUrl, '/auth/me', { token });
    assert.equal(me.data.data.user.email, created.adminEmail, '/auth/me deve retornar admin logado');

    const cliente = await request(baseUrl, '/clientes', {
      method: 'POST',
      token,
      body: JSON.stringify({
        nome: `Cliente Smoke ${runId}`,
        telefone: '11999999999',
        cpf: null,
        endereco: 'Endereco de smoke test',
        observacao: marker
      })
    });
    created.clienteId = cliente.data.data.id;
    assert.ok(created.clienteId, 'cliente deve ser criado');

    const clientes = await request(baseUrl, '/clientes', { token });
    assert.ok(Array.isArray(clientes.data.data), 'clientes deve retornar lista');
    await expectPaginatedList(baseUrl, '/clientes?page=1&limit=5', token, 'clientes');

    const produto = await request(baseUrl, '/produtos', {
      method: 'POST',
      token,
      body: JSON.stringify({
        nome: `Produto Smoke ${runId}`,
        categoria: 'Smoke',
        quantidade: 3,
        preco_custo: 10,
        preco_venda: 30,
        localizacao_estoque: 'Smoke A1',
        observacao: marker
      })
    });
    created.produtoId = produto.data.data.id;
    assert.ok(created.produtoId, 'produto deve ser criado');
    await expectPaginatedList(baseUrl, '/produtos?page=1&limit=5', token, 'produtos');

    await request(baseUrl, '/estoque/movimentacoes', {
      method: 'POST',
      token,
      body: JSON.stringify({
        produto_id: created.produtoId,
        tipo: 'entrada',
        quantidade: 2,
        observacao: marker
      })
    });

    const estoque = await request(baseUrl, `/estoque/movimentacoes?produto_id=${created.produtoId}`, { token });
    assert.ok(Array.isArray(estoque.data.data), 'movimentacoes de estoque deve retornar lista');
    assert.ok(estoque.data.data.length >= 1, 'estoque deve registrar movimentacao manual');

    const orcamento = await request(baseUrl, '/orcamentos', {
      method: 'POST',
      token,
      body: JSON.stringify({
        cliente_id: created.clienteId,
        aparelho: 'Aparelho Smoke',
        defeito_relatado: 'Nao liga',
        servico: 'Troca de componente',
        pecas_usadas: [{ produto_id: created.produtoId, nome: 'Peca Smoke', quantidade: 1, valor: 30 }],
        valor_pecas: 30,
        valor_mao_obra: 50,
        desconto: 0,
        status: 'aprovado',
        observacao: marker
      })
    });
    created.orcamentoId = orcamento.data.data.id;
    assert.ok(created.orcamentoId, 'orcamento/OS deve ser criado');
    await expectPaginatedList(baseUrl, '/orcamentos?page=1&limit=5', token, 'orcamentos');

    const movimentosOs = await request(baseUrl, `/estoque/movimentacoes?orcamento_id=${created.orcamentoId}`, { token });
    assert.ok(
      movimentosOs.data.data.some((movement) => movement.tipo === 'saida_os'),
      'OS aprovada deve gerar baixa de estoque'
    );

    await expectPdf(baseUrl, `/orcamentos/${created.orcamentoId}/pdf`, token, 'PDF de orcamento');

    const diagnostico = await request(baseUrl, '/diagnosticos-entrada', {
      method: 'POST',
      token,
      body: JSON.stringify({
        cliente_id: created.clienteId,
        aparelho: 'Aparelho Diagnostico Smoke',
        marca: 'Smoke',
        modelo: 'S1',
        cor: 'Preto',
        defeito_relatado: 'Tela quebrada',
        checklist_fisico: { tela: { status: 'com_avarias', observacao: 'Smoke' } },
        checklist_funcional: { liga: { status: 'ok', observacao: 'Smoke' } },
        observacao_geral: marker
      })
    });
    created.diagnosticoId = diagnostico.data.data.id;
    assert.ok(created.diagnosticoId, 'diagnostico deve ser criado');
    await expectPaginatedList(baseUrl, '/diagnosticos-entrada?page=1&limit=5', token, 'diagnosticos de entrada');
    await expectPaginatedList(baseUrl, `/diagnosticos-entrada?page=1&limit=5&termo=${encodeURIComponent(runId)}`, token, 'diagnosticos com termo');

    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

    await expectHttpStatus(baseUrl, `/diagnosticos-entrada/${created.diagnosticoId}/fotos`, 422, {
      method: 'POST',
      token,
      body: JSON.stringify({
        fotos: [{ arquivo_base64: 'data:text/plain;base64,c21va2U=', descricao: marker, tipo_foto: 'frente' }]
      })
    });

    await expectHttpStatus(baseUrl, `/diagnosticos-entrada/${created.diagnosticoId}/fotos`, 422, {
      method: 'POST',
      token,
      body: JSON.stringify({
        fotos: [
          {
            arquivo_base64: `data:image/png;base64,${Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64')}`,
            descricao: marker,
            tipo_foto: 'frente'
          }
        ]
      })
    });

    const fotos = await request(baseUrl, `/diagnosticos-entrada/${created.diagnosticoId}/fotos`, {
      method: 'POST',
      token,
      body: JSON.stringify({
        fotos: [{ arquivo_base64: tinyPng, descricao: marker, tipo_foto: 'frente' }]
      })
    });
    assert.equal(fotos.data.data.length, 1, 'diagnostico deve aceitar foto base64');

    const diagnosticoDetalhe = await request(baseUrl, `/diagnosticos-entrada/${created.diagnosticoId}`, { token });
    assert.ok(diagnosticoDetalhe.data.data.fotos.length >= 1, 'diagnostico deve listar foto salva');

    await expectPdf(baseUrl, `/diagnosticos-entrada/${created.diagnosticoId}/pdf`, token, 'PDF de diagnostico');

    await request(baseUrl, `/orcamentos/${created.orcamentoId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ status: 'finalizado', observacao: marker })
    });

    const termo = await request(baseUrl, '/termos-entrega', {
      method: 'POST',
      token,
      body: JSON.stringify({
        ordem_servico_id: created.orcamentoId,
        garantia_dias: 90,
        cobertura_garantia: 'Garantia smoke',
        servico_realizado: 'Servico smoke finalizado',
        testes_finais: { liga: { status: 'aprovado', observacao: 'Smoke' } },
        observacoes_entrega: marker
      })
    });
    created.termoId = termo.data.data.id;
    assert.ok(created.termoId, 'termo de entrega deve ser criado');

    await expectPdf(baseUrl, `/termos-entrega/${created.termoId}/pdf`, token, 'PDF de termo de entrega');

    console.log(
      JSON.stringify(
        {
          success: true,
          baseUrl,
          marker,
          puppeteerExecutablePath: chromiumPath || null,
          checked: [
            'auth/admin setup',
            'auth/login',
            'auth/me',
            'clientes',
            'produtos',
            'paginacao de produtos',
            'estoque manual',
            'orcamento/OS com baixa de estoque',
            'paginacao de clientes/orcamentos/diagnosticos',
            'PDF de orcamento',
            'diagnostico com foto',
            'validacao de tipo/tamanho de upload',
            'PDF de diagnostico',
            'termo de entrega',
            'PDF de termo de entrega'
          ],
          created,
          warnings
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(logs);
    console.error(error);
    process.exitCode = 1;
  } finally {
    try {
      cleanup = await cleanupDatabase();
      await cleanupUploads();
      residues = await countResidues();
      const residueTotal = Object.values(residues).reduce((total, count) => total + count, 0);
      if (residueTotal > 0) {
        process.exitCode = 1;
        console.error(JSON.stringify({ cleanup, residues }, null, 2));
      } else {
        console.log(JSON.stringify({ cleanup, residues }, null, 2));
      }
    } catch (cleanupError) {
      process.exitCode = 1;
      console.error('Falha no cleanup do smoke test');
      console.error(cleanupError);
    } finally {
      child.kill('SIGTERM');
    }
  }
}

await main();
