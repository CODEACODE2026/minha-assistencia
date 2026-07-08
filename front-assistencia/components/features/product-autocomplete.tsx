"use client";

import { useEffect, useMemo, useState } from "react";
import type { Produto } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type ProductAutocompleteProps = {
  produtos: Produto[];
  label: string;
  placeholder?: string;
  selectedProductId?: string;
  required?: boolean;
  clearOnSelect?: boolean;
  onSelect: (produto: Produto) => void;
};

function productLabel(produto: Produto) {
  return `${produto.nome} - atual: ${produto.quantidade}`;
}

function productSearchText(produto: Produto) {
  return [
    produto.nome,
    produto.categoria,
    produto.categoria_cadastro?.nome,
    produto.modelo_aparelho,
    produto.marca_aparelho,
    produto.localizacao_estoque
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function ProductAutocomplete({ produtos, label, placeholder = "Digite para buscar produto", selectedProductId, required, clearOnSelect, onSelect }: ProductAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!selectedProductId || clearOnSelect) {
      if (!selectedProductId) setQuery("");
      return;
    }

    const selected = produtos.find((produto) => produto.id === Number(selectedProductId));
    setQuery(selected ? productLabel(selected) : "");
  }, [clearOnSelect, produtos, selectedProductId]);

  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return produtos.filter((produto) => productSearchText(produto).includes(term)).slice(0, 8);
  }, [produtos, query]);

  function selectProduct(produto: Produto) {
    onSelect(produto);
    setQuery(clearOnSelect ? "" : productLabel(produto));
    setOpen(false);
  }

  return (
    <div className="relative grid gap-1.5 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        className="h-10 w-full min-w-0 rounded border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(Boolean(query.trim()))}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {open && query.trim() ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded border bg-card shadow-xl">
          {suggestions.length ? (
            suggestions.map((produto) => (
              <button key={produto.id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); selectProduct(produto); }}>
                <span className="font-medium">{produto.nome}</span>
                <span className="ml-2 text-muted-foreground">Qtd. {produto.quantidade} | {formatCurrency(produto.preco_venda)}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
