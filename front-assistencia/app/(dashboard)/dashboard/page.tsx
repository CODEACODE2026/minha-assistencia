"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, ClipboardList, FileText, PackageSearch, Users, Wallet } from "lucide-react";
import { ApiErrorState } from "@/components/features/api-state";
import { DonutChartCard, LineChartCard } from "@/components/features/charts";
import { MetricCard } from "@/components/features/metric-card";
import { PageHeader } from "@/components/features/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { api, getStoredAuth } from "@/lib/api";
import type { DashboardSummary, MovimentacaoEstoque, Orcamento, OrcamentoStatus, Produto } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const statusLabels: Record<OrcamentoStatus, string> = {
  aberto: "Aberta",
  aprovado: "Em andamento",
  recusado: "Recusada",
  finalizado: "Finalizada"
};

const statusTones: Record<OrcamentoStatus, "success" | "warning" | "danger" | "info"> = {
  aberto: "warning",
  aprovado: "info",
  recusado: "danger",
  finalizado: "success"
};

const statusColors: Record<OrcamentoStatus, string> = {
  aberto: "#F59E0B",
  aprovado: "#2563EB",
  recusado: "#DC2626",
  finalizado: "#059669"
};

function DashboardLoading() {
  return (
    <>
      <PageHeader title="Dashboard" description="Visão operacional da assistência técnica" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <section key={index} className="rounded border bg-card p-4 shadow-subtle">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-6 h-8 w-24" />
          </section>
        ))}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <section className="mt-6">
        <DataTable<Orcamento> loading data={[]} columns={[{ key: "loading", header: "OS", cell: () => null }]} />
      </section>
    </>
  );
}

function toNumber(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
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

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(getStoredAuth()?.token ?? null);
    setHydrated(true);
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.dashboard(token);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadDashboard();
    } else if (hydrated) {
      setLoading(false);
    }
  }, [hydrated, loadDashboard, token]);

  const metrics = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      { label: "Clientes", value: String(dashboard.indicadores.clientes), change: "base ativa", icon: Users },
      { label: "OS abertas", value: String(dashboard.indicadores.os_abertas), change: "aguardando", icon: ClipboardList },
      { label: "Em andamento", value: String(dashboard.indicadores.os_em_andamento), change: "aprovadas", icon: FileText },
      { label: "Receita", value: formatCurrency(dashboard.indicadores.receita_periodo), change: "mês atual", icon: Banknote },
      { label: "Ticket médio", value: formatCurrency(dashboard.indicadores.ticket_medio), change: "finalizadas", icon: Wallet }
    ];
  }, [dashboard]);

  const statusSeries = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return (Object.keys(statusLabels) as OrcamentoStatus[]).map((status) => ({
      label: statusLabels[status],
      value: dashboard.os_por_status[status] ?? 0,
      color: statusColors[status]
    }));
  }, [dashboard]);

  if (!hydrated || loading) {
    return <DashboardLoading />;
  }

  if (!token) {
    return (
      <>
        <PageHeader title="Dashboard" description="Visão operacional da assistência técnica" />
        <ApiErrorState message="Usuário não autenticado." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" description="Visão operacional da assistência técnica" />
        <ApiErrorState message={error} onRetry={loadDashboard} />
      </>
    );
  }

  if (!dashboard) {
    return (
      <>
        <PageHeader title="Dashboard" description="Visão operacional da assistência técnica" />
        <section className="rounded border bg-card p-8 text-center text-sm text-muted-foreground shadow-subtle">Nenhum indicador disponível.</section>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Visão operacional da assistência técnica" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((card) => {
          const Icon = card.icon;
          return <MetricCard key={card.label} label={card.label} value={card.value} change={card.change} icon={<Icon className="h-5 w-5" />} />;
        })}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
        <LineChartCard data={dashboard.receita_mensal} />
        <DonutChartCard counts={statusSeries} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">OS recentes</h2>
            <Badge tone="info">{dashboard.os_recentes.length} registros</Badge>
          </div>
          <DataTable<Orcamento>
            data={dashboard.os_recentes}
            empty="Nenhuma OS encontrada."
            columns={[
              { key: "id", header: "OS", cell: (row) => <span className="font-semibold">#{row.id}</span> },
              { key: "cliente", header: "Cliente", cell: (row) => row.cliente?.nome ?? `Cliente #${row.cliente_id}` },
              { key: "aparelho", header: "Aparelho", cell: (row) => row.aparelho },
              { key: "status", header: "Status", cell: (row) => <Badge tone={statusTones[row.status]}>{statusLabels[row.status]}</Badge> },
              { key: "valor", header: "Valor", cell: (row) => formatCurrency(row.valor_total) }
            ]}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Estoque baixo</h2>
            <Badge tone={dashboard.produtos_estoque_baixo.length ? "warning" : "success"}>{dashboard.produtos_estoque_baixo.length} itens</Badge>
          </div>
          <DataTable<Produto>
            data={dashboard.produtos_estoque_baixo}
            empty="Nenhum produto com estoque baixo."
            columns={[
              { key: "produto", header: "Produto", cell: (row) => row.nome },
              { key: "quantidade", header: "Qtd.", cell: (row) => <span className="font-semibold">{row.quantidade}</span> },
              { key: "valor", header: "Venda", cell: (row) => formatCurrency(row.preco_venda) }
            ]}
          />
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Movimentações recentes</h2>
          <Badge tone="info">{dashboard.movimentacoes_recentes.length} registros</Badge>
        </div>
        <DataTable<MovimentacaoEstoque>
          data={dashboard.movimentacoes_recentes}
          empty="Nenhuma movimentação de estoque encontrada."
          columns={[
            { key: "tipo", header: "Tipo", cell: (row) => movementLabel(row.tipo) },
            { key: "produto", header: "Produto", cell: (row) => row.produto?.nome ?? `Produto #${row.produto_id}` },
            { key: "quantidade", header: "Qtd.", cell: (row) => row.quantidade },
            { key: "estoque", header: "Estoque", cell: (row) => `${row.estoque_anterior} → ${row.estoque_atual}` },
            { key: "data", header: "Data", cell: (row) => (row.createdAt ? formatDateTime(row.createdAt) : "-") }
          ]}
        />
      </section>

      {dashboard.indicadores.produtos_estoque_baixo || dashboard.indicadores.movimentacoes_recentes ? null : (
        <section className="mt-6 rounded border bg-card p-5 text-sm text-muted-foreground shadow-subtle">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <PackageSearch className="h-4 w-4 text-primary" />
            Operação sem alertas no momento
          </div>
          <p className="mt-1">Cadastre clientes, OS e movimentações para alimentar os indicadores operacionais.</p>
        </section>
      )}
    </>
  );
}
