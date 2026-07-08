import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Smartphone, UserRound } from "lucide-react";
import { PageHeader } from "@/components/features/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { serviceOrders } from "@/lib/mock-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function ServiceOrderDetailsPage({ params }: { params: { id: string } }) {
  const order = serviceOrders.find((item) => item.id === params.id);

  if (!order) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={order.id}
        description="Detalhes da ordem de serviço"
        action={
          <Button variant="ghost">
            <Link className="inline-flex items-center gap-2" href="/os">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
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
              <Info label="Nome" value={order.cliente} />
              <Info label="Telefone" value={order.telefone} />
              <Info label="Status" value={<Badge tone={order.status === "Finalizado" ? "success" : "warning"}>{order.status}</Badge>} />
            </div>
          </div>

          <div className="rounded border bg-card p-5 shadow-subtle">
            <div className="mb-4 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Aparelho</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Info label="Modelo" value={order.aparelho} />
              <Info label="IMEI" value={order.imei} />
              <Info label="Valor aprovado" value={formatCurrency(order.valor)} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Info label="Defeito relatado" value={order.defeitoRelatado} />
              <Info label="Diagnóstico técnico" value={order.diagnostico} />
            </div>
          </div>
        </section>

        <aside className="rounded border bg-card p-5 shadow-subtle">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Histórico</h2>
          </div>
          <div className="relative grid gap-4 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
            {order.logs.map((log) => (
              <div key={`${log.at}-${log.event}`} className="relative pl-7">
                <span className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-primary bg-card" />
                <p className="font-medium">{log.event}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(log.at)} por {log.author}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
