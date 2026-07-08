export type ServiceOrderStatus =
  | "Recebido"
  | "Em Análise"
  | "Aguardando Peça"
  | "Em Reparo"
  | "Finalizado";

export type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  cpf?: string | null;
  endereco?: string | null;
  observacao?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Categoria = {
  id: number;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Produto = {
  id: number;
  nome: string;
  categoria?: string | null;
  categoria_id?: number | null;
  categoria_cadastro?: Categoria | null;
  modelo_aparelho?: string | null;
  marca_aparelho?: string | null;
  quantidade: number;
  preco_custo: number | string;
  preco_venda: number | string;
  localizacao_estoque?: string | null;
  localizacao_formatada?: string;
  observacao?: string | null;
};

export type OrcamentoStatus = "aberto" | "aprovado" | "recusado" | "finalizado";

export type Orcamento = {
  id: number;
  cliente_id: number;
  aparelho: string;
  defeito_relatado: string;
  servico: string;
  pecas_usadas?: Array<{
    nome: string;
    quantidade: number;
    valor: number;
    produto_id?: number;
  }> | string | null;
  valor_pecas: number | string;
  valor_mao_obra: number | string;
  desconto: number | string;
  valor_total: number | string;
  status: OrcamentoStatus;
  estoque_baixado?: boolean;
  observacao?: string | null;
  cliente?: Cliente;
  createdAt?: string;
  updatedAt?: string;
};

export type MovimentacaoEstoqueTipo = "entrada" | "saida_os" | "saida_venda" | "estorno_os" | "ajuste_manual";

export type MovimentacaoEstoque = {
  id: number;
  produto_id: number;
  orcamento_id?: number | null;
  tipo: MovimentacaoEstoqueTipo;
  quantidade: number;
  estoque_anterior: number;
  estoque_atual: number;
  observacao?: string | null;
  produto?: Produto;
  createdAt?: string;
  updatedAt?: string;
};

export type PecaNecessaria = {
  nome: string;
  valor: number;
};

export type SimulacaoCompra = {
  id: number;
  modelo_aparelho: string;
  valor_compra: number | string;
  valor_frete: number | string;
  pecas_necessarias?: PecaNecessaria[] | string | null;
  valor_total_pecas: number | string;
  outros_custos: number | string;
  margem_lucro_percentual: number | string;
  valor_venda_estimado: number | string;
  custo_total: number | string;
  lucro_estimado: number | string;
  preco_minimo_recomendado: number | string;
  margem_real_percentual: number | string;
  compensa_comprar: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ChecklistDiagnosticoStatus =
  | "ok"
  | "com_problema"
  | "nao_testado"
  | "nao_possui"
  | "boa"
  | "com_avarias"
  | "nao_funciona"
  | "quebrada"
  | "muito_danificada"
  | "funcionando"
  | "parcial"
  | "nao_funcionam"
  | "bom"
  | "com_folga"
  | "nao_carrega"
  | "nao_encontrado"
  | "suspeita"
  | "confirmado"
  | "com_defeito";
export type DiagnosticoEntradaStatus = "aberto" | "finalizado" | "cancelado";
export type DiagnosticoFotoTipo =
  | "frente"
  | "verso"
  | "lateral_esquerda"
  | "lateral_direita"
  | "conector_carga"
  | "detalhe_defeito"
  | "outro";

export type ChecklistDiagnostico = Record<string, { status: ChecklistDiagnosticoStatus; observacao?: string | null }>;

export type DiagnosticoMarcacaoVisual = {
  area: string;
  tipo: string;
  observacao?: string | null;
};

export type DiagnosticoFoto = {
  id: number;
  diagnostico_id: number;
  caminho_arquivo: string;
  descricao?: string | null;
  tipo_foto: DiagnosticoFotoTipo;
  createdAt?: string;
  updatedAt?: string;
};

export type DiagnosticoEntrada = {
  id: number;
  cliente_id: number;
  usuario_id?: number | null;
  aparelho: string;
  marca?: string | null;
  modelo?: string | null;
  cor?: string | null;
  imei?: string | null;
  senha_desbloqueio?: string | null;
  possui_chip: boolean;
  possui_cartao_memoria: boolean;
  possui_capinha: boolean;
  possui_pelicula: boolean;
  acompanha_carregador: boolean;
  acompanha_cabo: boolean;
  acompanha_caixa: boolean;
  acompanha_nota_fiscal: boolean;
  defeito_relatado: string;
  observacao_geral?: string | null;
  checklist_fisico?: ChecklistDiagnostico | null;
  checklist_funcional?: ChecklistDiagnostico | null;
  marcacoes_visuais?: DiagnosticoMarcacaoVisual[] | null;
  status: DiagnosticoEntradaStatus;
  cliente?: Cliente;
  fotos?: DiagnosticoFoto[];
  createdAt?: string;
  updatedAt?: string;
};

export type TesteFinalEntregaStatus = "aprovado" | "reprovado" | "nao_testado";
export type TestesFinaisEntrega = Record<string, { status: TesteFinalEntregaStatus; observacao?: string | null }>;
export type TermoEntregaFotoTipo = "frente" | "verso" | "lateral" | "servico_realizado" | "outra";

export type TermoEntregaFoto = {
  id: number;
  termo_entrega_id: number;
  foto: string;
  descricao?: string | null;
  tipo_foto: TermoEntregaFotoTipo;
  createdAt?: string;
  updatedAt?: string;
};

export type TermoEntrega = {
  id: number;
  ordem_servico_id: number;
  cliente_id: number;
  usuario_id?: number | null;
  garantia_dias: number;
  cobertura_garantia?: string | null;
  servico_realizado: string;
  testes_finais?: TestesFinaisEntrega | null;
  observacoes_entrega?: string | null;
  data_entrega: string;
  cliente?: Cliente;
  ordem_servico?: Orcamento;
  fotos?: TermoEntregaFoto[];
  createdAt?: string;
  updatedAt?: string;
};

export type DashboardSummary = {
  periodo: {
    inicio: string;
    fim: string;
  };
  indicadores: {
    clientes: number;
    os_abertas: number;
    os_em_andamento: number;
    os_aguardando_aprovacao: number;
    os_finalizadas: number;
    receita_periodo: number;
    ticket_medio: number;
    produtos_estoque_baixo: number;
    movimentacoes_recentes: number;
  };
  os_por_status: Record<OrcamentoStatus, number>;
  receita_mensal: Array<{
    month: string;
    value: number;
  }>;
  produtos_estoque_baixo: Produto[];
  movimentacoes_recentes: MovimentacaoEstoque[];
  os_recentes: Orcamento[];
};

export type FinanceiroPeriodo = "mes_atual" | "ultimos_30_dias" | "ano_atual" | "todos";

export type FinanceiroSummary = {
  periodo: {
    tipo: FinanceiroPeriodo | "personalizado";
    inicio: string | null;
    fim: string | null;
  };
  indicadores: {
    receita: number;
    despesas: number;
    saldo: number;
    os_finalizadas: number;
    ticket_medio: number;
    margem_media_percentual: number;
  };
  os_finalizadas: Orcamento[];
  movimentacoes_relacionadas: MovimentacaoEstoque[];
};

export type ServiceOrder = {
  id: string;
  cliente: string;
  telefone: string;
  aparelho: string;
  imei: string;
  status: ServiceOrderStatus;
  defeitoRelatado: string;
  diagnostico: string;
  valor: number;
  entrada: string;
  previsao: string;
  logs: Array<{
    at: string;
    event: string;
    author: string;
  }>;
};

export type StockLocation = {
  shelf: string;
  boxes: Array<{
    id: string;
    label: string;
    items: Produto[];
  }>;
};
