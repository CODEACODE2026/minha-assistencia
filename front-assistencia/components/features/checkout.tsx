"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Eye, FileDown, Minus, Plus, QrCode, ReceiptText, Search, Trash2, Wallet, XCircle } from "lucide-react";
import { ApiErrorState } from "@/components/features/api-state";
import { ProductAutocomplete } from "@/components/features/product-autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { DataTable } from "@/components/ui/table";
import { api, getStoredAuth } from "@/lib/api";
import type { Cliente, Produto, Venda, VendaFormaPagamento, VendaStatusFiltro } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type CartItem = {
  productId: number;
  quantity: number;
};

const paymentMethods: Array<{ value: VendaFormaPagamento; label: string; icon: typeof QrCode }> = [
  { value: "pix", label: "PIX", icon: QrCode },
  { value: "credito", label: "Crédito", icon: CreditCard },
  { value: "debito", label: "Débito", icon: ReceiptText },
  { value: "dinheiro", label: "Dinheiro", icon: Wallet }
];

const statusFilters: Array<{ value: VendaStatusFiltro; label: string }> = [
  { value: "todos", label: "Todas" },
  { value: "concluida", label: "Concluídas" },
  { value: "cancelada", label: "Canceladas" }
];

function toNumber(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clientLabel(cliente: Cliente) {
  return `${cliente.nome} - ${cliente.telefone}`;
}

function receiptHtml(venda: Venda) {
  const itens = venda.itens ?? [];
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Recibo PDV #${venda.id}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      .muted { color: #6b7280; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; font-size: 13px; }
      th { background: #f9fafb; }
      .totals { margin-left: auto; margin-top: 24px; width: 280px; }
      .line { display: flex; justify-content: space-between; padding: 6px 0; }
      .total { border-top: 1px solid #111827; font-weight: 700; font-size: 18px; margin-top: 6px; padding-top: 10px; }
    </style>
  </head>
  <body>
    <h1>Recibo PDV #${venda.id}</h1>
    <div class="muted">${venda.createdAt ? formatDateTime(venda.createdAt) : ""}</div>
    <p><strong>Cliente:</strong> ${venda.cliente?.nome ?? "Consumidor não identificado"}</p>
    <p><strong>Forma de pagamento:</strong> ${venda.forma_pagamento}</p>
    <p><strong>Status:</strong> ${venda.status}</p>
    <table>
      <thead><tr><th>Item</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead>
      <tbody>
        ${itens
          .map(
            (item) =>
              `<tr><td>${item.nome_produto_snapshot}</td><td>${item.quantidade}</td><td>${formatCurrency(item.valor_unitario)}</td><td>${formatCurrency(item.valor_total)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
    <div class="totals">
      <div class="line"><span>Subtotal</span><strong>${formatCurrency(venda.subtotal)}</strong></div>
      <div class="line"><span>Desconto</span><strong>${formatCurrency(venda.desconto)}</strong></div>
      <div class="line total"><span>Total</span><strong>${formatCurrency(venda.total)}</strong></div>
    </div>
  </body>
</html>`;
}

function printReceipt(venda: Venda) {
  const popup = window.open("", "_blank", "width=820,height=720");
  if (!popup) {
    return;
  }

  popup.document.open();
  popup.document.write(receiptHtml(venda));
  popup.document.close();
  popup.focus();
  popup.print();
}

export function Checkout() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [payment, setPayment] = useState<VendaFormaPagamento>("pix");
  const [clienteBusca, setClienteBusca] = useState("");
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [showClients, setShowClients] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [lastSale, setLastSale] = useState<Venda | null>(null);
  const [salesHistory, setSalesHistory] = useState<Venda[]>([]);
  const [selectedHistorySale, setSelectedHistorySale] = useState<Venda | null>(null);
  const [statusFilter, setStatusFilter] = useState<VendaStatusFiltro>("todos");
  const [historyClientId, setHistoryClientId] = useState("");
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      const [productsData, clientsData] = await Promise.all([api.produtos(token), api.clientes(token)]);
      setProdutos(productsData);
      setClientes(clientsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar PDV.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadSalesHistory = useCallback(async () => {
    if (!token) {
      return;
    }

    setHistoryLoading(true);
    setError(null);

    try {
      const response = await api.vendasPdv(token, {
        status: statusFilter,
        inicio: historyStart || undefined,
        fim: historyEnd || undefined,
        cliente_id: historyClientId ? Number(historyClientId) : undefined,
        page: 1,
        limit: 20
      });
      setSalesHistory(response.items);
      setSelectedHistorySale((current) => {
        if (!current) {
          return null;
        }
        return response.items.find((sale) => sale.id === current.id) ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar histórico de vendas.");
    } finally {
      setHistoryLoading(false);
    }
  }, [historyClientId, historyEnd, historyStart, statusFilter, token]);

  useEffect(() => {
    if (token) {
      void loadData();
    } else if (hydrated) {
      setLoading(false);
    }
  }, [hydrated, loadData, token]);

  useEffect(() => {
    if (token) {
      void loadSalesHistory();
    }
  }, [loadSalesHistory, token]);

  const productById = useMemo(() => new Map(produtos.map((produto) => [produto.id, produto])), [produtos]);
  const items = useMemo(
    () =>
      cart
        .map((cartItem) => ({ ...cartItem, product: productById.get(cartItem.productId) }))
        .filter((item): item is CartItem & { product: Produto } => Boolean(item.product)),
    [cart, productById]
  );
  const subtotal = useMemo(() => items.reduce((total, item) => total + toNumber(item.product.preco_venda) * item.quantity, 0), [items]);
  const discountValue = Math.max(0, toNumber(discount));
  const total = Math.max(0, subtotal - discountValue);
  const hasInsufficientStock = items.some((item) => item.quantity > Number(item.product.quantidade));
  const clientSuggestions = useMemo(() => {
    const term = clienteBusca.trim().toLowerCase();
    if (!term) {
      return clientes.slice(0, 6);
    }

    return clientes.filter((cliente) => `${cliente.nome} ${cliente.telefone} ${cliente.cpf ?? ""}`.toLowerCase().includes(term)).slice(0, 6);
  }, [clienteBusca, clientes]);

  function addProduct(produto: Produto) {
    setError(null);
    setSuccess(null);
    setLastSale(null);

    if (Number(produto.quantidade) <= 0) {
      setError(`Produto sem estoque: ${produto.nome}`);
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === produto.id);
      if (!existing) {
        return [...current, { productId: produto.id, quantity: 1 }];
      }

      if (existing.quantity >= Number(produto.quantidade)) {
        setError(`Estoque disponível para ${produto.nome}: ${produto.quantidade}`);
        return current;
      }

      return current.map((item) => (item.productId === produto.id ? { ...item, quantity: item.quantity + 1 } : item));
    });
  }

  function changeQuantity(productId: number, delta: number) {
    const product = productById.get(productId);
    if (!product) {
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.min(Number(product.quantidade), Math.max(1, item.quantity + delta)) } : item
      )
    );
  }

  function removeItem(productId: number) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  function selectClient(cliente: Cliente) {
    setSelectedClient(cliente);
    setClienteBusca(clientLabel(cliente));
    setShowClients(false);
  }

  async function finishSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Usuario nao autenticado.");
      return;
    }
    if (!items.length) {
      setError("Adicione ao menos um produto ao carrinho.");
      return;
    }
    if (hasInsufficientStock) {
      setError("Corrija itens com estoque insuficiente antes de finalizar.");
      return;
    }
    if (discountValue > subtotal) {
      setError("Desconto nao pode ser maior que o subtotal.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const venda = await api.criarVendaPdv(token, {
        cliente_id: selectedClient?.id ?? null,
        forma_pagamento: payment,
        desconto: discountValue,
        observacao: observacao.trim() || null,
        itens: items.map((item) => ({ produto_id: item.productId, quantidade: item.quantity }))
      });
      setLastSale(venda);
      setSuccess(`Venda #${venda.id} concluida com sucesso.`);
      setCart([]);
      setDiscount("0");
      setObservacao("");
      await loadData();
      await loadSalesHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao finalizar venda.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelLastSale() {
    if (!token || !lastSale) {
      return;
    }
    if (lastSale.status !== "concluida") {
      setError("Venda ja esta cancelada.");
      return;
    }

    if (!window.confirm(`Cancelar a venda #${lastSale.id} e devolver o estoque dos itens?`)) {
      return;
    }
    const motivo = window.prompt("Motivo do cancelamento (opcional)")?.trim() ?? "";

    setCanceling(true);
    setError(null);
    setSuccess(null);

    try {
      const venda = await api.cancelarVendaPdv(token, lastSale.id, { motivo: motivo || null });
      setLastSale(venda);
      setSuccess(`Venda #${venda.id} cancelada e estoque devolvido.`);
      await loadData();
      await loadSalesHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar venda.");
    } finally {
      setCanceling(false);
    }
  }

  async function cancelHistorySale(venda: Venda) {
    if (!token || venda.status !== "concluida") {
      return;
    }

    if (!window.confirm(`Cancelar a venda #${venda.id} e devolver o estoque dos itens?`)) {
      return;
    }
    const motivo = window.prompt("Motivo do cancelamento (opcional)")?.trim() ?? "";

    setCanceling(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedSale = await api.cancelarVendaPdv(token, venda.id, { motivo: motivo || null });
      setLastSale(updatedSale);
      setSelectedHistorySale(updatedSale);
      setSuccess(`Venda #${updatedSale.id} cancelada pelo histórico.`);
      await loadData();
      await loadSalesHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar venda.");
    } finally {
      setCanceling(false);
    }
  }

  async function openBackendReceipt(venda: Venda) {
    if (!token) {
      return;
    }

    try {
      const blob = await api.reciboVendaPdv(token, venda.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar recibo PDF.");
    }
  }

  if (!hydrated || loading) {
    return <DataTable<Produto> loading data={[]} columns={[{ key: "loading", header: "PDV", cell: () => null }]} />;
  }

  if (!token) {
    return <ApiErrorState message="Usuario nao autenticado. Faca login para usar o PDV." />;
  }

  return (
    <>
    <form className="grid gap-5 xl:grid-cols-[1fr_400px]" onSubmit={finishSale}>
      <section className="grid gap-5">
        {error ? <ApiErrorState message={error} onRetry={() => void loadData()} /> : null}
        {success ? (
          <section className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <span>{success}</span>
            {lastSale ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => printReceipt(lastSale)}>
                  <ReceiptText className="h-4 w-4" />
                  Recibo
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => void openBackendReceipt(lastSale)}>
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
                {lastSale.status === "concluida" ? (
                  <Button type="button" size="sm" variant="danger" disabled={canceling} onClick={cancelLastSale}>
                    <XCircle className="h-4 w-4" />
                    {canceling ? "Cancelando..." : "Cancelar venda"}
                  </Button>
                ) : (
                  <span className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
                    Venda cancelada{lastSale.cancelado_em ? ` em ${formatDateTime(lastSale.cancelado_em)}` : ""}
                  </span>
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="rounded border bg-card p-5 shadow-subtle">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold">Produtos</h2>
              <p className="text-sm text-muted-foreground">Busque produtos reais do estoque e adicione ao carrinho</p>
            </div>
            <div className="min-w-0 lg:w-96">
              <ProductAutocomplete produtos={produtos} label="Adicionar produto" clearOnSelect onSelect={addProduct} />
            </div>
          </div>

          <DataTable
            data={items}
            empty="Nenhum produto no carrinho."
            columns={[
              {
                key: "produto",
                header: "Produto",
                cell: (row) => (
                  <div>
                    <p className="font-semibold">{row.product.nome}</p>
                    <p className="text-xs text-muted-foreground">Estoque: {row.product.quantidade}</p>
                  </div>
                )
              },
              {
                key: "quantidade",
                header: "Qtd.",
                cell: (row) => (
                  <div className="flex h-10 w-32 items-center justify-between rounded border px-2">
                    <Button aria-label="Reduzir quantidade" type="button" size="icon" variant="ghost" onClick={() => changeQuantity(row.productId, -1)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold">{row.quantity}</span>
                    <Button aria-label="Aumentar quantidade" type="button" size="icon" variant="ghost" onClick={() => changeQuantity(row.productId, 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )
              },
              { key: "unitario", header: "Unitário", cell: (row) => formatCurrency(row.product.preco_venda) },
              { key: "total", header: "Total", cell: (row) => formatCurrency(toNumber(row.product.preco_venda) * row.quantity) },
              {
                key: "actions",
                header: "",
                cell: (row) => (
                  <Button aria-label="Remover item" title="Remover item" type="button" size="icon" variant="danger" onClick={() => removeItem(row.productId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )
              }
            ]}
          />
        </section>
      </section>

      <aside className="rounded border bg-card p-5 shadow-subtle">
        <h2 className="font-semibold">Resumo</h2>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
          <Input
            label="Cliente opcional"
            className="pl-9"
            value={clienteBusca}
            onChange={(event) => {
              setClienteBusca(event.target.value);
              setSelectedClient(null);
              setShowClients(true);
            }}
            onFocus={() => setShowClients(true)}
            placeholder="Consumidor nao identificado"
            autoComplete="off"
          />
          {showClients ? (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border bg-card shadow-xl">
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

        <div className="mt-5 grid gap-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <Input label="Desconto" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} />
          <div className="flex justify-between border-t pt-4 text-lg">
            <span className="font-semibold">Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.value}
                type="button"
                className={`grid h-20 place-items-center rounded border text-sm font-medium transition-colors ${
                  payment === method.value ? "border-primary bg-red-50 text-primary dark:bg-red-950/30" : "hover:bg-muted"
                }`}
                onClick={() => setPayment(method.value)}
              >
                <Icon className="h-5 w-5" />
                {method.label}
              </button>
            );
          })}
        </div>

        <Textarea className="mt-5" label="Observação" value={observacao} onChange={(event) => setObservacao(event.target.value)} />

        <Button className="mt-6 w-full" type="submit" disabled={saving || !items.length || hasInsufficientStock}>
          <ReceiptText className="h-4 w-4" />
          {saving ? "Finalizando..." : "Finalizar venda"}
        </Button>
      </aside>
    </form>
    <section className="mt-6 rounded border bg-card p-5 shadow-subtle">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="font-semibold">Histórico de vendas</h2>
          <p className="text-sm text-muted-foreground">Consulte vendas reais do PDV, gere recibos e cancele quando permitido</p>
        </div>
        <div className="grid gap-2 md:grid-cols-[180px_150px_150px_220px_auto] md:items-end">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Status
            <select className="h-10 rounded border bg-background px-3 text-sm text-foreground" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as VendaStatusFiltro)}>
              {statusFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Input label="Início" type="date" value={historyStart} onChange={(event) => setHistoryStart(event.target.value)} />
          <Input label="Fim" type="date" value={historyEnd} onChange={(event) => setHistoryEnd(event.target.value)} />
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Cliente
            <select className="h-10 rounded border bg-background px-3 text-sm text-foreground" value={historyClientId} onChange={(event) => setHistoryClientId(event.target.value)}>
              <option value="">Todos</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="secondary" onClick={() => void loadSalesHistory()}>
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </div>
      </div>

      <DataTable<Venda>
        loading={historyLoading}
        data={salesHistory}
        empty="Nenhuma venda encontrada."
        columns={[
          { key: "id", header: "Venda", cell: (row) => <span className="font-semibold">#{row.id}</span> },
          { key: "status", header: "Status", cell: (row) => <Badge tone={row.status === "concluida" ? "success" : "danger"}>{row.status}</Badge> },
          { key: "cliente", header: "Cliente", cell: (row) => row.cliente?.nome ?? "Consumidor não identificado" },
          { key: "itens", header: "Itens", cell: (row) => row.itens?.length ?? 0 },
          { key: "total", header: "Total", cell: (row) => formatCurrency(row.total) },
          { key: "data", header: "Data", cell: (row) => (row.createdAt ? formatDateTime(row.createdAt) : "-") },
          {
            key: "actions",
            header: "",
            cell: (row) => (
              <div className="flex justify-end gap-2">
                <Button aria-label="Ver detalhe" title="Ver detalhe" type="button" size="icon" variant="secondary" onClick={() => setSelectedHistorySale(row)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button aria-label="PDF" title="PDF" type="button" size="icon" variant="secondary" onClick={() => void openBackendReceipt(row)}>
                  <FileDown className="h-4 w-4" />
                </Button>
                {row.status === "concluida" ? (
                  <Button aria-label="Cancelar venda" title="Cancelar venda" type="button" size="icon" variant="danger" disabled={canceling} onClick={() => void cancelHistorySale(row)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            )
          }
        ]}
      />

      {selectedHistorySale ? (
        <section className="mt-5 rounded border bg-background p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="font-semibold">Venda #{selectedHistorySale.id}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedHistorySale.cliente?.nome ?? "Consumidor não identificado"} · {selectedHistorySale.createdAt ? formatDateTime(selectedHistorySale.createdAt) : "-"}
              </p>
              {selectedHistorySale.status === "cancelada" ? (
                <p className="mt-1 text-xs text-rose-600">
                  Cancelada{selectedHistorySale.cancelado_em ? ` em ${formatDateTime(selectedHistorySale.cancelado_em)}` : ""}
                  {selectedHistorySale.motivo_cancelamento ? ` · ${selectedHistorySale.motivo_cancelamento}` : ""}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => printReceipt(selectedHistorySale)}>
                <ReceiptText className="h-4 w-4" />
                Print
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => void openBackendReceipt(selectedHistorySale)}>
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
              {selectedHistorySale.status === "concluida" ? (
                <Button type="button" size="sm" variant="danger" disabled={canceling} onClick={() => void cancelHistorySale(selectedHistorySale)}>
                  <XCircle className="h-4 w-4" />
                  Cancelar
                </Button>
              ) : null}
            </div>
          </div>

          <DataTable
            data={selectedHistorySale.itens ?? []}
            empty="Venda sem itens."
            columns={[
              { key: "produto", header: "Produto", cell: (row) => row.nome_produto_snapshot },
              { key: "quantidade", header: "Qtd.", cell: (row) => row.quantidade },
              { key: "unitario", header: "Unitário", cell: (row) => formatCurrency(row.valor_unitario) },
              { key: "total", header: "Total", cell: (row) => formatCurrency(row.valor_total) }
            ]}
          />

          <div className="mt-4 grid gap-2 text-sm md:ml-auto md:w-80">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <strong>{formatCurrency(selectedHistorySale.subtotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desconto</span>
              <strong>{formatCurrency(selectedHistorySale.desconto)}</strong>
            </div>
            <div className="flex justify-between border-t pt-2 text-base">
              <span className="font-semibold">Total</span>
              <strong>{formatCurrency(selectedHistorySale.total)}</strong>
            </div>
          </div>
        </section>
      ) : null}
    </section>
    </>
  );
}
