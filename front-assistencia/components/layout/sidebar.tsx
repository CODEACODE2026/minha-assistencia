"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageCircle,
  MonitorSmartphone,
  Receipt,
  Scale,
  Settings,
  Users
} from "lucide-react";
import { companyProfileUpdatedEvent, getStoredCompanyProfile, type CompanyProfile } from "@/lib/company-profile";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/diagnosticos", label: "Diagnostico Entrada", icon: ClipboardCheck },
  { href: "/orcamentos", label: "Orcamentos", icon: FileText },
  { href: "/os", label: "Ordem de Servico", icon: ClipboardList },
  { href: "/pdv", label: "PDV", icon: Receipt },
  { href: "/simulador", label: "Simulador", icon: Scale },
  { href: "/financeiro", label: "Financeiro", icon: BarChart3 },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/configuracoes", label: "Dados da Assistencia", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
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
    <aside className="hidden w-72 shrink-0 border-r bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="grid h-10 w-10 overflow-hidden rounded bg-primary text-primary-foreground">
          {profile.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo} alt={profile.nome} className="h-full w-full bg-white object-contain p-1" />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold uppercase tracking-wide text-primary">{profile.nome}</p>
          <p className="text-xs text-muted-foreground">Gestao tecnica</p>
        </div>
      </div>

      <nav className="grid gap-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-red-50 text-primary dark:bg-red-950/40"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
