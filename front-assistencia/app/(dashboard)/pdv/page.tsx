import { PageHeader } from "@/components/features/page-header";
import { Checkout } from "@/components/features/checkout";

export default function PdvPage() {
  return (
    <>
      <PageHeader title="PDV" description="Checkout com itens, descontos e métodos de pagamento" />
      <Checkout />
    </>
  );
}
