import type { Categoria, Cliente, DashboardSummary, DiagnosticoEntrada, DiagnosticoFoto, FinanceiroOrigem, FinanceiroPeriodo, FinanceiroSummary, MovimentacaoEstoque, MovimentacaoEstoqueTipo, Orcamento, OrcamentoStatus, PdvVendasResponse, Produto, SimulacaoCompra, TermoEntrega, TermoEntregaFoto, TestesFinaisEntrega, Venda, VendaFormaPagamento, VendaStatusFiltro } from "@/lib/types";
import type { CompanyProfile } from "@/lib/company-profile";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
};

export type LoginResponse = {
  token: string;
  user: {
    id: number;
    nome: string;
    email: string;
    role: string;
  };
};

export type ProdutoPayload = {
  nome?: string;
  categoria?: string | null;
  categoria_id?: number | null;
  modelo_aparelho?: string | null;
  marca_aparelho?: string | null;
  quantidade?: number;
  preco_custo?: number;
  preco_venda?: number;
  localizacao_estoque?: string | null;
  observacao?: string | null;
};

export type CategoriaPayload = {
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
};

export type ClientePayload = {
  nome?: string;
  telefone?: string;
  cpf?: string | null;
  endereco?: string | null;
  observacao?: string | null;
};

export type OrcamentoPayload = {
  cliente_id: number;
  aparelho: string;
  defeito_relatado: string;
  servico: string;
  pecas_usadas?: Array<{
    nome: string;
    quantidade: number;
    valor: number;
    produto_id?: number;
  }>;
  valor_pecas?: number;
  valor_mao_obra?: number;
  desconto?: number;
  status?: OrcamentoStatus;
  observacao?: string | null;
};

export type MovimentacaoEstoquePayload = {
  produto_id: number;
  tipo: Extract<MovimentacaoEstoqueTipo, "entrada" | "ajuste_manual">;
  quantidade: number;
  observacao?: string | null;
};

export type PdvVendaPayload = {
  cliente_id?: number | null;
  forma_pagamento: VendaFormaPagamento;
  desconto?: number;
  observacao?: string | null;
  itens: Array<{
    produto_id: number;
    quantidade: number;
  }>;
};

export type PdvCancelarVendaPayload = {
  motivo?: string | null;
};

export type PdvVendasParams = {
  status?: VendaStatusFiltro;
  inicio?: string;
  fim?: string;
  cliente_id?: number;
  page?: number;
  limit?: number;
};

export type SimulacaoCompraPayload = {
  modelo_aparelho: string;
  valor_compra: number;
  valor_frete?: number;
  pecas_necessarias?: Array<{
    nome: string;
    valor: number;
  }>;
  valor_total_pecas?: number;
  outros_custos?: number;
  margem_lucro_percentual: number;
  valor_venda_estimado: number;
};

export type DiagnosticoEntradaPayload = Omit<Partial<DiagnosticoEntrada>, "id" | "cliente" | "fotos" | "createdAt" | "updatedAt"> & {
  cliente_id: number;
  aparelho: string;
  defeito_relatado: string;
};

export type TermoEntregaPayload = {
  ordem_servico_id: number;
  garantia_dias: number;
  cobertura_garantia?: string | null;
  servico_realizado: string;
  testes_finais?: TestesFinaisEntrega;
  observacoes_entrega?: string | null;
  data_entrega?: string;
};

type FetchOptions = RequestInit & {
  token?: string;
};

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as Partial<ApiEnvelope<unknown>> | null;
    if (response.status === 401) {
      clearStoredAuth();
    }

    throw new ApiRequestError(error?.message ?? `API request failed: ${response.status}`, response.status);
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

export const apiRoutes = {
  health: "/health",
  registerAdmin: "/auth/admin",
  login: "/auth/login",
  authMe: "/auth/me",
  clientes: "/clientes",
  dashboard: "/dashboard",
  diagnosticosEntrada: "/diagnosticos-entrada",
  financeiro: "/financeiro",
  categorias: "/categorias",
  produtos: "/produtos",
  buscarProdutos: (termo: string) => `/produtos/buscar?termo=${encodeURIComponent(termo)}`,
  movimentacoesEstoque: "/estoque/movimentacoes",
  orcamentos: "/orcamentos",
  pdvVendas: "/pdv/vendas",
  simuladorCompra: "/simulador-compra",
  termosEntrega: "/termos-entrega",
  whatsappEnviar: "/whatsapp/enviar"
};

export const authStorageKey = "minha-assistencia:auth";

function isTokenExpired(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return true;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decoded = JSON.parse(window.atob(normalizedPayload)) as { exp?: number };
    if (!decoded.exp) {
      return false;
    }

    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function getStoredAuth(): LoginResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(authStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const auth = JSON.parse(raw) as Partial<LoginResponse>;
    if (!auth.token || isTokenExpired(auth.token)) {
      window.localStorage.removeItem(authStorageKey);
      return null;
    }

    return auth as LoginResponse;
  } catch {
    window.localStorage.removeItem(authStorageKey);
    return null;
  }
}

export function setStoredAuth(auth: LoginResponse) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(auth));
}

export function clearStoredAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(authStorageKey);
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}

export const api = {
  login: (payload: { email: string; senha: string }) =>
    apiFetch<LoginResponse>(apiRoutes.login, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  validarToken: (token: string) => apiFetch<{ user: LoginResponse["user"] }>(apiRoutes.authMe, { token }),
  dashboard: (token: string) => apiFetch<DashboardSummary>(apiRoutes.dashboard, { token }),
  financeiro: (token: string, params: { periodo?: FinanceiroPeriodo; origem?: FinanceiroOrigem; inicio?: string; fim?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.periodo) searchParams.set("periodo", params.periodo);
    if (params.origem) searchParams.set("origem", params.origem);
    if (params.inicio) searchParams.set("inicio", params.inicio);
    if (params.fim) searchParams.set("fim", params.fim);
    const query = searchParams.toString();
    return apiFetch<FinanceiroSummary>(`${apiRoutes.financeiro}${query ? `?${query}` : ""}`, { token });
  },
  clientes: (token: string) => apiFetch<Cliente[]>(apiRoutes.clientes, { token }),
  criarCliente: (token: string, payload: ClientePayload) =>
    apiFetch<Cliente>(apiRoutes.clientes, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  atualizarCliente: (token: string, id: number, payload: ClientePayload) =>
    apiFetch<Cliente>(`${apiRoutes.clientes}/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  removerCliente: (token: string, id: number) =>
    apiFetch<null>(`${apiRoutes.clientes}/${id}`, {
      method: "DELETE",
      token
    }),
  diagnosticosEntrada: (token: string, params: { termo?: string; status?: string; data?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.termo) searchParams.set("termo", params.termo);
    if (params.status) searchParams.set("status", params.status);
    if (params.data) searchParams.set("data", params.data);
    const query = searchParams.toString();
    return apiFetch<DiagnosticoEntrada[]>(`${apiRoutes.diagnosticosEntrada}${query ? `?${query}` : ""}`, { token });
  },
  diagnosticoEntrada: (token: string, id: number) => apiFetch<DiagnosticoEntrada>(`${apiRoutes.diagnosticosEntrada}/${id}`, { token }),
  criarDiagnosticoEntrada: (token: string, payload: DiagnosticoEntradaPayload) =>
    apiFetch<DiagnosticoEntrada>(apiRoutes.diagnosticosEntrada, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  atualizarDiagnosticoEntrada: (token: string, id: number, payload: DiagnosticoEntradaPayload) =>
    apiFetch<DiagnosticoEntrada>(`${apiRoutes.diagnosticosEntrada}/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  removerDiagnosticoEntrada: (token: string, id: number) =>
    apiFetch<null>(`${apiRoutes.diagnosticosEntrada}/${id}`, {
      method: "DELETE",
      token
    }),
  finalizarDiagnosticoEntrada: (token: string, id: number) =>
    apiFetch<DiagnosticoEntrada>(`${apiRoutes.diagnosticosEntrada}/${id}/finalizar`, {
      method: "POST",
      token
    }),
  cancelarDiagnosticoEntrada: (token: string, id: number) =>
    apiFetch<DiagnosticoEntrada>(`${apiRoutes.diagnosticosEntrada}/${id}/cancelar`, {
      method: "POST",
      token
    }),
  adicionarFotosDiagnosticoEntrada: (token: string, id: number, fotos: Array<{ arquivo_base64: string; descricao?: string | null; tipo_foto?: string }>) =>
    apiFetch<DiagnosticoFoto[]>(`${apiRoutes.diagnosticosEntrada}/${id}/fotos`, {
      method: "POST",
      token,
      body: JSON.stringify({ fotos })
    }),
  removerFotoDiagnosticoEntrada: (token: string, id: number, fotoId: number) =>
    apiFetch<null>(`${apiRoutes.diagnosticosEntrada}/${id}/fotos/${fotoId}`, {
      method: "DELETE",
      token
    }),
  diagnosticoEntradaPdf: async (token: string, id: number, company?: CompanyProfile) => {
    const response = await fetch(`${API_URL}${apiRoutes.diagnosticosEntrada}/${id}/pdf`, {
      method: company ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(company ? { "Content-Type": "application/json" } : {})
      },
      ...(company ? { body: JSON.stringify({ company }) } : {})
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as Partial<ApiEnvelope<unknown>> | null;
      throw new ApiRequestError(error?.message ?? `API request failed: ${response.status}`, response.status);
    }

    return response.blob();
  },
  categorias: (token: string) => apiFetch<Categoria[]>(apiRoutes.categorias, { token }),
  criarCategoria: (token: string, payload: CategoriaPayload) =>
    apiFetch<Categoria>(apiRoutes.categorias, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  atualizarCategoria: (token: string, id: number, payload: CategoriaPayload) =>
    apiFetch<Categoria>(`${apiRoutes.categorias}/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  removerCategoria: (token: string, id: number) =>
    apiFetch<null>(`${apiRoutes.categorias}/${id}`, {
      method: "DELETE",
      token
    }),
  produtos: (token: string) => apiFetch<Produto[]>(apiRoutes.produtos, { token }),
  buscarProdutos: (token: string, termo: string) => apiFetch<Produto[]>(apiRoutes.buscarProdutos(termo), { token }),
  criarProduto: (token: string, payload: ProdutoPayload) =>
    apiFetch<Produto>(apiRoutes.produtos, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  atualizarProduto: (token: string, id: number, payload: ProdutoPayload) =>
    apiFetch<Produto>(`${apiRoutes.produtos}/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  removerProduto: (token: string, id: number) =>
    apiFetch<null>(`${apiRoutes.produtos}/${id}`, {
      method: "DELETE",
      token
    }),
  movimentacoesEstoque: (token: string) => apiFetch<MovimentacaoEstoque[]>(apiRoutes.movimentacoesEstoque, { token }),
  criarMovimentacaoEstoque: (token: string, payload: MovimentacaoEstoquePayload) =>
    apiFetch<MovimentacaoEstoque>(apiRoutes.movimentacoesEstoque, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  orcamentos: (token: string) => apiFetch<Orcamento[]>(apiRoutes.orcamentos, { token }),
  orcamento: (token: string, id: number) => apiFetch<Orcamento>(`${apiRoutes.orcamentos}/${id}`, { token }),
  criarOrcamento: (token: string, payload: OrcamentoPayload) =>
    apiFetch<Orcamento>(apiRoutes.orcamentos, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  atualizarOrcamento: (token: string, id: number, payload: Partial<Orcamento>) =>
    apiFetch<Orcamento>(`${apiRoutes.orcamentos}/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  removerOrcamento: (token: string, id: number, options: { estornarEstoque?: boolean } = {}) =>
    apiFetch<null>(`${apiRoutes.orcamentos}/${id}?estornar_estoque=${options.estornarEstoque === false ? "false" : "true"}`, {
      method: "DELETE",
      token
    }),
  criarVendaPdv: (token: string, payload: PdvVendaPayload) =>
    apiFetch<Venda>(apiRoutes.pdvVendas, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  vendasPdv: (token: string, params: PdvVendasParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set("status", params.status);
    if (params.inicio) searchParams.set("inicio", params.inicio);
    if (params.fim) searchParams.set("fim", params.fim);
    if (params.cliente_id) searchParams.set("cliente_id", String(params.cliente_id));
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return apiFetch<PdvVendasResponse>(`${apiRoutes.pdvVendas}${query ? `?${query}` : ""}`, { token });
  },
  vendaPdv: (token: string, id: number) => apiFetch<Venda>(`${apiRoutes.pdvVendas}/${id}`, { token }),
  cancelarVendaPdv: (token: string, id: number, payload: PdvCancelarVendaPayload = {}) =>
    apiFetch<Venda>(`${apiRoutes.pdvVendas}/${id}/cancelar`, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  reciboVendaPdv: async (token: string, id: number) => {
    const response = await fetch(`${API_URL}${apiRoutes.pdvVendas}/${id}/recibo`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as Partial<ApiEnvelope<unknown>> | null;
      throw new ApiRequestError(error?.message ?? `API request failed: ${response.status}`, response.status);
    }

    return response.blob();
  },
  simulacoesCompra: (token: string) => apiFetch<SimulacaoCompra[]>(apiRoutes.simuladorCompra, { token }),
  criarSimulacaoCompra: (token: string, payload: SimulacaoCompraPayload) =>
    apiFetch<SimulacaoCompra>(apiRoutes.simuladorCompra, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  atualizarSimulacaoCompra: (token: string, id: number, payload: SimulacaoCompraPayload) =>
    apiFetch<SimulacaoCompra>(`${apiRoutes.simuladorCompra}/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  removerSimulacaoCompra: (token: string, id: number) =>
    apiFetch<null>(`${apiRoutes.simuladorCompra}/${id}`, {
      method: "DELETE",
      token
    }),
  termosEntrega: (token: string, params: { ordem_servico_id?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.ordem_servico_id) searchParams.set("ordem_servico_id", String(params.ordem_servico_id));
    const query = searchParams.toString();
    return apiFetch<TermoEntrega[]>(`${apiRoutes.termosEntrega}${query ? `?${query}` : ""}`, { token });
  },
  criarTermoEntrega: (token: string, payload: TermoEntregaPayload) =>
    apiFetch<TermoEntrega>(apiRoutes.termosEntrega, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  atualizarTermoEntrega: (token: string, id: number, payload: TermoEntregaPayload) =>
    apiFetch<TermoEntrega>(`${apiRoutes.termosEntrega}/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  adicionarFotosTermoEntrega: (token: string, id: number, fotos: Array<{ arquivo_base64: string; descricao?: string | null; tipo_foto?: string }>) =>
    apiFetch<TermoEntregaFoto[]>(`${apiRoutes.termosEntrega}/${id}/fotos`, {
      method: "POST",
      token,
      body: JSON.stringify({ fotos })
    }),
  termoEntregaPdf: async (token: string, id: number, company?: CompanyProfile) => {
    const response = await fetch(`${API_URL}${apiRoutes.termosEntrega}/${id}/pdf`, {
      method: company ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(company ? { "Content-Type": "application/json" } : {})
      },
      ...(company ? { body: JSON.stringify({ company }) } : {})
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as Partial<ApiEnvelope<unknown>> | null;
      throw new ApiRequestError(error?.message ?? `API request failed: ${response.status}`, response.status);
    }

    return response.blob();
  },
  enviarWhatsApp: (token: string, payload: { telefone: string; mensagem: string }) =>
    apiFetch<unknown>(apiRoutes.whatsappEnviar, {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    })
};
