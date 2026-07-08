import { PageHeader } from "@/components/features/page-header";
import { BudgetWorkspace } from "@/components/features/budget-workspace";

export default function BudgetsPage() {
  return (
    <>
      <PageHeader title="Orçamentos" description="Gere propostas e converta aprovações em ordens de serviço" />
      <BudgetWorkspace />
    </>
  );
}
