import { ArrowDownRight, ArrowUpRight, Percent, Wallet } from "lucide-react";
import { MetricCard } from "@/components/features/metric-card";
import { PageHeader } from "@/components/features/page-header";
import { DataTable } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

const transactions = [
  { id: "MOV-901", type: "Entrada", description: "Troca de tela iPhone 13", amount: 890, margin: "41%" },
  { id: "MOV-902", type: "Saída", description: "Compra de bateria Redmi", amount: 592, margin: "-" },
  { id: "MOV-903", type: "Entrada", description: "Conector Galaxy A54", amount: 260, margin: "57%" }
];

export default function FinancePage() {
  return (
    <>
      <PageHeader title="Financeiro" description="Faturamento, lucro e movimentações recentes" />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Entradas" value="R$ 58.420" change="+18%" icon={<ArrowUpRight className="h-5 w-5" />} />
        <MetricCard label="Saídas" value="R$ 36.660" change="-4%" icon={<ArrowDownRight className="h-5 w-5" />} />
        <MetricCard label="Margem média" value="37,2%" change="+2,1%" icon={<Percent className="h-5 w-5" />} />
      </div>
      <DataTable
        data={transactions}
        columns={[
          { key: "id", header: "Movimento", cell: (row) => <span className="font-semibold">{row.id}</span> },
          { key: "type", header: "Tipo", cell: (row) => row.type },
          { key: "description", header: "Descrição", cell: (row) => row.description },
          { key: "amount", header: "Valor", cell: (row) => formatCurrency(row.amount) },
          { key: "margin", header: "Margem", cell: (row) => row.margin },
          { key: "wallet", header: "", cell: () => <Wallet className="h-4 w-4 text-muted-foreground" /> }
        ]}
      />
    </>
  );
}
