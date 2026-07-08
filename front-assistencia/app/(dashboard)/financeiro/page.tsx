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
import type { FinanceiroPeriodo, FinanceiroSummary, MovimentacaoEstoque, Orcamento } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const periodOptions: Array<{ value: FinanceiroPeriodo; label: string }> = [
  { value: "mes_atual", label: "Mês atual" },
  { value: "ultimos_30_dias", label: "Últimos 30 dias" },
  { value: "ano_atual", label: "Ano atual" },
  { value: "todos", label: "Todos" }
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

function movementLabel(type: MovimentacaoEstoque["tipo"]) {
  const labels: Record<MovimentacaoEstoque["tipo"], string> = {
    entrada: "Entrada",
    saida_os: "Saída OS",
    saida_venda: "Saída venda",
    estorno_os: "Estorno OS",
    ajuste_manual: "Ajuste manual"
  };

  return labels[type] ?? type;
}

function movementValue(row: MovimentacaoEstoque) {
  const unitCost = Number(row.produto?.preco_custo ?? 0);
  return Number.isFinite(unitCost) ? unitCost * Number(row.quantidade || 0) : 0;
}

export default function FinancePage() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [periodo, setPeriodo] = useState<FinanceiroPeriodo>("mes_atual");
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
      const data = await api.financeiro(token, { periodo });
      setFinanceiro(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar financeiro.");
    } finally {
      setLoading(false);
    }
  }, [periodo, token]);

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
      { label: "Receita", value: formatCurrency(financeiro.indicadores.receita), change: "OS finalizadas", icon: ArrowUpRight },
      { label: "Despesas", value: formatCurrency(financeiro.indicadores.despesas), change: "custo estimado", icon: ArrowDownRight },
      { label: "Saldo", value: formatCurrency(financeiro.indicadores.saldo), change: "receita - custos", icon: Wallet },
      { label: "Ticket médio", value: formatCurrency(financeiro.indicadores.ticket_medio), change: `${financeiro.indicadores.os_finalizadas} OS`, icon: ReceiptText },
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
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" />
          Período
        </div>
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
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((card) => {
          const Icon = card.icon;
          return <MetricCard key={card.label} label={card.label} value={card.value} change={card.change} icon={<Icon className="h-5 w-5" />} />;
        })}
      </div>

      {!financeiro.indicadores.os_finalizadas && !financeiro.movimentacoes_relacionadas.length ? (
        <section className="mb-6 rounded border bg-card p-8 text-center text-sm text-muted-foreground shadow-subtle">
          Nenhuma OS finalizada ou movimentação encontrada no período selecionado.
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">OS finalizadas</h2>
            <Badge tone="info">{financeiro.os_finalizadas.length} registros</Badge>
          </div>
          <DataTable<Orcamento>
            data={financeiro.os_finalizadas}
            empty="Nenhuma OS finalizada no período."
            columns={[
              { key: "id", header: "OS", cell: (row) => <span className="font-semibold">#{row.id}</span> },
              { key: "cliente", header: "Cliente", cell: (row) => row.cliente?.nome ?? `Cliente #${row.cliente_id}` },
              { key: "aparelho", header: "Aparelho", cell: (row) => row.aparelho },
              { key: "valor", header: "Receita", cell: (row) => formatCurrency(row.valor_total) },
              { key: "data", header: "Finalização", cell: (row) => (row.updatedAt ? formatDateTime(row.updatedAt) : "-") }
            ]}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Movimentações relacionadas</h2>
            <Badge tone="info">{financeiro.movimentacoes_relacionadas.length} registros</Badge>
          </div>
          <DataTable<MovimentacaoEstoque>
            data={financeiro.movimentacoes_relacionadas}
            empty="Nenhuma movimentação no período."
            columns={[
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
