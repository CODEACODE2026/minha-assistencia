import { MessageCircle, PlugZap, Send, Wifi } from "lucide-react";
import { PageHeader } from "@/components/features/page-header";
import { MetricCard } from "@/components/features/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { whatsAppMessages } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/utils";

export default function WhatsAppPage() {
  return (
    <>
      <PageHeader
        title="WhatsApp"
        description="Monitoramento da conexão e mensagens automáticas"
        action={
          <Button variant="secondary">
            <Send className="h-4 w-4" />
            Enviar teste
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Conexão" value="Online" change="Quepasa" icon={<Wifi className="h-5 w-5" />} />
        <MetricCard label="Mensagens hoje" value="28" change="+6" icon={<MessageCircle className="h-5 w-5" />} />
        <MetricCard label="Automações" value="5" change="ativas" icon={<PlugZap className="h-5 w-5" />} />
      </div>

      <DataTable
        data={whatsAppMessages}
        columns={[
          { key: "to", header: "Cliente", cell: (row) => row.to },
          { key: "phone", header: "Telefone", cell: (row) => row.phone },
          { key: "template", header: "Template", cell: (row) => row.template },
          { key: "status", header: "Status", cell: (row) => <Badge tone={row.status === "Lido" ? "success" : "info"}>{row.status}</Badge> },
          { key: "at", header: "Envio", cell: (row) => formatDateTime(row.at) }
        ]}
      />
    </>
  );
}
