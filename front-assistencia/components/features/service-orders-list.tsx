"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, FileCheck2, FileDown, FilePlus2, MessageCircle, Search, Trash2, Upload } from "lucide-react";
import { ApiErrorState } from "@/components/features/api-state";
import { ProductAutocomplete } from "@/components/features/product-autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { api, getStoredAuth } from "@/lib/api";
import { getStoredCompanyProfile } from "@/lib/company-profile";
import { generateOrcamentoPdf } from "@/lib/document-pdf";
import type { Cliente, Orcamento, OrcamentoStatus, Produto, TermoEntrega, TermoEntregaFotoTipo, TestesFinaisEntrega, TesteFinalEntregaStatus } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type ServiceOrderForm = {
  cliente_id: string;
  cliente_busca: string;
  aparelho: string;
  defeito_relatado: string;
  servico: string;
  status: OrcamentoStatus;
  valor_mao_obra: string;
  desconto: string;
  observacao: string;
};

type SelectedPart = {
  produto_id: number;
  nome: string;
  quantidade: number;
  valor: number;
  custo_unitario: number;
};

type TermForm = {
  garantia_dias: string;
  cobertura_garantia: string;
  servico_realizado: string;
  observacoes_entrega: string;
};

type PendingTermPhoto = {
  id: number;
  arquivo_base64: string;
  descricao: string;
  tipo_foto: TermoEntregaFotoTipo;
};

const emptyForm: ServiceOrderForm = {
  cliente_id: "",
  cliente_busca: "",
  aparelho: "",
  defeito_relatado: "",
  servico: "",
  status: "aberto",
  valor_mao_obra: "0",
  desconto: "0",
  observacao: ""
};

const statuses: OrcamentoStatus[] = ["aberto", "aprovado", "recusado", "finalizado"];
const deliveryTests = [
  ["liga", "Liga"],
  ["carrega", "Carrega"],
  ["touch", "Touch"],
  ["display", "Display"],
  ["wifi", "Wi-Fi"],
  ["bluetooth", "Bluetooth"],
  ["chip", "Chip"],
  ["alto_falante", "Alto-falante"],
  ["microfone", "Microfone"],
  ["vibracao", "Vibracao"],
  ["camera_frontal", "Camera frontal"],
  ["camera_traseira", "Camera traseira"],
  ["flash", "Flash"],
  ["biometria", "Biometria"],
  ["face_id", "Face ID"]
] as const;

const deliveryPhotoTypes: Array<{ value: TermoEntregaFotoTipo; label: string }> = [
  { value: "frente", label: "Frente" },
  { value: "verso", label: "Verso" },
  { value: "lateral", label: "Lateral" },
  { value: "servico_realizado", label: "Servico realizado" },
  { value: "outra", label: "Outra" }
];

const emptyTermForm: TermForm = {
  garantia_dias: "90",
  cobertura_garantia: "Garantia valida para pecas e mao de obra executadas.",
  servico_realizado: "",
  observacoes_entrega: "Aparelho entregue funcionando normalmente. Cliente orientado sobre cuidados apos o reparo."
};

const statusTone: Record<OrcamentoStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  aberto: "warning",
  aprovado: "success",
  recusado: "danger",
  finalizado: "info"
};

function toNumber(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getProductPrice(produto: Produto) {
  return toNumber(produto.preco_venda);
}

function getProductCost(produto?: Produto) {
  return toNumber(produto?.preco_custo);
}

function getClientLabel(cliente: Cliente) {
  return `${cliente.nome} - ${cliente.telefone}`;
}

function parseParts(pecas: Orcamento["pecas_usadas"]) {
  if (Array.isArray(pecas)) {
    return pecas;
  }

  if (typeof pecas === "string") {
    try {
      const parsed = JSON.parse(pecas);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function makeDeliveryTests(): TestesFinaisEntrega {
  return Object.fromEntries(deliveryTests.map(([key]) => [key, { status: "nao_testado", observacao: "" }])) as TestesFinaisEntrega;
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") {
    return (value ?? fallback) as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toForm(orcamento: Orcamento): ServiceOrderForm {
  return {
    cliente_id: String(orcamento.cliente_id),
    cliente_busca: orcamento.cliente ? getClientLabel(orcamento.cliente) : `Cliente #${orcamento.cliente_id}`,
    aparelho: orcamento.aparelho,
    defeito_relatado: orcamento.defeito_relatado,
    servico: orcamento.servico,
    status: orcamento.status,
    valor_mao_obra: String(orcamento.valor_mao_obra ?? 0),
    desconto: String(orcamento.desconto ?? 0),
    observacao: orcamento.observacao ?? ""
  };
}

export function ServiceOrdersList() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [termosEntrega, setTermosEntrega] = useState<TermoEntrega[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [status, setStatus] = useState<OrcamentoStatus | "todos">("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Orcamento | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState<ServiceOrderForm>(emptyForm);
  const [parts, setParts] = useState<SelectedPart[]>([]);
  const [termOpen, setTermOpen] = useState(false);
  const [termOrder, setTermOrder] = useState<Orcamento | null>(null);
  const [editingTerm, setEditingTerm] = useState<TermoEntrega | null>(null);
  const [termForm, setTermForm] = useState<TermForm>(emptyTermForm);
  const [termTests, setTermTests] = useState<TestesFinaisEntrega>(() => makeDeliveryTests());
  const [termPhotos, setTermPhotos] = useState<PendingTermPhoto[]>([]);

  useEffect(() => {
    setToken(getStoredAuth()?.token ?? null);
    setHydrated(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [ordersData, clientsData, productsData, deliveryTermsData] = await Promise.all([api.orcamentos(token), api.clientes(token), api.produtos(token), api.termosEntrega(token)]);
      setOrcamentos(ordersData);
      setClientes(clientsData);
      setProdutos(productsData);
      setTermosEntrega(deliveryTermsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar ordens de servico.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadData();
    } else if (hydrated) {
      setLoading(false);
    }
  }, [hydrated, loadData, token]);

  const productById = useMemo(() => new Map(produtos.map((produto) => [produto.id, produto])), [produtos]);
  const deliveryTermByOrderId = useMemo(() => new Map(termosEntrega.map((termo) => [termo.ordem_servico_id, termo])), [termosEntrega]);
  const filtered = useMemo(() => {
    if (status === "todos") {
      return orcamentos;
    }

    return orcamentos.filter((order) => order.status === status);
  }, [orcamentos, status]);

  const partsTotal = useMemo(() => parts.reduce((total, part) => total + part.quantidade * part.valor, 0), [parts]);
  const partsCost = useMemo(() => parts.reduce((total, part) => total + part.quantidade * part.custo_unitario, 0), [parts]);
  const laborValue = toNumber(form.valor_mao_obra);
  const discountValue = toNumber(form.desconto);
  const orderTotal = Math.max(0, partsTotal + laborValue - discountValue);
  const estimatedProfit = orderTotal - partsCost;
  const profitMargin = orderTotal > 0 ? (estimatedProfit / orderTotal) * 100 : 0;
  const maxDiscountWithoutLoss = Math.max(0, partsTotal + laborValue - partsCost);
  const remainingDiscount = Math.max(0, maxDiscountWithoutLoss - discountValue);
  const clientSuggestions = useMemo(() => {
    const term = form.cliente_busca.trim().toLowerCase();
    if (!term) {
      return clientes.slice(0, 6);
    }

    return clientes.filter((cliente) => `${cliente.nome} ${cliente.telefone} ${cliente.cpf ?? ""}`.toLowerCase().includes(term)).slice(0, 6);
  }, [clientes, form.cliente_busca]);

  function updateField(field: keyof ServiceOrderForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setParts([]);
    setOpen(true);
  }

  function openEditModal(orcamento: Orcamento) {
    if (orcamento.status === "finalizado") {
      setError("OS finalizada nao pode ser editada. Exclua a OS se precisar desfazer.");
      return;
    }

    setEditing(orcamento);
    setForm(toForm(orcamento));
    setParts(
      parseParts(orcamento.pecas_usadas).map((part, index) => ({
        produto_id: part.produto_id ?? -index - 1,
        nome: part.nome,
        quantidade: part.quantidade,
        valor: toNumber(part.valor),
        custo_unitario: getProductCost(part.produto_id ? productById.get(part.produto_id) : undefined)
      }))
    );
    setOpen(true);
  }

  function openDeliveryTerm(orcamento: Orcamento) {
    const existingTerm = deliveryTermByOrderId.get(orcamento.id) ?? null;
    setTermOrder(orcamento);
    setEditingTerm(existingTerm);
    setTermForm(
      existingTerm
        ? {
            garantia_dias: String(existingTerm.garantia_dias ?? 0),
            cobertura_garantia: existingTerm.cobertura_garantia ?? "",
            servico_realizado: existingTerm.servico_realizado,
            observacoes_entrega: existingTerm.observacoes_entrega ?? ""
          }
        : {
            ...emptyTermForm,
            servico_realizado: orcamento.servico
          }
    );
    setTermTests({ ...makeDeliveryTests(), ...parseJsonValue<TestesFinaisEntrega | null>(existingTerm?.testes_finais, null) });
    setTermPhotos([]);
    setTermOpen(true);
  }

  function selectClient(cliente: Cliente) {
    setForm((current) => ({
      ...current,
      cliente_id: String(cliente.id),
      cliente_busca: getClientLabel(cliente)
    }));
    setShowSuggestions(false);
  }

  function addProduct(produtoId: string) {
    const id = Number(produtoId);
    const produto = produtos.find((item) => item.id === id);
    if (!produto) {
      return;
    }

    setParts((current) => {
      const existing = current.find((part) => part.produto_id === produto.id);
      if (existing) {
        return current.map((part) => (part.produto_id === produto.id ? { ...part, quantidade: part.quantidade + 1 } : part));
      }

      return [...current, { produto_id: produto.id, nome: produto.nome, quantidade: 1, valor: getProductPrice(produto), custo_unitario: getProductCost(produto) }];
    });
  }

  function changePartQuantity(produtoId: number, quantity: number) {
    setParts((current) => current.map((part) => (part.produto_id === produtoId ? { ...part, quantidade: Math.max(1, quantity) } : part)));
  }

  function removePart(produtoId: number) {
    setParts((current) => current.filter((part) => part.produto_id !== produtoId));
  }

  function getOrderAnalysis(orcamento: Orcamento) {
    const cost = parseParts(orcamento.pecas_usadas).reduce((total, part) => {
      const product = part.produto_id ? productById.get(part.produto_id) : undefined;
      return total + Number(part.quantidade) * getProductCost(product);
    }, 0);
    const revenue = toNumber(orcamento.valor_pecas) + toNumber(orcamento.valor_mao_obra);
    const total = toNumber(orcamento.valor_total);
    const profit = total - cost;
    const margin = total > 0 ? (profit / total) * 100 : 0;
    const maxDiscount = Math.max(0, revenue - cost);

    return { cost, profit, margin, maxDiscount };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Usuario nao autenticado.");
      return;
    }

    if (!form.cliente_id) {
      setError("Selecione um cliente valido no autocomplete.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        cliente_id: Number(form.cliente_id),
        aparelho: form.aparelho.trim(),
        defeito_relatado: form.defeito_relatado.trim(),
        servico: form.servico.trim(),
        pecas_usadas: parts.map((part) => ({
          nome: part.nome,
          quantidade: part.quantidade,
          valor: part.valor,
          ...(part.produto_id > 0 ? { produto_id: part.produto_id } : {})
        })),
        valor_pecas: partsTotal,
        valor_mao_obra: toNumber(form.valor_mao_obra),
        desconto: toNumber(form.desconto),
        status: form.status,
        observacao: form.observacao.trim() || null
      };
      const saved = editing ? await api.atualizarOrcamento(token, editing.id, payload) : await api.criarOrcamento(token, payload);

      setOrcamentos((current) => (editing ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current]));
      setSuccess(editing ? `OS/orcamento #${saved.id} alterado com sucesso.` : `OS/orcamento #${saved.id} emitido e vinculado ao cliente.`);
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setParts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao emitir ordem de servico.");
    } finally {
      setSaving(false);
    }
  }

  async function changeOrderStatus(orcamento: Orcamento, status: OrcamentoStatus) {
    if (!token || status === orcamento.status) {
      return;
    }

    if (orcamento.status === "finalizado") {
      setError("OS finalizada nao pode mudar de status. Exclua a OS se precisar desfazer.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await api.atualizarOrcamento(token, orcamento.id, { status });
      setOrcamentos((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setSuccess(`Status da OS/orcamento #${orcamento.id} alterado para ${status}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar status da OS.");
    } finally {
      setSaving(false);
    }
  }

  async function removeOrder(orcamento: Orcamento) {
    if (!token || !window.confirm(`Confirmar exclusao da OS/orcamento #${orcamento.id}?`)) {
      return;
    }

    const estornarEstoque = orcamento.estoque_baixado
      ? window.confirm("Essa OS baixou estoque. Deseja estornar as quantidades ao excluir?")
      : false;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.removerOrcamento(token, orcamento.id, { estornarEstoque });
      setOrcamentos((current) => current.filter((item) => item.id !== orcamento.id));
      setSuccess(estornarEstoque ? "OS removida e estoque estornado com sucesso." : "OS removida com sucesso.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel remover a OS.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTermPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const validFiles = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (files.length !== validFiles.length) {
      setError("Algumas fotos foram ignoradas. Use JPG, PNG ou WEBP com ate 5MB.");
    }

    const loaded = await Promise.all(
      validFiles.map(
        (file, index) =>
          new Promise<PendingTermPhoto>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ id: Date.now() + index, arquivo_base64: String(reader.result), descricao: "", tipo_foto: index === 0 ? "frente" : "outra" });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );

    setTermPhotos((current) => [...current, ...loaded]);
  }

  async function generateDeliveryTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !termOrder) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ordem_servico_id: termOrder.id,
        garantia_dias: Math.max(0, Number(termForm.garantia_dias) || 0),
        cobertura_garantia: termForm.cobertura_garantia.trim() || null,
        servico_realizado: termForm.servico_realizado.trim(),
        testes_finais: termTests,
        observacoes_entrega: termForm.observacoes_entrega.trim() || null
      };

      const termo = editingTerm ? await api.atualizarTermoEntrega(token, editingTerm.id, payload) : await api.criarTermoEntrega(token, payload);

      if (termPhotos.length) {
        await api.adicionarFotosTermoEntrega(token, termo.id, termPhotos.map(({ arquivo_base64, descricao, tipo_foto }) => ({ arquivo_base64, descricao, tipo_foto })));
      }

      const refreshedTerms = await api.termosEntrega(token);
      setTermosEntrega(refreshedTerms);

      const blob = await api.termoEntregaPdf(token, termo.id, getStoredCompanyProfile());
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);

      setSuccess(editingTerm ? `Termo de entrega #${termo.id} atualizado com sucesso.` : `Termo de entrega #${termo.id} gerado com sucesso.`);
      setTermOpen(false);
      setTermOrder(null);
      setEditingTerm(null);
      setTermPhotos([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar termo de entrega.");
    } finally {
      setSaving(false);
    }
  }

  async function sendDeliveryWhatsApp(row: Orcamento) {
    if (!token) return;
    if (!row.cliente?.telefone) {
      setError("Cliente sem telefone cadastrado.");
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await api.enviarWhatsApp(token, {
        telefone: row.cliente.telefone,
        mensagem: `O termo de entrega e garantia da OS #${row.id} esta pronto. Obrigado por escolher a Minha Assistencia.`
      });
      setSuccess("Mensagem de entrega enviada/processada pelo WhatsApp.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar WhatsApp.");
    }
  }

  if (!hydrated || loading) {
    return <DataTable<Orcamento> loading data={[]} columns={[{ key: "loading", header: "Ordens", cell: () => null }]} />;
  }

  if (!token) {
    return <ApiErrorState message="Usuario nao autenticado. Faca login para emitir ordens de servico." />;
  }

  return (
    <div className="grid gap-5">
      {error ? <ApiErrorState message={error} onRetry={() => void loadData()} /> : null}
      {success ? (
        <section className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {success}
        </section>
      ) : null}

      <div className="flex flex-col gap-3 rounded border bg-card p-3 shadow-subtle lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["todos", "aberto", "aprovado", "recusado", "finalizado"] as Array<OrcamentoStatus | "todos">).map((item) => (
            <button
              key={item}
              className={cn(
                "h-9 rounded border px-3 text-sm font-medium transition-colors hover:bg-muted",
                status === item && "border-primary bg-red-50 text-primary dark:bg-red-950/30"
              )}
              onClick={() => setStatus(item)}
            >
              {item === "todos" ? "Todos" : item}
            </button>
          ))}
        </div>
        <Button onClick={openCreateModal}>
          <FilePlus2 className="h-4 w-4" />
          Nova OS
        </Button>
      </div>

      <DataTable<Orcamento>
        data={filtered}
        empty="Nenhuma ordem emitida."
        columns={[
          { key: "id", header: "OS", cell: (row) => <span className="font-semibold">#{row.id}</span> },
          { key: "cliente", header: "Cliente", cell: (row) => row.cliente?.nome ?? `Cliente #${row.cliente_id}` },
          { key: "telefone", header: "Telefone", cell: (row) => row.cliente?.telefone ?? "-" },
          { key: "aparelho", header: "Aparelho", cell: (row) => row.aparelho },
          { key: "servico", header: "Servico", cell: (row) => row.servico },
          {
            key: "status",
            header: "Status",
            cell: (row) => (
              <label className="flex items-center gap-2">
                <Badge tone={statusTone[row.status]}>{row.status}</Badge>
                {row.status !== "finalizado" ? (
                  <select
                    aria-label={`Alterar status da OS ${row.id}`}
                    className="h-8 rounded border border-input bg-background px-2 text-xs outline-none focus:border-primary"
                    value={row.status}
                    disabled={saving}
                    onChange={(event) => void changeOrderStatus(row, event.target.value as OrcamentoStatus)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                ) : null}
              </label>
            )
          },
          { key: "total", header: "Total", cell: (row) => formatCurrency(row.valor_total) },
          {
            key: "lucro",
            header: "Lucro estimado",
            cell: (row) => {
              const analysis = getOrderAnalysis(row);
              return (
                <div>
                  <p className={analysis.profit < 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-700"}>{formatCurrency(analysis.profit)}</p>
                  <p className="text-xs text-muted-foreground">{analysis.margin.toFixed(1)}%</p>
                </div>
              );
            }
          },
          {
            key: "desconto_limite",
            header: "Desc. limite",
            cell: (row) => formatCurrency(getOrderAnalysis(row).maxDiscount)
          },
          {
            key: "actions",
            header: "",
            cell: (row) => (
              <div className="flex justify-end gap-2">
                {row.status !== "finalizado" ? (
                  <Button aria-label="Editar" title="Editar" size="icon" variant="secondary" onClick={() => openEditModal(row)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button aria-label="Gerar PDF" title="Gerar PDF" size="icon" variant="secondary" onClick={() => generateOrcamentoPdf(getStoredCompanyProfile(), row, "os")}>
                  <FileDown className="h-4 w-4" />
                </Button>
                {row.status === "finalizado" ? (
                  <>
                    <Button aria-label={deliveryTermByOrderId.has(row.id) ? "Abrir Termo" : "Gerar Termo"} title={deliveryTermByOrderId.has(row.id) ? "Abrir Termo" : "Gerar Termo"} size="icon" variant="secondary" onClick={() => openDeliveryTerm(row)}>
                      <FileCheck2 className="h-4 w-4" />
                    </Button>
                    <Button aria-label="WhatsApp" title="WhatsApp" size="icon" variant="secondary" onClick={() => void sendDeliveryWhatsApp(row)}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
                <Button aria-label="Excluir" title="Excluir" size="icon" variant="danger" disabled={saving} onClick={() => void removeOrder(row)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          }
        ]}
      />

      <Modal open={open} title={editing ? "Editar ordem de servico" : "Emitir ordem de servico"} className="max-w-5xl" onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
            <Input
              label="Cliente"
              className="pl-9"
              value={form.cliente_busca}
              onChange={(event) => {
                updateField("cliente_busca", event.target.value);
                updateField("cliente_id", "");
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Digite nome, telefone ou CPF"
              autoComplete="off"
              required
            />
            {showSuggestions ? (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border bg-card shadow-xl">
                {clientSuggestions.length ? (
                  clientSuggestions.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectClient(cliente);
                      }}
                    >
                      <span className="font-medium">{cliente.nome}</span>
                      <span className="ml-2 text-muted-foreground">{cliente.telefone}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                )}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Input label="Aparelho" value={form.aparelho} onChange={(event) => updateField("aparelho", event.target.value)} required />
            <Textarea label="Defeito relatado" value={form.defeito_relatado} onChange={(event) => updateField("defeito_relatado", event.target.value)} required />
            <Textarea label="Servico" value={form.servico} onChange={(event) => updateField("servico", event.target.value)} required />
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              <span>Status</span>
              <select
                className="h-10 w-full min-w-0 rounded border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as OrcamentoStatus)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded border p-3">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <ProductAutocomplete produtos={produtos} label="Produto/peca utilizada" clearOnSelect onSelect={(produto) => addProduct(String(produto.id))} />
              </div>
            </div>

            <div className="grid gap-2">
              {parts.length ? (
                parts.map((part) => (
                  <div key={part.produto_id} className="grid gap-2 rounded border bg-muted/30 p-2 sm:grid-cols-[1fr_90px_120px_auto] sm:items-center">
                    <span className="text-sm font-medium">{part.nome}</span>
                    <Input
                      aria-label={`Quantidade de ${part.nome}`}
                      type="number"
                      min="1"
                      value={part.quantidade}
                      onChange={(event) => changePartQuantity(part.produto_id, Number(event.target.value))}
                    />
                    <div className="text-sm">
                      <p className="font-semibold">{formatCurrency(part.valor * part.quantidade)}</p>
                      <p className="text-xs text-muted-foreground">Lucro {formatCurrency((part.valor - part.custo_unitario) * part.quantidade)}</p>
                    </div>
                    <Button aria-label="Remover produto" type="button" size="icon" variant="ghost" onClick={() => removePart(part.produto_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum produto vinculado.</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Valor das pecas" value={formatCurrency(partsTotal)} readOnly />
            <Input label="Mao de obra" type="number" min="0" step="0.01" value={form.valor_mao_obra} onChange={(event) => updateField("valor_mao_obra", event.target.value)} />
            <Input label="Desconto" type="number" min="0" step="0.01" value={form.desconto} onChange={(event) => updateField("desconto", event.target.value)} />
          </div>

          <Textarea label="Observacao" value={form.observacao} onChange={(event) => updateField("observacao", event.target.value)} />

          <div className="grid gap-3 rounded border bg-muted/50 p-3 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Custo das pecas</p>
              <strong>{formatCurrency(partsCost)}</strong>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total da OS</p>
              <strong>{formatCurrency(orderTotal)}</strong>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lucro estimado</p>
              <strong className={estimatedProfit < 0 ? "text-red-600" : "text-emerald-700"}>{formatCurrency(estimatedProfit)}</strong>
              <p className="text-xs text-muted-foreground">Margem {profitMargin.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Desconto sem prejuizo</p>
              <strong>{formatCurrency(maxDiscountWithoutLoss)}</strong>
              <p className="text-xs text-muted-foreground">Ainda pode {formatCurrency(remainingDiscount)}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !clientes.length}>
              {saving ? "Salvando..." : editing ? "Salvar OS" : "Emitir OS"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={termOpen} title={termOrder ? `${editingTerm ? "Editar termo" : "Termo de entrega"} - OS #${termOrder.id}` : "Termo de entrega"} className="max-w-6xl" onClose={() => setTermOpen(false)}>
        <form className="grid gap-4" onSubmit={generateDeliveryTerm}>
          {termOrder ? (
            <section className="grid gap-3 rounded border bg-muted/30 p-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <strong>{termOrder.cliente?.nome ?? `Cliente #${termOrder.cliente_id}`}</strong>
                <p className="text-sm text-muted-foreground">{termOrder.cliente?.telefone ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aparelho</p>
                <strong>{termOrder.aparelho}</strong>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor da OS</p>
                <strong>{formatCurrency(termOrder.valor_total)}</strong>
              </div>
            </section>
          ) : null}
          {editingTerm ? (
            <section className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              Esta OS ja possui termo #{editingTerm.id}. Ao salvar, o termo existente sera atualizado e o PDF sera gerado novamente.
            </section>
          ) : null}

          <section className="grid gap-3 rounded border bg-card p-4">
            <h3 className="font-semibold">Servicos realizados</h3>
            <Textarea label="Servico realizado" value={termForm.servico_realizado} onChange={(event) => setTermForm((current) => ({ ...current, servico_realizado: event.target.value }))} required />
            <div className="grid gap-2">
              <p className="text-sm font-medium">Pecas utilizadas</p>
              {termOrder && parseParts(termOrder.pecas_usadas).length ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {parseParts(termOrder.pecas_usadas).map((part, index) => (
                    <div key={`${part.nome}-${index}`} className="rounded border bg-muted/30 p-2 text-sm">
                      <strong>{part.nome}</strong>
                      <p className="text-muted-foreground">Quantidade: {part.quantidade}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma peca registrada na OS.</p>
              )}
            </div>
          </section>

          <section className="grid gap-3 rounded border bg-card p-4">
            <h3 className="font-semibold">Testes finais</h3>
            <div className="grid gap-2 lg:grid-cols-2">
              {deliveryTests.map(([key, label]) => {
                const selected = termTests[key]?.status ?? "nao_testado";
                return (
                  <div key={key} className="grid gap-2 rounded border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm">{label}</strong>
                      <div className="flex flex-wrap gap-1">
                        {(["aprovado", "reprovado", "nao_testado"] as TesteFinalEntregaStatus[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${selected === option ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}
                            onClick={() => setTermTests((current) => ({ ...current, [key]: { ...current[key], status: option, observacao: option === "reprovado" ? current[key]?.observacao ?? "" : "" } }))}
                          >
                            {option === "aprovado" ? "Aprovado" : option === "reprovado" ? "Reprovado" : "Nao testado"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {selected === "reprovado" ? (
                      <Input placeholder="Observacao do teste" value={termTests[key]?.observacao ?? ""} onChange={(event) => setTermTests((current) => ({ ...current, [key]: { ...current[key], observacao: event.target.value } }))} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-3 rounded border bg-card p-4">
            <h3 className="font-semibold">Garantia</h3>
            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              <label className="grid gap-1.5 text-sm font-medium">
                <span>Garantia</span>
                <select className="h-10 rounded border bg-background px-3 text-sm" value={termForm.garantia_dias} onChange={(event) => setTermForm((current) => ({ ...current, garantia_dias: event.target.value }))}>
                  <option value="0">Sem garantia</option>
                  <option value="30">30 dias</option>
                  <option value="60">60 dias</option>
                  <option value="90">90 dias</option>
                  <option value="180">180 dias</option>
                </select>
              </label>
              <Textarea label="Cobertura da garantia" value={termForm.cobertura_garantia} onChange={(event) => setTermForm((current) => ({ ...current, cobertura_garantia: event.target.value }))} />
            </div>
          </section>

          <section className="grid gap-3 rounded border bg-card p-4">
            <h3 className="font-semibold">Fotos finais</h3>
            <label className="inline-flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded border bg-accent px-4 text-sm font-medium text-accent-foreground">
              <Upload className="h-4 w-4" />Importar fotos
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleTermPhotos} />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              {termPhotos.map((foto) => (
                <div key={foto.id} className="grid gap-2 rounded border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.arquivo_base64} alt="Preview" className="h-36 w-full rounded object-cover" />
                  <select className="h-9 rounded border bg-background px-2 text-sm" value={foto.tipo_foto} onChange={(event) => setTermPhotos((current) => current.map((item) => item.id === foto.id ? { ...item, tipo_foto: event.target.value as TermoEntregaFotoTipo } : item))}>
                    {deliveryPhotoTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                  <Input placeholder="Legenda" value={foto.descricao} onChange={(event) => setTermPhotos((current) => current.map((item) => item.id === foto.id ? { ...item, descricao: event.target.value } : item))} />
                  <Button type="button" size="sm" variant="ghost" onClick={() => setTermPhotos((current) => current.filter((item) => item.id !== foto.id))}>Remover foto</Button>
                </div>
              ))}
            </div>
          </section>

          <Textarea label="Observacoes de entrega" value={termForm.observacoes_entrega} onChange={(event) => setTermForm((current) => ({ ...current, observacoes_entrega: event.target.value }))} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setTermOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Gerando..." : editingTerm ? "Atualizar e gerar PDF" : "Salvar e gerar PDF"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
