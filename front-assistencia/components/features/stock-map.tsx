"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Produto } from "@/lib/types";
import { cn } from "@/lib/utils";

type StockMapProps = {
  produtos: Produto[];
};

function getLocationParts(produto: Produto) {
  const rawLocation = produto.localizacao_formatada ?? produto.localizacao_estoque ?? "Sem localização";
  const parts = rawLocation
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    shelf: parts[0] ?? "Sem localização",
    box: parts.slice(1).join(" > ") || "Itens"
  };
}

function getCategoryName(produto: Produto) {
  return produto.categoria_cadastro?.nome ?? produto.categoria ?? "";
}

export function StockMap({ produtos }: StockMapProps) {
  const [term, setTerm] = useState("");

  const normalized = term.trim().toLowerCase();
  const stockLocations = useMemo(() => {
    const grouped = new Map<string, Map<string, Produto[]>>();

    produtos.forEach((produto) => {
      const { shelf, box } = getLocationParts(produto);
      if (!grouped.has(shelf)) {
        grouped.set(shelf, new Map());
      }

      const shelfBoxes = grouped.get(shelf)!;
      shelfBoxes.set(box, [...(shelfBoxes.get(box) ?? []), produto]);
    });

    return Array.from(grouped.entries()).map(([shelf, boxes]) => ({
      shelf,
      boxes: Array.from(boxes.entries()).map(([label, items]) => ({
        id: `${shelf}-${label}`,
        label,
        items
      }))
    }));
  }, [produtos]);

  const matches = useMemo(() => {
    if (!normalized) {
      return [];
    }

    return stockLocations.flatMap((shelf) =>
      shelf.boxes.flatMap((box) =>
        box.items
          .filter((item) =>
            `${item.nome} ${getCategoryName(item)} ${item.modelo_aparelho ?? ""} ${item.marca_aparelho ?? ""}`.toLowerCase().includes(normalized)
          )
          .map((item) => ({ shelf: shelf.shelf, box: box.label, item }))
      )
    );
  }, [normalized, stockLocations]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="rounded border bg-card p-5 shadow-subtle">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold">Mapa físico</h2>
            <p className="text-sm text-muted-foreground">Prateleiras e gavetas com destaque por busca</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
            <Input label="Buscar item" className="pl-9" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Tela iPhone, bateria..." />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stockLocations.map((shelf) => (
            <div key={shelf.shelf} className="rounded border bg-muted/30 p-3">
              <h3 className="mb-3 text-sm font-semibold">{shelf.shelf}</h3>
              <div className="grid gap-3">
                {shelf.boxes.map((box) => {
                  const highlighted = normalized
                    ? box.items.some((item) =>
                        `${item.nome} ${getCategoryName(item)} ${item.modelo_aparelho ?? ""} ${item.marca_aparelho ?? ""}`.toLowerCase().includes(normalized)
                      )
                    : false;

                  return (
                    <div
                      key={box.id}
                      className={cn(
                        "min-h-28 rounded border bg-card p-3 transition-colors",
                        highlighted && "border-primary bg-red-50 ring-2 ring-primary/20 dark:bg-red-950/30"
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold">{box.label}</span>
                        <span className="text-xs text-muted-foreground">{box.items.length} itens</span>
                      </div>
                      <div className="grid gap-1">
                        {box.items.length ? (
                          box.items.map((item) => (
                            <span key={item.id} className="truncate rounded bg-muted px-2 py-1 text-xs" title={item.nome}>
                              {item.nome} ({item.quantidade})
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Livre</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded border bg-card p-5 shadow-subtle">
        <h2 className="font-semibold">Resultado da busca</h2>
        <div className="mt-4 grid gap-3">
          {!normalized ? <p className="text-sm text-muted-foreground">Digite um produto para localizar no estoque.</p> : null}
          {normalized && !matches.length ? <p className="text-sm text-muted-foreground">Nenhum item localizado.</p> : null}
          {matches.map((match) => (
            <div key={`${match.shelf}-${match.box}-${match.item.id}`} className="rounded border p-3">
              <p className="font-semibold">{match.item.nome}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {match.shelf} &gt; {match.box}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Quantidade: {match.item.quantidade}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
