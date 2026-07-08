"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, FileDown, Smartphone, UserRound, Wrench } from "lucide-react";
import { ApiErrorState } from "@/components/features/api-state";
import { PageHeader } from "@/components/features/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { api, getStoredAuth } from "@/lib/api";
import { getStoredCompanyProfile } from "@/lib/company-profile";
import { generateOrcamentoPdf } from "@/lib/document-pdf";
import type { Orcamento, OrcamentoStatus } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type OrderPart = {
  nome: string;
  quantidade: number;
  valor: number;
  produto_id?: number;
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

function parseParts(pecas: Orcamento["pecas_usadas"]): OrderPart[] {
  if (Array.isArray(pecas)) {
    return pecas.map((part) => ({
      nome: String(part.nome || "Peca sem nome"),
      quantidade: Number(part.quantidade) || 0,
      valor: toNumber(part.valor),
      produto_id: part.produto_id
    }));
  }

  if (typeof pecas === "string") {
    try {
      const parsed = JSON.parse(pecas);
      return Array.isArray(parsed) ? parseParts(parsed as Orcamento["pecas_usadas"]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function buildHistory(order: Orcamento) {
  return [
    order.createdAt
      ? {
          at: order.createdAt,
          event: "OS criada",
          detail: order.cliente?.nome ? `Vinculada ao cliente ${order.cliente.nome}` : `Cliente #${order.cliente_id}`
        }
      : null,
    order.estoque_baixado
      ? {
          at: order.updatedAt ?? order.createdAt ?? "",
          event: "Estoque baixado",
          detail: "Peças vinculadas foram reservadas/baixadas conforme status da OS."
        }
      : null,
    {
      at: order.updatedAt ?? order.createdAt ?? "",
      event: `Status atual: ${order.status}`,
      detail: order.status === "finalizado" ? "OS finalizada." : "OS ainda pode seguir o fluxo operacional pela listagem."
    }
  ].filter(Boolean) as Array<{ at: string; event: string; detail: string }>;
}

function DetailLoading() {
  return (
    <>
      <PageHeader title="OS" description="Detalhes da ordem de serviço" />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="grid gap-5">
          <Skeleton className="h-36" />
          <Skeleton className="h-52" />
          <Skeleton className="h-48" />
        </section>
        <Skeleton className="h-80" />
      </div>
    </>
  );
}

export default function ServiceOrderDetailsPage({ params }: { params: { id: string } }) {
  const orderId = Number(params.id);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [order, setOrder] = useState<Orcamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(getStoredAuth()?.token ?? null);
    setHydrated(true);
  }, []);

  const loadOrder = useCallback(async () => {
    if (!token || !Number.isInteger(orderId) || orderId <= 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.orcamento(token, orderId);
      setOrder(data);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : "Erro ao carregar OS.");
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    if (token) {
      void loadOrder();
    } else if (hydrated) {
      setLoading(false);
    }
  }, [hydrated, loadOrder, token]);

  const parts = useMemo(() => (order ? parseParts(order.pecas_usadas) : []), [order]);
  const history = useMemo(() => (order ? buildHistory(order) : []), [order]);
  const partsTotal = parts.reduce((total, part) => total + part.quantidade * part.valor, 0);

  if (!hydrated || loading) {
    return <DetailLoading />;
  }

  if (!token) {
    return (
      <>
        <PageHeader title="OS" description="Detalhes da ordem de serviço" action={<BackButton />} />
        <ApiErrorState message="Usuário não autenticado." />
      </>
    );
  }

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return (
      <>
        <PageHeader title="OS inválida" description="Detalhes da ordem de serviço" action={<BackButton />} />
        <section className="rounded border bg-card p-8 text-center text-sm text-muted-foreground shadow-subtle">Informe uma OS válida para visualizar os detalhes.</section>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title={`OS #${orderId}`} description="Detalhes da ordem de serviço" action={<BackButton />} />
        <ApiErrorState message={error} onRetry={loadOrder} />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <PageHeader title={`OS #${orderId}`} description="Detalhes da ordem de serviço" action={<BackButton />} />
        <section className="rounded border bg-card p-8 text-center text-sm text-muted-foreground shadow-subtle">OS não encontrada.</section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`OS #${order.id}`}
        description="Detalhes da ordem de serviço"
        action={
          <>
            <Button variant="secondary" onClick={() => generateOrcamentoPdf(getStoredCompanyProfile(), order, "os")}>
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <BackButton />
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="grid gap-5">
          <div className="rounded border bg-card p-5 shadow-subtle">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Cliente</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Info label="Nome" value={order.cliente?.nome ?? `Cliente #${order.cliente_id}`} />
              <Info label="Telefone" value={order.cliente?.telefone ?? "-"} />
              <Info label="CPF" value={order.cliente?.cpf ?? "-"} />
            </div>
          </div>

          <div className="rounded border bg-card p-5 shadow-subtle">
            <div className="mb-4 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Aparelho e serviço</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Info label="Aparelho" value={order.aparelho} />
              <Info label="Status" value={<Badge tone={statusTone[order.status]}>{order.status}</Badge>} />
              <Info label="Estoque" value={order.estoque_baixado ? "Baixado" : "Não baixado"} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Info label="Defeito relatado" value={order.defeito_relatado} />
              <Info label="Serviço" value={order.servico} />
            </div>
            {order.observacao ? <Info className="mt-5" label="Observação" value={order.observacao} /> : null}
          </div>

          <div className="rounded border bg-card p-5 shadow-subtle">
            <div className="mb-4 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Itens e valores</h2>
            </div>
            <DataTable<OrderPart>
              data={parts}
              empty="Nenhum item vinculado a esta OS."
              columns={[
                { key: "nome", header: "Item", cell: (row) => row.nome },
                { key: "quantidade", header: "Qtd.", cell: (row) => row.quantidade },
                { key: "valor", header: "Unitário", cell: (row) => formatCurrency(row.valor) },
                { key: "total", header: "Total", cell: (row) => formatCurrency(row.quantidade * row.valor) }
              ]}
            />
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Peças" value={formatCurrency(order.valor_pecas || partsTotal)} />
              <Info label="Mão de obra" value={formatCurrency(order.valor_mao_obra)} />
              <Info label="Desconto" value={formatCurrency(order.desconto)} />
              <Info label="Total" value={<strong>{formatCurrency(order.valor_total)}</strong>} />
            </div>
          </div>

          <div className="rounded border bg-card p-5 shadow-subtle">
            <h2 className="font-semibold">Ações disponíveis</h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <p>PDF da OS disponível nesta tela.</p>
              <p>{order.status === "finalizado" ? "OS finalizada: edição bloqueada pela regra atual." : "Edição, alteração de status e exclusão permanecem disponíveis pela listagem de OS."}</p>
              <p>{order.status === "finalizado" ? "Termo de entrega e envio de WhatsApp permanecem disponíveis pela listagem de OS." : "Termo de entrega fica disponível quando a OS for finalizada."}</p>
            </div>
          </div>
        </section>

        <aside className="rounded border bg-card p-5 shadow-subtle">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Histórico</h2>
          </div>
          <div className="relative grid gap-4 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
            {history.map((log) => (
              <div key={`${log.at}-${log.event}`} className="relative pl-7">
                <span className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-primary bg-card" />
                <p className="font-medium">{log.event}</p>
                <p className="text-sm text-muted-foreground">{log.at ? formatDateTime(log.at) : "-"}</p>
                <p className="text-sm text-muted-foreground">{log.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function BackButton() {
  return (
    <Button variant="ghost">
      <Link className="inline-flex items-center gap-2" href="/os">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>
    </Button>
  );
}

function Info({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
