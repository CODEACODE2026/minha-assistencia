import { MonitorSmartphone } from "lucide-react";
import { LoginForm } from "@/components/features/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <section className="w-full max-w-md rounded border bg-card p-6 shadow-subtle">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded bg-primary text-primary-foreground">
            <MonitorSmartphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Minha Assistência</h1>
            <p className="text-sm text-muted-foreground">Acesso administrativo</p>
          </div>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
