"use client";

import { Bell, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { companyProfileUpdatedEvent, getStoredCompanyProfile, type CompanyProfile } from "@/lib/company-profile";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const [profile, setProfile] = useState<CompanyProfile>(() => getStoredCompanyProfile());

  useEffect(() => {
    const updateProfile = () => setProfile(getStoredCompanyProfile());
    updateProfile();
    window.addEventListener(companyProfileUpdatedEvent, updateProfile);
    window.addEventListener("storage", updateProfile);

    return () => {
      window.removeEventListener(companyProfileUpdatedEvent, updateProfile);
      window.removeEventListener("storage", updateProfile);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <div className="relative w-full max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Buscar" className="pl-9" placeholder="Buscar cliente, OS, IMEI ou produto" />
      </div>

      <div className="flex items-center gap-2">
        <Button aria-label="Notificacoes" size="icon" variant="ghost">
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <div className="hidden items-center gap-3 rounded border bg-card px-3 py-2 shadow-subtle sm:flex">
          <div className="grid h-8 w-8 overflow-hidden rounded bg-gray-900 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
            {profile.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.logo} alt={profile.nome} className="h-full w-full bg-white object-contain p-1" />
            ) : (
              <span className="grid h-full w-full place-items-center">{getInitials(profile.nome) || "MA"}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="max-w-44 truncate text-sm font-semibold leading-none">{profile.nome}</p>
            <p className="mt-1 max-w-44 truncate text-xs text-muted-foreground">{profile.telefone || "Operacao"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
