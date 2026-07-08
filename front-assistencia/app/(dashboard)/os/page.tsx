import { PageHeader } from "@/components/features/page-header";
import { ServiceOrdersList } from "@/components/features/service-orders-list";

export default function ServiceOrdersPage() {
  return (
    <>
      <PageHeader title="Ordens de Serviço" description="Acompanhe recebimento, análise, reparo e entrega" />
      <ServiceOrdersList />
    </>
  );
}
