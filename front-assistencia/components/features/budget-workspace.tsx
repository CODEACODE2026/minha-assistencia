"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit3, FileDown, FilePlus2, Search, Trash2 } from "lucide-react";
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
import type { Cliente, Orcamento, OrcamentoStatus, Produto } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type BudgetForm = {
  cliente_id: string;
  cliente_busca: string;
  aparelho: string;
  defeito_relatado: string;
  servico: string;
  valor_pecas: string;
  valor_mao_obra: string;
  desconto: string;
  status: OrcamentoStatus;
  observacao: string;
};

type SelectedPart = {
  produto_id: number;
  nome: string;
  quantidade: number;
  valor: number;
  custo_unitario: number;
};

const emptyForm: BudgetForm = {
  cliente_id: "",
  cliente_busca: "",
  aparelho: "",
  defeito_relatado: "",
  servico: "",
  valor_pecas: "0",
  valor_mao_obra: "0",
  desconto: "0",
  status: "aberto",
  observacao: ""
};

const statuses: OrcamentoStatus[] = ["aberto", "aprovado", "recusado", "finalizado"];

const statusTone: Record<OrcamentoStatus, "success" | "warning" | "danger" | "info"> = {
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

function toForm(orcamento: Orcamento): BudgetForm {
  const clienteLabel = orcamento.cliente ? getClientLabel(orcamento.cliente) : `Cliente #${orcamento.cliente_id}`;

  return {
    cliente_id: String(orcamento.cliente_id),
    cliente_busca: clienteLabel,
    aparelho: orcamento.aparelho,
    defeito_relatado: orcamento.defeito_relatado,
    servico: orcamento.servico,
    valor_pecas: String(orcamento.valor_pecas ?? 0),
    valor_mao_obra: String(orcamento.valor_mao_obra ?? 0),
    desconto: String(orcamento.desconto ?? 0),
    status: orcamento.status,
    observacao: orcamento.observacao ?? ""
  };
}

export function BudgetWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Orcamento | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState<BudgetForm>(emptyForm);
  const [parts, setParts] = useState<SelectedPart[]>([]);

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
      const [budgetsData, clientsData, productsData] = await Promise.all([api.orcamentos(token), api.clientes(token), api.produtos(token)]);
      setOrcamentos(budgetsData);
      setClientes(clientsData);
      setProdutos(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar orcamentos.");
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
  const partsTotal = useMemo(() => parts.reduce((total, part) => total + part.quantidade * part.valor, 0), [parts]);
  const partsCost = useMemo(() => parts.reduce((total, part) => total + part.quantidade * part.custo_unitario, 0), [parts]);
  const laborValue = toNumber(form.valor_mao_obra);
  const discountValue = toNumber(form.desconto);
  const total = useMemo(() => Math.max(0, partsTotal + laborValue - discountValue), [partsTotal, laborValue, discountValue]);
  const estimatedProfit = total - partsCost;
  const profitMargin = total > 0 ? (estimatedProfit / total) * 100 : 0;
  const maxDiscountWithoutLoss = Math.max(0, partsTotal + laborValue - partsCost);
  const remainingDiscount = Math.max(0, maxDiscountWithoutLoss - discountValue);

  const clientSuggestions = useMemo(() => {
    const term = form.cliente_busca.trim().toLowerCase();
    if (!term) {
      return clientes.slice(0, 6);
    }

    return clientes
      .filter((cliente) => `${cliente.nome} ${cliente.telefone} ${cliente.cpf ?? ""}`.toLowerCase().includes(term))
      .slice(0, 6);
  }, [clientes, form.cliente_busca]);

  function updateField(field: keyof BudgetForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectClient(cliente: Cliente) {
    setForm((current) => ({
      ...current,
      cliente_id: String(cliente.id),
      cliente_busca: getClientLabel(cliente)
    }));
    setShowSuggestions(false);
  }

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setParts([]);
    setOpen(true);
  }

  function openEditModal(orcamento: Orcamento) {
    if (orcamento.status === "finalizado") {
      setError("Orcamento/OS finalizado nao pode ser editado. Exclua se precisar desfazer.");
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

  function getBudgetAnalysis(orcamento: Orcamento) {
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
        status: editing ? form.status : "aberto",
        observacao: form.observacao.trim() || null
      };

      const saved = editing ? await api.atualizarOrcamento(token, editing.id, payload) : await api.criarOrcamento(token, payload);

      setOrcamentos((current) => (editing ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current]));
      setSuccess(editing ? "Orcamento alterado com sucesso." : "Orcamento cadastrado como aberto. Aprove para virar ordem de servico.");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setParts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar orcamento.");
    } finally {
      setSaving(false);
    }
  }

  async function approveBudgetAsServiceOrder(orcamento: Orcamento) {
    if (!token || !window.confirm(`Aprovar o orcamento #${orcamento.id} e transforma-lo em ordem de servico?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await api.atualizarOrcamento(token, orcamento.id, { status: "aprovado" });
      setOrcamentos((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setSuccess(`Orcamento #${orcamento.id} aprovado. Ele agora aparece na tela de ordens de servico.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aprovar orcamento.");
    } finally {
      setSaving(false);
    }
  }

  async function removeBudget(orcamento: Orcamento) {
    if (!token || !window.confirm(`Confirmar exclusao do orcamento #${orcamento.id}?`)) {
      return;
    }

    const estornarEstoque = orcamento.estoque_baixado
      ? window.confirm("Esse orcamento/OS baixou estoque. Deseja estornar as quantidades ao excluir?")
      : false;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.removerOrcamento(token, orcamento.id, { estornarEstoque });
      setOrcamentos((current) => current.filter((item) => item.id !== orcamento.id));
      setSuccess(estornarEstoque ? "Orcamento removido e estoque estornado com sucesso." : "Orcamento removido com sucesso.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel remover o orcamento.");
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || loading) {
    return <DataTable<Orcamento> loading data={[]} columns={[{ key: "loading", header: "Orcamentos", cell: () => null }]} />;
  }

  if (!token) {
    return <ApiErrorState message="Usuario nao autenticado. Faca login para carregar os orcamentos." />;
  }

  return (
    <>
      <div className="grid gap-5">
        {error ? <ApiErrorState message={error} onRetry={() => void loadData()} /> : null}
        {success ? (
          <section className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            {success}
          </section>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={openCreateModal}>
            <FilePlus2 className="h-4 w-4" />
            Novo orcamento
          </Button>
        </div>

        <DataTable<Orcamento>
          data={orcamentos}
          empty="Nenhum orcamento cadastrado."
          columns={[
            { key: "id", header: "Orcamento", cell: (row) => <span className="font-semibold">#{row.id}</span> },
            { key: "cliente", header: "Cliente", cell: (row) => row.cliente?.nome ?? `Cliente #${row.cliente_id}` },
            { key: "aparelho", header: "Aparelho", cell: (row) => row.aparelho },
            { key: "servico", header: "Servico", cell: (row) => row.servico },
            {
              key: "status",
              header: "Status",
              cell: (row) => <Badge tone={statusTone[row.status]}>{row.status}</Badge>
            },
            { key: "total", header: "Total", cell: (row) => formatCurrency(row.valor_total) },
            {
              key: "lucro",
              header: "Lucro estimado",
              cell: (row) => {
                const analysis = getBudgetAnalysis(row);
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
              cell: (row) => formatCurrency(getBudgetAnalysis(row).maxDiscount)
            },
            {
              key: "action",
              header: "",
              cell: (row) => (
                <div className="flex justify-end gap-2">
                  {row.status === "aberto" ? (
                    <Button aria-label="Virar OS" title="Virar OS" size="icon" disabled={saving} variant="secondary" onClick={() => void approveBudgetAsServiceOrder(row)}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {row.status === "aprovado" ? (
                    <Button aria-label="OS gerada" title="OS gerada" size="icon" disabled variant="secondary">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {row.status !== "finalizado" ? (
                    <Button aria-label="Editar" title="Editar" size="icon" variant="secondary" onClick={() => openEditModal(row)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button aria-label="Gerar PDF" title="Gerar PDF" size="icon" variant="secondary" onClick={() => generateOrcamentoPdf(getStoredCompanyProfile(), row, "orcamento")}>
                    <FileDown className="h-4 w-4" />
                  </Button>
                  <Button aria-label="Excluir" title="Excluir" size="icon" variant="danger" disabled={saving} onClick={() => void removeBudget(row)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </div>

      <Modal open={open} title={editing ? "Editar orcamento" : "Gerar orcamento"} className="max-w-5xl" onClose={() => setOpen(false)}>
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
            <Textarea label="Servico" value={form.servico} onChange={(event) => updateField("servico", event.target.value)} required />
            <Textarea label="Defeito relatado" value={form.defeito_relatado} onChange={(event) => updateField("defeito_relatado", event.target.value)} required />
            {editing ? (
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
            ) : (
              <div className="rounded border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Status inicial</p>
                <p className="mt-1 text-muted-foreground">Todo orçamento novo é criado como aberto. Depois de aprovado, use “Virar OS”.</p>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Valor das pecas" value={formatCurrency(partsTotal)} readOnly />
            <Input
              label="Mao de obra"
              type="number"
              min="0"
              step="0.01"
              value={form.valor_mao_obra}
              onChange={(event) => updateField("valor_mao_obra", event.target.value)}
            />
            <Input label="Desconto" type="number" min="0" step="0.01" value={form.desconto} onChange={(event) => updateField("desconto", event.target.value)} />
          </div>

          <div className="rounded border p-3">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <ProductAutocomplete produtos={produtos} label="Adicionar produto ao orcamento" clearOnSelect onSelect={(produto) => addProduct(String(produto.id))} />
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
                <p className="text-sm text-muted-foreground">Nenhum produto vinculado ao orcamento.</p>
              )}
            </div>
          </div>

          <Textarea label="Observacao" value={form.observacao} onChange={(event) => updateField("observacao", event.target.value)} />

          <div className="grid gap-3 rounded border bg-muted/50 p-3 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Custo das pecas</p>
              <strong>{formatCurrency(partsCost)}</strong>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total calculado</p>
              <strong>{formatCurrency(total)}</strong>
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
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar orcamento"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
