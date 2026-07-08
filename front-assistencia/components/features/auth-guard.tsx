"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { api, clearStoredAuth, getStoredAuth, isUnauthorizedError } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      router.replace("/login");
      return;
    }

    const token = auth.token;
    let active = true;

    async function validateSession() {
      try {
        await api.validarToken(token);
        if (active) {
          setReady(true);
        }
      } catch (error) {
        if (isUnauthorizedError(error)) {
          clearStoredAuth();
        }

        if (active) {
          router.replace("/login");
        }
      }
    }

    void validateSession();

    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return children;
}
