import Link from "next/link";
import { AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApiErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const isAuth = message.toLowerCase().includes("token") || message.toLowerCase().includes("jwt") || message.toLowerCase().includes("autentic");

  return (
    <section className="rounded border bg-card p-6 text-center shadow-subtle">
      <AlertCircle className="mx-auto h-8 w-8 text-primary" />
      <h2 className="mt-3 font-semibold">Não foi possível carregar os dados</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <div className="mt-4 flex justify-center gap-2">
        {isAuth ? (
          <Link className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-primary-foreground" href="/login">
            <LogIn className="h-4 w-4" />
            Fazer login
          </Link>
        ) : null}
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        ) : null}
      </div>
    </section>
  );
}
