"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Edit3, PackagePlus, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { ApiErrorState } from "@/components/features/api-state";
import { PageHeader } from "@/components/features/page-header";
import { ProductAutocomplete } from "@/components/features/product-autocomplete";
import { StockMap } from "@/components/features/stock-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { api, getStoredAuth } from "@/lib/api";
import type { Categoria, MovimentacaoEstoque, Produto } from "@/lib/types";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

type ProductForm = {
  nome: string;
  categoria_id: string;
  categoria: string;
  modelo_aparelho: string;
  marca_aparelho: string;
  quantidade: string;
  preco_custo: string;
  preco_venda: string;
  localizacao_estoque: string;
  observacao: string;
};

type CategoryForm = {
  nome: string;
  descricao: string;
  ativo: boolean;
};

type MovementForm = {
  produto_id: string;
  tipo: "entrada" | "ajuste_manual";
  quantidade: string;
  observacao: string;
};

type StockTab = "produtos" | "categorias" | "movimentacoes" | "mapa";

const emptyProductForm: ProductForm = {
  nome: "",
  categoria_id: "",
  categoria: "",
  modelo_aparelho: "",
  marca_aparelho: "",
  quantidade: "0",
  preco_custo: "0",
  preco_venda: "0",
  localizacao_estoque: "",
  observacao: ""
};

const emptyCategoryForm: CategoryForm = {
  nome: "",
  descricao: "",
  ativo: true
};

const emptyMovementForm: MovementForm = {
  produto_id: "",
  tipo: "entrada",
  quantidade: "1",
  observacao: ""
};

function getCategoryName(produto: Produto) {
  return produto.categoria_cadastro?.nome ?? produto.categoria ?? "-";
}

function getPrice(value: number | string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getProductProfit(produto: Produto) {
  return getPrice(produto.preco_venda) - getPrice(produto.preco_custo);
}

function getProductMargin(produto: Produto) {
  const salePrice = getPrice(produto.preco_venda);
  if (salePrice <= 0) {
    return 0;
  }

  return (getProductProfit(produto) / salePrice) * 100;
}

function toProductForm(produto: Produto): ProductForm {
  return {
    nome: produto.nome,
    categoria_id: produto.categoria_id ? String(produto.categoria_id) : "",
    categoria: produto.categoria ?? produto.categoria_cadastro?.nome ?? "",
    modelo_aparelho: produto.modelo_aparelho ?? "",
    marca_aparelho: produto.marca_aparelho ?? "",
    quantidade: String(produto.quantidade),
    preco_custo: String(produto.preco_custo),
    preco_venda: String(produto.preco_venda),
    localizacao_estoque: produto.localizacao_estoque ?? "",
    observacao: produto.observacao ?? ""
  };
}

function toCategoryForm(categoria: Categoria): CategoryForm {
  return {
    nome: categoria.nome,
    descricao: categoria.descricao ?? "",
    ativo: categoria.ativo
  };
}

function toProductPayload(form: ProductForm) {
  const categoriaId = Number(form.categoria_id);
  const hasCategoriaId = Number.isInteger(categoriaId) && categoriaId > 0;

  return {
    nome: form.nome.trim(),
    categoria_id: hasCategoriaId ? categoriaId : undefined,
    categoria: hasCategoriaId ? undefined : form.categoria.trim(),
    modelo_aparelho: form.modelo_aparelho.trim() || null,
    marca_aparelho: form.marca_aparelho.trim() || null,
    quantidade: Number(form.quantidade || 0),
    preco_custo: Number(form.preco_custo || 0),
    preco_venda: Number(form.preco_venda || 0),
    localizacao_estoque: form.localizacao_estoque.trim() || null,
    observacao: form.observacao.trim() || null
  };
}

function toCategoryPayload(form: CategoryForm) {
  return {
    nome: form.nome.trim(),
    descricao: form.descricao.trim() || null,
    ativo: form.ativo
  };
}

export function StockWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StockTab>("produtos");
  const [searchTerm, setSearchTerm] = useState("");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm);
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovementForm);

  useEffect(() => {
    setToken(getStoredAuth()?.token ?? null);
    setHydrated(true);
  }, []);

  const loadData = useCallback(
    async (termo: string) => {
      if (!token) {
        return;
      }

      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const [productsData, categoriesData, movementsData] = await Promise.all([
          termo.trim() ? api.buscarProdutos(token, termo.trim()) : api.produtos(token),
          api.categorias(token),
          api.movimentacoesEstoque(token)
        ]);
        setProdutos(productsData);
        setCategorias(categoriesData);
        setMovimentacoes(movementsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados do estoque.");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      void loadData("");
    } else if (hydrated) {
      setLoading(false);
    }
  }, [hydrated, loadData, token]);

  const stockSummary = useMemo(() => {
    const totalItems = produtos.reduce((total, produto) => total + produto.quantidade, 0);
    const lowStock = produtos.filter((produto) => produto.quantidade <= 2).length;
    const inventoryValue = produtos.reduce((total, produto) => total + produto.quantidade * getPrice(produto.preco_custo), 0);
    const saleValue = produtos.reduce((total, produto) => total + produto.quantidade * getPrice(produto.preco_venda), 0);
    const potentialProfit = saleValue - inventoryValue;

    return { totalItems, lowStock, inventoryValue, saleValue, potentialProfit };
  }, [produtos]);

  function updateProductField(field: keyof ProductForm, value: string) {
    setProductForm((current) => ({ ...current, [field]: value }));
  }

  function updateCategoryField(field: keyof CategoryForm, value: string | boolean) {
    setCategoryForm((current) => ({ ...current, [field]: value }));
  }

  function updateMovementField(field: keyof MovementForm, value: string) {
    setMovementForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateProductModal() {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductModalOpen(true);
  }

  function openEditProductModal(produto: Produto) {
    setEditingProduct(produto);
    setProductForm(toProductForm(produto));
    setProductModalOpen(true);
  }

  function openCreateCategoryModal() {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setCategoryModalOpen(true);
  }

  function openMovementModal(produto?: Produto) {
    setMovementForm({
      ...emptyMovementForm,
      produto_id: produto ? String(produto.id) : ""
    });
    setMovementModalOpen(true);
  }

  function openEditCategoryModal(categoria: Categoria) {
    setEditingCategory(categoria);
    setCategoryForm(toCategoryForm(categoria));
    setCategoryModalOpen(true);
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadData(searchTerm);
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Usuario nao autenticado.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = toProductPayload(productForm);
      const saved = editingProduct ? await api.atualizarProduto(token, editingProduct.id, payload) : await api.criarProduto(token, payload);

      setProdutos((current) => (editingProduct ? current.map((produto) => (produto.id === saved.id ? saved : produto)) : [saved, ...current]));
      setProductModalOpen(false);
      setEditingProduct(null);
      setProductForm(emptyProductForm);
      setSuccess(editingProduct ? "Produto alterado com sucesso." : "Produto cadastrado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Usuario nao autenticado.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = toCategoryPayload(categoryForm);
      const saved = editingCategory ? await api.atualizarCategoria(token, editingCategory.id, payload) : await api.criarCategoria(token, payload);

      setCategorias((current) => (editingCategory ? current.map((categoria) => (categoria.id === saved.id ? saved : categoria)) : [saved, ...current]));
      setCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);
      setSuccess(editingCategory ? "Categoria alterada com sucesso." : "Categoria cadastrada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveCategory(categoria: Categoria) {
    if (!token || !window.confirm(`Remover a categoria "${categoria.nome}"?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.removerCategoria(token, categoria.id);
      setCategorias((current) => current.filter((item) => item.id !== categoria.id));
      setSuccess("Categoria removida com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveProduct(produto: Produto) {
    if (!token || !window.confirm(`Confirmar exclusao do produto "${produto.nome}"?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.removerProduto(token, produto.id);
      setProdutos((current) => current.filter((item) => item.id !== produto.id));
      setSuccess("Produto removido com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel remover o produto. Verifique se ele possui vinculos.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMovementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Usuario nao autenticado.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.criarMovimentacaoEstoque(token, {
        produto_id: Number(movementForm.produto_id),
        tipo: movementForm.tipo,
        quantidade: Number(movementForm.quantidade),
        observacao: movementForm.observacao.trim() || null
      });
      setMovementModalOpen(false);
      setMovementForm(emptyMovementForm);
      setSuccess("Movimentacao de estoque registrada com sucesso.");
      await loadData(searchTerm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao movimentar estoque.");
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || loading) {
    return (
      <>
        <PageHeader title="Estoque" description="Cadastro, localizacao e controle de pecas" />
        <DataTable<Produto> loading data={[]} columns={[{ key: "loading", header: "Produtos", cell: () => null }]} />
      </>
    );
  }

  if (!token) {
    return (
      <>
        <PageHeader title="Estoque" description="Cadastro, localizacao e controle de pecas" />
        <ApiErrorState message="Usuario nao autenticado. Faca login para carregar o estoque." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Cadastre categorias, produtos e localize itens consumindo os dados da API"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={openCreateCategoryModal}>
              <Plus className="h-4 w-4" />
              Nova categoria
            </Button>
            <Button variant="secondary" onClick={() => openMovementModal()}>
              <ArrowLeftRight className="h-4 w-4" />
              Movimentar
            </Button>
            <Button onClick={openCreateProductModal}>
              <PackagePlus className="h-4 w-4" />
              Novo item
            </Button>
          </div>
        }
      />

      {error ? <ApiErrorState message={error} onRetry={() => void loadData(searchTerm)} /> : null}
      {success ? (
        <section className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {success}
        </section>
      ) : null}

      <div className="grid gap-5">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded border bg-card p-4 shadow-subtle">
            <p className="text-sm text-muted-foreground">Produtos cadastrados</p>
            <strong className="mt-1 block text-2xl">{produtos.length}</strong>
          </div>
          <div className="rounded border bg-card p-4 shadow-subtle">
            <p className="text-sm text-muted-foreground">Categorias ativas</p>
            <strong className="mt-1 block text-2xl">{categorias.filter((categoria) => categoria.ativo).length}</strong>
          </div>
          <div className="rounded border bg-card p-4 shadow-subtle">
            <p className="text-sm text-muted-foreground">Valor de custo</p>
            <strong className="mt-1 block text-2xl">{formatCurrency(stockSummary.inventoryValue)}</strong>
          </div>
          <div className="rounded border bg-card p-4 shadow-subtle">
            <p className="text-sm text-muted-foreground">Lucro estimado</p>
            <strong className={cn("mt-1 block text-2xl", stockSummary.potentialProfit < 0 ? "text-red-600" : "text-emerald-700")}>
              {formatCurrency(stockSummary.potentialProfit)}
            </strong>
          </div>
        </section>

        <section className="rounded border bg-card p-2 shadow-subtle">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { id: "produtos", label: "Produtos" },
              { id: "categorias", label: "Categorias" },
              { id: "movimentacoes", label: "Movimentacoes" },
              { id: "mapa", label: "Mapa" }
            ].map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  "h-10 rounded px-3 text-sm font-medium transition-colors hover:bg-muted",
                  activeTab === tab.id && "bg-primary text-primary-foreground hover:bg-primary"
                )}
                onClick={() => setActiveTab(tab.id as StockTab)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "produtos" ? (
          <section className="grid gap-4">
            <div className="rounded border bg-card p-4 shadow-subtle">
              <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSearch}>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
                  <Input
                    label="Buscar produto"
                    className="pl-9"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Nome, categoria, marca, modelo ou localizacao"
                  />
                </div>
                <Button type="submit" variant="secondary">
                  Buscar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("");
                    void loadData("");
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Recarregar
                </Button>
              </form>
            </div>

            <DataTable<Produto>
              data={produtos}
              empty="Nenhum produto encontrado."
              columns={[
                { key: "id", header: "ID", cell: (row) => <span className="font-semibold">#{row.id}</span> },
                {
                  key: "nome",
                  header: "Produto",
                  cell: (row) => (
                    <div>
                      <p className="font-medium">{row.nome}</p>
                      <p className="text-xs text-muted-foreground">{[row.marca_aparelho, row.modelo_aparelho].filter(Boolean).join(" ") || "-"}</p>
                    </div>
                  )
                },
                { key: "categoria", header: "Categoria", cell: (row) => getCategoryName(row) },
                {
                  key: "quantidade",
                  header: "Qtd.",
                  cell: (row) => <Badge tone={row.quantidade <= 2 ? "warning" : "success"}>{row.quantidade}</Badge>
                },
                { key: "preco_custo", header: "Custo", cell: (row) => formatCurrency(row.preco_custo) },
                { key: "preco_venda", header: "Venda", cell: (row) => formatCurrency(row.preco_venda) },
                {
                  key: "lucro",
                  header: "Lucro peca",
                  cell: (row) => (
                    <div>
                      <p className={cn("font-semibold", getProductProfit(row) < 0 ? "text-red-600" : "text-emerald-700")}>{formatCurrency(getProductProfit(row))}</p>
                      <p className="text-xs text-muted-foreground">{getProductMargin(row).toFixed(1)}%</p>
                    </div>
                  )
                },
                { key: "localizacao", header: "Localizacao", cell: (row) => row.localizacao_estoque ?? "-" },
                {
                  key: "actions",
                  header: "",
                  cell: (row) => (
                    <div className="flex justify-end gap-2">
                      <Button aria-label="Alterar" title="Alterar" size="icon" variant="secondary" onClick={() => openEditProductModal(row)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button aria-label="Movimentar estoque" title="Movimentar estoque" size="icon" variant="secondary" onClick={() => openMovementModal(row)}>
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                      <Button aria-label="Excluir" title="Excluir" size="icon" variant="danger" disabled={saving} onClick={() => void handleRemoveProduct(row)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </section>
        ) : null}

        {activeTab === "categorias" ? (
          <section className="rounded border bg-card p-4 shadow-subtle">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Categorias</h2>
                <p className="text-sm text-muted-foreground">Organize produtos por tipo de peca, acessorio ou servico</p>
              </div>
              <Button size="sm" variant="secondary" onClick={openCreateCategoryModal}>
                <Plus className="h-4 w-4" />
                Nova
              </Button>
            </div>

            <DataTable<Categoria>
              data={categorias}
              empty="Nenhuma categoria cadastrada."
              columns={[
                { key: "nome", header: "Nome", cell: (row) => <span className="font-medium">{row.nome}</span> },
                { key: "descricao", header: "Descricao", cell: (row) => row.descricao ?? "-" },
                { key: "ativo", header: "Status", cell: (row) => <Badge tone={row.ativo ? "success" : "default"}>{row.ativo ? "Ativa" : "Inativa"}</Badge> },
                {
                  key: "actions",
                  header: "",
                  cell: (row) => (
                    <div className="flex justify-end gap-1">
                      <Button aria-label="Alterar categoria" title="Alterar categoria" size="icon" variant="ghost" onClick={() => openEditCategoryModal(row)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button aria-label="Remover categoria" title="Remover categoria" size="icon" variant="danger" disabled={saving} onClick={() => void handleRemoveCategory(row)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </section>
        ) : null}

        {activeTab === "movimentacoes" ? (
          <section className="rounded border bg-card p-4 shadow-subtle">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Movimentacoes</h2>
                <p className="text-sm text-muted-foreground">Baixas automaticas por OS, estornos, entradas e ajustes manuais</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => openMovementModal()}>
                <ArrowLeftRight className="h-4 w-4" />
                Nova movimentacao
              </Button>
            </div>
            <DataTable<MovimentacaoEstoque>
              data={movimentacoes}
              empty="Nenhuma movimentacao registrada."
              columns={[
                { key: "data", header: "Data", cell: (row) => (row.createdAt ? formatDateTime(row.createdAt) : "-") },
                { key: "produto", header: "Produto", cell: (row) => row.produto?.nome ?? `Produto #${row.produto_id}` },
                { key: "tipo", header: "Tipo", cell: (row) => <Badge tone={row.tipo.includes("estorno") || row.tipo === "entrada" ? "success" : "warning"}>{row.tipo}</Badge> },
                { key: "quantidade", header: "Qtd.", cell: (row) => row.quantidade },
                { key: "estoque", header: "Estoque", cell: (row) => `${row.estoque_anterior} -> ${row.estoque_atual}` },
                { key: "origem", header: "Origem", cell: (row) => (row.orcamento_id ? `OS #${row.orcamento_id}` : "Manual") },
                { key: "observacao", header: "Observacao", cell: (row) => row.observacao ?? "-" }
              ]}
            />
          </section>
        ) : null}

        {activeTab === "mapa" ? <StockMap produtos={produtos} /> : null}
      </div>

      <Modal open={productModalOpen} title={editingProduct ? "Alterar produto" : "Novo produto"} className="max-w-4xl" onClose={() => setProductModalOpen(false)}>
        <form className="grid gap-4" onSubmit={handleProductSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nome" value={productForm.nome} onChange={(event) => updateProductField("nome", event.target.value)} required />

            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              <span>Categoria cadastrada</span>
              <select
                className={cn(
                  "h-10 w-full min-w-0 rounded border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                )}
                value={productForm.categoria_id}
                onChange={(event) => updateProductField("categoria_id", event.target.value)}
              >
                <option value="">Usar categoria em texto</option>
                {categorias
                  .filter((categoria) => categoria.ativo || String(categoria.id) === productForm.categoria_id)
                  .map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
              </select>
            </label>

            <Input
              label="Categoria em texto"
              value={productForm.categoria}
              onChange={(event) => updateProductField("categoria", event.target.value)}
              required={!productForm.categoria_id}
              disabled={Boolean(productForm.categoria_id)}
              placeholder="Compatibilidade quando nao usar categoria cadastrada"
            />
            <Input label="Marca do aparelho" value={productForm.marca_aparelho} onChange={(event) => updateProductField("marca_aparelho", event.target.value)} />
            <Input label="Modelo do aparelho" value={productForm.modelo_aparelho} onChange={(event) => updateProductField("modelo_aparelho", event.target.value)} />
            <Input
              label="Quantidade"
              type="number"
              min="0"
              value={productForm.quantidade}
              onChange={(event) => updateProductField("quantidade", event.target.value)}
            />
            <Input
              label="Preco de custo"
              type="number"
              min="0"
              step="0.01"
              value={productForm.preco_custo}
              onChange={(event) => updateProductField("preco_custo", event.target.value)}
            />
            <Input
              label="Preco de venda"
              type="number"
              min="0"
              step="0.01"
              value={productForm.preco_venda}
              onChange={(event) => updateProductField("preco_venda", event.target.value)}
            />
            <Input
              label="Localizacao"
              value={productForm.localizacao_estoque}
              onChange={(event) => updateProductField("localizacao_estoque", event.target.value)}
              placeholder="Prateleira A, Caixa 2"
            />
          </div>
          <Textarea label="Observacao" value={productForm.observacao} onChange={(event) => updateProductField("observacao", event.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setProductModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={categoryModalOpen} title={editingCategory ? "Alterar categoria" : "Nova categoria"} className="max-w-3xl" onClose={() => setCategoryModalOpen(false)}>
        <form className="grid gap-4" onSubmit={handleCategorySubmit}>
          <Input label="Nome" value={categoryForm.nome} onChange={(event) => updateCategoryField("nome", event.target.value)} required />
          <Textarea label="Descricao" value={categoryForm.descricao} onChange={(event) => updateCategoryField("descricao", event.target.value)} />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={categoryForm.ativo}
              onChange={(event) => updateCategoryField("ativo", event.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Categoria ativa
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCategoryModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={movementModalOpen} title="Movimentar estoque" className="max-w-3xl" onClose={() => setMovementModalOpen(false)}>
        <form className="grid gap-4" onSubmit={handleMovementSubmit}>
          <ProductAutocomplete
            produtos={produtos}
            label="Produto"
            selectedProductId={movementForm.produto_id}
            required
            onSelect={(produto) => updateMovementField("produto_id", String(produto.id))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-foreground">
              <span>Tipo</span>
              <select
                className="h-10 w-full min-w-0 rounded border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                value={movementForm.tipo}
                onChange={(event) => updateMovementField("tipo", event.target.value)}
              >
                <option value="entrada">Entrada</option>
                <option value="ajuste_manual">Ajuste manual</option>
              </select>
            </label>
            <Input
              label={movementForm.tipo === "ajuste_manual" ? "Nova quantidade em estoque" : "Quantidade de entrada"}
              type="number"
              min="1"
              value={movementForm.quantidade}
              onChange={(event) => updateMovementField("quantidade", event.target.value)}
              required
            />
          </div>
          <Textarea label="Observacao" value={movementForm.observacao} onChange={(event) => updateMovementField("observacao", event.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setMovementModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Registrar movimentacao"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
