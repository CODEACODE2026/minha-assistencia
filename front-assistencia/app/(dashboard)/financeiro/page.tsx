"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Percent, ReceiptText, Wallet } from "lucide-react";
import { ApiErrorState } from "@/components/features/api-state";
import { MetricCard } from "@/components/features/metric-card";
import { PageHeader } from "@/components/features/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { api, getStoredAuth } from "@/lib/api";
import type { FinanceiroLancamento, FinanceiroMovimentacao, FinanceiroOrigem, FinanceiroPeriodo, FinanceiroSummary, Orcamento } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const periodOptions: Array<{ value: FinanceiroPeriodo; label: string }> = [
  { value: "mes_atual", label: "Mês atual" },
  { value: "ultimos_30_dias", label: "Últimos 30 dias" },
  { value: "ano_atual", label: "Ano atual" },
  { value: "todos", label: "Todos" }
];

const originOptions: Array<{ value: FinanceiroOrigem; label: string }> = [
  { value: "todos", label: "Todos" },
  { value: "os", label: "OS" },
  { value: "pdv", label: "PDV" }
];

function FinanceLoading() {
  return (
    <>
      <PageHeader title="Financeiro" description="Faturamento, custos e movimentações recentes" />
      <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <section key={index} className="rounded border bg-card p-4 shadow-subtle">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-6 h-8 w-24" />
          </section>
        ))}
      </div>
      <Skeleton className="mb-6 h-16" />
      <DataTable<Orcamento> loading data={[]} columns={[{ key: "loading", header: "Financeiro", cell: () => null }]} />
    </>
  );
}

function movementLabel(type: FinanceiroMovimentacao["tipo"]) {
  const labels: Record<FinanceiroMovimentacao["tipo"], string> = {
    entrada: "Entrada",
    saida_os: "Saída OS",
    saida_venda: "Saída venda",
    estorno_os: "Estorno OS",
    estorno_venda: "Estorno venda",
    ajuste_manual: "Ajuste manual"
  };

  return labels[type] ?? type;
}

function movementValue(row: FinanceiroMovimentacao) {
  const unitCost = Number(row.produto?.preco_custo ?? 0);
  return Number.isFinite(unitCost) ? unitCost * Number(row.quantidade || 0) : 0;
}

export default function FinancePage() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [periodo, setPeriodo] = useState<FinanceiroPeriodo>("mes_atual");
  const [origem, setOrigem] = useState<FinanceiroOrigem>("todos");
  const [financeiro, setFinanceiro] = useState<FinanceiroSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(getStoredAuth()?.token ?? null);
    setHydrated(true);
  }, []);

  const loadFinanceiro = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.financeiro(token, { periodo, origem });
      setFinanceiro(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar financeiro.");
    } finally {
      setLoading(false);
    }
  }, [origem, periodo, token]);

  useEffect(() => {
    if (token) {
      void loadFinanceiro();
    } else if (hydrated) {
      setLoading(false);
    }
  }, [hydrated, loadFinanceiro, token]);

  const metrics = useMemo(() => {
    if (!financeiro) {
      return [];
    }

    return [
      { label: "Receita", value: formatCurrency(financeiro.indicadores.receita), change: financeiro.origem === "todos" ? "OS + PDV" : financeiro.origem.toUpperCase(), icon: ArrowUpRight },
      { label: "Despesas", value: formatCurrency(financeiro.indicadores.despesas), change: "custo estimado", icon: ArrowDownRight },
      { label: "Saldo", value: formatCurrency(financeiro.indicadores.saldo), change: "receita - custos", icon: Wallet },
      { label: "Ticket médio", value: formatCurrency(financeiro.indicadores.ticket_medio), change: `${financeiro.indicadores.lancamentos_total} lançamentos`, icon: ReceiptText },
      { label: "Margem média", value: `${financeiro.indicadores.margem_media_percentual.toFixed(1)}%`, change: "estimada", icon: Percent }
    ];
  }, [financeiro]);

  if (!hydrated || loading) {
    return <FinanceLoading />;
  }

  if (!token) {
    return (
      <>
        <PageHeader title="Financeiro" description="Faturamento, custos e movimentações recentes" />
        <ApiErrorState message="Usuário não autenticado." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Financeiro" description="Faturamento, custos e movimentações recentes" />
        <ApiErrorState message={error} onRetry={loadFinanceiro} />
      </>
    );
  }

  if (!financeiro) {
    return (
      <>
        <PageHeader title="Financeiro" description="Faturamento, custos e movimentações recentes" />
        <section className="rounded border bg-card p-8 text-center text-sm text-muted-foreground shadow-subtle">Nenhum indicador financeiro disponível.</section>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Financeiro" description="Faturamento, custos e movimentações recentes" />

      <div className="mb-6 flex flex-col gap-3 rounded border bg-card p-3 shadow-subtle lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" />
            Período e origem
          </div>
          <p className="text-xs text-muted-foreground">
            {financeiro.indicadores.os_finalizadas} OS finalizadas · {financeiro.indicadores.vendas_pdv_concluidas} vendas PDV
          </p>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                className={`h-9 rounded border px-3 text-sm font-medium transition-colors hover:bg-muted ${
                  periodo === option.value ? "border-primary bg-red-50 text-primary dark:bg-red-950/30" : ""
                }`}
                onClick={() => setPeriodo(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {originOptions.map((option) => (
              <button
                key={option.value}
                className={`h-9 rounded border px-3 text-sm font-medium transition-colors hover:bg-muted ${
                  origem === option.value ? "border-primary bg-red-50 text-primary dark:bg-red-950/30" : ""
                }`}
                onClick={() => setOrigem(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((card) => {
          const Icon = card.icon;
          return <MetricCard key={card.label} label={card.label} value={card.value} change={card.change} icon={<Icon className="h-5 w-5" />} />;
        })}
      </div>

      {!financeiro.indicadores.lancamentos_total && !financeiro.movimentacoes_relacionadas.length ? (
        <section className="mb-6 rounded border bg-card p-8 text-center text-sm text-muted-foreground shadow-subtle">
          Nenhum lançamento ou movimentação encontrado nos filtros selecionados.
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Lançamentos</h2>
            <Badge tone="info">{financeiro.lancamentos.length} registros</Badge>
          </div>
          <DataTable<FinanceiroLancamento>
            data={financeiro.lancamentos}
            empty="Nenhum lançamento no período."
            columns={[
              {
                key: "origem",
                header: "Origem",
                cell: (row) => <Badge tone={row.origem === "PDV" ? "success" : "info"}>{row.origem}</Badge>
              },
              { key: "id", header: "Registro", cell: (row) => <span className="font-semibold">#{row.id}</span> },
              { key: "cliente", header: "Cliente", cell: (row) => row.cliente_nome },
              { key: "descricao", header: "Descrição", cell: (row) => row.descricao },
              { key: "receita", header: "Receita", cell: (row) => formatCurrency(row.receita) },
              { key: "custo", header: "Custo", cell: (row) => formatCurrency(row.custo) },
              { key: "data", header: "Data", cell: (row) => (row.data ? formatDateTime(row.data) : "-") }
            ]}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Movimentações relacionadas</h2>
            <Badge tone="info">{financeiro.movimentacoes_relacionadas.length} registros</Badge>
          </div>
          <DataTable<FinanceiroMovimentacao>
            data={financeiro.movimentacoes_relacionadas}
            empty="Nenhuma movimentação no período."
            columns={[
              { key: "origem", header: "Origem", cell: (row) => <Badge tone={row.origem === "PDV" ? "success" : "info"}>{row.origem}</Badge> },
              { key: "tipo", header: "Tipo", cell: (row) => movementLabel(row.tipo) },
              { key: "produto", header: "Produto", cell: (row) => row.produto?.nome ?? `Produto #${row.produto_id}` },
              { key: "quantidade", header: "Qtd.", cell: (row) => row.quantidade },
              { key: "valor", header: "Custo estimado", cell: (row) => formatCurrency(movementValue(row)) },
              { key: "data", header: "Data", cell: (row) => (row.createdAt ? formatDateTime(row.createdAt) : "-") }
            ]}
          />
        </section>
      </div>
    </>
  );
}
