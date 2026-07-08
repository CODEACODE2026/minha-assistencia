import type { Orcamento, Produto, ServiceOrder, StockLocation } from "@/lib/types";

export const summaryCards = [
  { label: "Clientes", value: "1.284", change: "+12%", tone: "success" },
  { label: "OS Abertas", value: "47", change: "+8 hoje", tone: "warning" },
  { label: "Orçamentos", value: "31", change: "14 aprovados", tone: "default" },
  { label: "Faturamento", value: "R$ 58.420", change: "+18%", tone: "success" },
  { label: "Lucro", value: "R$ 21.760", change: "37,2%", tone: "success" }
];

export const monthlySeries = [
  { month: "Jan", value: 18 },
  { month: "Fev", value: 24 },
  { month: "Mar", value: 21 },
  { month: "Abr", value: 34 },
  { month: "Mai", value: 30 },
  { month: "Jun", value: 42 }
];

export const categorySeries = [
  { label: "Telas", value: 42, color: "bg-red-600" },
  { label: "Baterias", value: 24, color: "bg-gray-900 dark:bg-gray-100" },
  { label: "Conectores", value: 18, color: "bg-emerald-600" },
  { label: "Acessórios", value: 16, color: "bg-amber-500" }
];

export const serviceOrders: ServiceOrder[] = [
  {
    id: "OS-1048",
    cliente: "Marina Alves",
    telefone: "(11) 98822-1001",
    aparelho: "iPhone 13",
    imei: "356789104422119",
    status: "Em Reparo",
    defeitoRelatado: "Tela sem imagem após queda.",
    diagnostico: "Display OLED danificado. Face ID preservado e carcaça sem empeno.",
    valor: 890,
    entrada: "2026-06-14T11:20:00",
    previsao: "2026-06-15T17:00:00",
    logs: [
      { at: "2026-06-14T11:20:00", event: "OS aberta no balcão", author: "Ana" },
      { at: "2026-06-14T12:05:00", event: "Diagnóstico técnico concluído", author: "Rafael" },
      { at: "2026-06-14T13:40:00", event: "Peça separada no estoque", author: "Bianca" }
    ]
  },
  {
    id: "OS-1047",
    cliente: "Paulo Nascimento",
    telefone: "(21) 97771-2208",
    aparelho: "Samsung A54",
    imei: "865430228871604",
    status: "Aguardando Peça",
    defeitoRelatado: "Não carrega e esquenta na base.",
    diagnostico: "Conector de carga oxidado. Necessária substituição do flex.",
    valor: 260,
    entrada: "2026-06-13T16:10:00",
    previsao: "2026-06-17T12:00:00",
    logs: [
      { at: "2026-06-13T16:10:00", event: "OS recebida", author: "Ana" },
      { at: "2026-06-13T17:30:00", event: "Solicitada compra de peça", author: "Rafael" }
    ]
  },
  {
    id: "OS-1046",
    cliente: "Juliana Costa",
    telefone: "(31) 99902-4567",
    aparelho: "Motorola Edge 40",
    imei: "359991042017773",
    status: "Em Análise",
    defeitoRelatado: "Aparelho molhou e reinicia sozinho.",
    diagnostico: "Inspeção inicial em andamento. Placa em banho químico.",
    valor: 0,
    entrada: "2026-06-13T09:40:00",
    previsao: "2026-06-14T18:00:00",
    logs: [{ at: "2026-06-13T09:40:00", event: "Entrada com prioridade", author: "Bianca" }]
  },
  {
    id: "OS-1045",
    cliente: "Renato Lima",
    telefone: "(41) 98888-9090",
    aparelho: "Xiaomi Redmi Note 12",
    imei: "861117043342008",
    status: "Finalizado",
    defeitoRelatado: "Vidro trincado e película quebrada.",
    diagnostico: "Troca de frontal e aplicação de película 3D concluídas.",
    valor: 430,
    entrada: "2026-06-12T10:00:00",
    previsao: "2026-06-13T15:00:00",
    logs: [
      { at: "2026-06-12T10:00:00", event: "OS aberta", author: "Ana" },
      { at: "2026-06-13T14:10:00", event: "Cliente avisado por WhatsApp", author: "Sistema" }
    ]
  }
];

export const produtos: Produto[] = [
  {
    id: 1,
    nome: "Tela iPhone 13 OLED",
    categoria: "Telas",
    modelo_aparelho: "iPhone 13",
    marca_aparelho: "Apple",
    quantidade: 5,
    preco_custo: 520,
    preco_venda: 890,
    localizacao_estoque: "Prateleira A > Caixa 2"
  },
  {
    id: 2,
    nome: "Conector de carga A54",
    categoria: "Conectores",
    modelo_aparelho: "Galaxy A54",
    marca_aparelho: "Samsung",
    quantidade: 12,
    preco_custo: 38,
    preco_venda: 110,
    localizacao_estoque: "Prateleira B > Gaveta 1"
  },
  {
    id: 3,
    nome: "Bateria Redmi Note 12",
    categoria: "Baterias",
    modelo_aparelho: "Redmi Note 12",
    marca_aparelho: "Xiaomi",
    quantidade: 8,
    preco_custo: 74,
    preco_venda: 180,
    localizacao_estoque: "Prateleira C > Caixa 4"
  },
  {
    id: 4,
    nome: "Película 3D Universal",
    categoria: "Acessórios",
    quantidade: 44,
    preco_custo: 6,
    preco_venda: 25,
    localizacao_estoque: "Prateleira A > Gaveta 3"
  }
];

export const stockLocations: StockLocation[] = [
  {
    shelf: "Prateleira A",
    boxes: [
      { id: "A1", label: "Caixa 1", items: [] },
      { id: "A2", label: "Caixa 2", items: [produtos[0]] },
      { id: "A3", label: "Gaveta 3", items: [produtos[3]] }
    ]
  },
  {
    shelf: "Prateleira B",
    boxes: [
      { id: "B1", label: "Gaveta 1", items: [produtos[1]] },
      { id: "B2", label: "Caixa 2", items: [] },
      { id: "B3", label: "Caixa 3", items: [] }
    ]
  },
  {
    shelf: "Prateleira C",
    boxes: [
      { id: "C1", label: "Caixa 1", items: [] },
      { id: "C2", label: "Gaveta 2", items: [] },
      { id: "C4", label: "Caixa 4", items: [produtos[2]] }
    ]
  }
];

export const orcamentos: Orcamento[] = [
  {
    id: 801,
    cliente_id: 23,
    aparelho: "iPhone 11",
    defeito_relatado: "Bateria descarrega rápido",
    servico: "Troca de bateria premium",
    valor_pecas: 120,
    valor_mao_obra: 90,
    desconto: 10,
    valor_total: 200,
    status: "aberto"
  },
  {
    id: 802,
    cliente_id: 41,
    aparelho: "Galaxy S21",
    defeito_relatado: "Tela verde",
    servico: "Substituição de display",
    valor_pecas: 610,
    valor_mao_obra: 160,
    desconto: 0,
    valor_total: 770,
    status: "aprovado"
  },
  {
    id: 803,
    cliente_id: 12,
    aparelho: "Moto G84",
    defeito_relatado: "Microfone baixo",
    servico: "Limpeza e troca de subplaca",
    valor_pecas: 48,
    valor_mao_obra: 80,
    desconto: 0,
    valor_total: 128,
    status: "finalizado"
  }
];

export const whatsAppMessages = [
  { to: "Marina Alves", phone: "(11) 98822-1001", template: "Status da OS", status: "Entregue", at: "2026-06-14T13:45:00" },
  { to: "Renato Lima", phone: "(41) 98888-9090", template: "Pronto para retirada", status: "Lido", at: "2026-06-13T14:12:00" },
  { to: "Paulo Nascimento", phone: "(21) 97771-2208", template: "Aguardando peça", status: "Enviado", at: "2026-06-13T17:35:00" }
];
