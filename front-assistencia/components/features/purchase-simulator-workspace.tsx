"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, HelpCircle, Plus, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { ApiErrorState } from "@/components/features/api-state";
import { PageHeader } from "@/components/features/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/table";
import { api, getStoredAuth } from "@/lib/api";
import type { PecaNecessaria, SimulacaoCompra } from "@/lib/types";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

type SimulatorForm = {
  modelo_aparelho: string;
  valor_compra: string;
  valor_frete: string;
  outros_custos: string;
  margem_lucro_percentual: string;
  valor_venda_estimado: string;
};

type SimulatorPart = {
  id: number;
  nome: string;
  valor: string;
};

const emptyForm: SimulatorForm = {
  modelo_aparelho: "",
  valor_compra: "0",
  valor_frete: "0",
  outros_custos: "0",
  margem_lucro_percentual: "30",
  valor_venda_estimado: "0"
};

function toNumber(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseParts(pecas: SimulacaoCompra["pecas_necessarias"]): PecaNecessaria[] {
  if (Array.isArray(pecas)) {
    return pecas;
  }

  if (typeof pecas === "string") {
    try {
      const parsed = JSON.parse(pecas);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getStoredToken() {
  return getStoredAuth()?.token ?? null;
}

export function PurchaseSimulatorWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [simulacoes, setSimulacoes] = useState<SimulacaoCompra[]>([]);
  const [editing, setEditing] = useState<SimulacaoCompra | null>(null);
  const [form, setForm] = useState<SimulatorForm>(emptyForm);
  const [parts, setParts] = useState<SimulatorPart[]>([{ id: 1, nome: "", valor: "0" }]);

  useEffect(() => {
    setToken(getStoredToken());
    setHydrated(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.simulacoesCompra(token);
      setSimulacoes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar simulacoes.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadData();
    } else if (hydrated) {
      setLoading(false);
    }
  }, [hydrated, loadData, token]);

  const calculation = useMemo(() => {
    const valorCompra = toNumber(form.valor_compra);
    const valorFrete = toNumber(form.valor_frete);
    const outrosCustos = toNumber(form.outros_custos);
    const margemDesejada = toNumber(form.margem_lucro_percentual);
    const vendaEstimada = toNumber(form.valor_venda_estimado);
    const valorTotalPecas = parts.reduce((total, part) => total + toNumber(part.valor), 0);
    const custoTotal = valorCompra + valorFrete + valorTotalPecas + outrosCustos;
    const lucroEstimado = vendaEstimada - custoTotal;
    const precoMinimo = custoTotal * (1 + margemDesejada / 100);
    const margemReal = custoTotal > 0 ? (lucroEstimado / custoTotal) * 100 : 0;
    const compensaComprar = vendaEstimada >= precoMinimo && lucroEstimado > 0;
    const diferencaPrecoMinimo = vendaEstimada - precoMinimo;

    return {
      valorCompra,
      valorFrete,
      outrosCustos,
      margemDesejada,
      vendaEstimada,
      valorTotalPecas,
      custoTotal,
      lucroEstimado,
      precoMinimo,
      margemReal,
      compensaComprar,
      diferencaPrecoMinimo
    };
  }, [form, parts]);

  function updateField(field: keyof SimulatorForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updatePart(id: number, field: keyof Omit<SimulatorPart, "id">, value: string) {
    setParts((current) => current.map((part) => (part.id === id ? { ...part, [field]: value } : part)));
  }

  function addPart() {
    setParts((current) => [...current, { id: Date.now(), nome: "", valor: "0" }]);
  }

  function removePart(id: number) {
    setParts((current) => (current.length > 1 ? current.filter((part) => part.id !== id) : [{ id: Date.now(), nome: "", valor: "0" }]));
  }

  function clearForm() {
    setForm(emptyForm);
    setParts([{ id: Date.now(), nome: "", valor: "0" }]);
    setEditing(null);
    setError(null);
    setSuccess(null);
  }

  function openEdit(simulacao: SimulacaoCompra) {
    const parsedParts = parseParts(simulacao.pecas_necessarias);
    setEditing(simulacao);
    setForm({
      modelo_aparelho: simulacao.modelo_aparelho,
      valor_compra: String(simulacao.valor_compra ?? 0),
      valor_frete: String(simulacao.valor_frete ?? 0),
      outros_custos: String(simulacao.outros_custos ?? 0),
      margem_lucro_percentual: String(simulacao.margem_lucro_percentual ?? 30),
      valor_venda_estimado: String(simulacao.valor_venda_estimado ?? 0)
    });
    setParts(
      parsedParts.length
        ? parsedParts.map((part, index) => ({ id: Date.now() + index, nome: part.nome, valor: String(part.valor ?? 0) }))
        : [{ id: Date.now(), nome: "", valor: "0" }]
    );
    setSuccess(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeSimulation(simulacao: SimulacaoCompra) {
    if (!token || !window.confirm(`Confirmar exclusao da simulacao #${simulacao.id}?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.removerSimulacaoCompra(token, simulacao.id);
      setSimulacoes((current) => current.filter((item) => item.id !== simulacao.id));
      if (editing?.id === simulacao.id) {
        clearForm();
      }
      setSuccess("Simulacao removida com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover simulacao.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Usuario nao autenticado.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const pecas = parts
        .map((part) => ({ nome: part.nome.trim(), valor: toNumber(part.valor) }))
        .filter((part) => part.nome || part.valor > 0);
      const payload = {
        modelo_aparelho: form.modelo_aparelho.trim(),
        valor_compra: calculation.valorCompra,
        valor_frete: calculation.valorFrete,
        pecas_necessarias: pecas,
        valor_total_pecas: calculation.valorTotalPecas,
        outros_custos: calculation.outrosCustos,
        margem_lucro_percentual: calculation.margemDesejada,
        valor_venda_estimado: calculation.vendaEstimada
      };
      const saved = editing ? await api.atualizarSimulacaoCompra(token, editing.id, payload) : await api.criarSimulacaoCompra(token, payload);

      setSimulacoes((current) => (editing ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current]));
      setEditing(null);
      setSuccess(editing ? "Simulacao alterada com sucesso." : "Simulacao salva com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar simulacao.");
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || loading) {
    return (
      <>
        <PageHeader title="Simulador de Compra" description="Analise de viabilidade para revenda de aparelhos e pecas." />
        <DataTable<SimulacaoCompra> loading data={[]} columns={[{ key: "loading", header: "Simulacoes", cell: () => null }]} />
      </>
    );
  }

  if (!token) {
    return (
      <>
        <PageHeader title="Simulador de Compra" description="Analise de viabilidade para revenda de aparelhos e pecas." />
        <ApiErrorState message="Usuario nao autenticado. Faca login para usar o simulador." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Simulador de Compra" description="Analise de viabilidade para revenda de aparelhos e pecas." />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form className="grid min-w-0 gap-5" onSubmit={handleSubmit}>
          {error ? <ApiErrorState message={error} onRetry={() => void loadData()} /> : null}
          {success ? (
            <section className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              {success}
            </section>
          ) : null}

          <section className="grid gap-4 rounded border bg-card p-4 shadow-subtle">
            <div className="flex items-center gap-2 border-b pb-3">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">{editing ? `Alterando simulacao #${editing.id}` : "Dados da negociacao"}</h2>
            </div>

            <Input
              label="Modelo do aparelho"
              placeholder="Ex.: iPhone 13 Pro Max 256GB"
              value={form.modelo_aparelho}
              onChange={(event) => updateField("modelo_aparelho", event.target.value)}
              required
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Valor de compra" type="number" min="0" step="0.01" value={form.valor_compra} onChange={(event) => updateField("valor_compra", event.target.value)} required />
              <Input label="Frete / Logistica" type="number" min="0" step="0.01" value={form.valor_frete} onChange={(event) => updateField("valor_frete", event.target.value)} />
            </div>

            <div className="grid gap-3 rounded border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Pecas necessarias</h3>
                  <p className="text-xs text-muted-foreground">Informe pecas, reparos e custos previstos.</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={addPart}>
                  <Plus className="h-4 w-4" />
                  Peca
                </Button>
              </div>

              {parts.map((part) => (
                <div key={part.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
                  <Input aria-label="Nome da peca" placeholder="Ex.: Tela frontal, bateria" value={part.nome} onChange={(event) => updatePart(part.id, "nome", event.target.value)} />
                  <Input aria-label="Valor da peca" type="number" min="0" step="0.01" value={part.valor} onChange={(event) => updatePart(part.id, "valor", event.target.value)} />
                  <Button aria-label="Remover peca" type="button" size="icon" variant="ghost" onClick={() => removePart(part.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Custo das pecas" value={formatCurrency(calculation.valorTotalPecas)} readOnly />
              <Input label="Outros custos" type="number" min="0" step="0.01" value={form.outros_custos} onChange={(event) => updateField("outros_custos", event.target.value)} />
              <Input label="Margem de lucro desejada (%)" type="number" min="0" step="0.01" value={form.margem_lucro_percentual} onChange={(event) => updateField("margem_lucro_percentual", event.target.value)} />
              <Input label="Valor de venda estimado" type="number" min="0" step="0.01" value={form.valor_venda_estimado} onChange={(event) => updateField("valor_venda_estimado", event.target.value)} required />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={clearForm}>
                {editing ? "Cancelar edicao" : "Limpar"}
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : editing ? "Salvar alteracao" : "Salvar"}
              </Button>
            </div>
          </section>
        </form>

        <aside className="grid content-start gap-4">
          <section
            className={cn(
              "grid place-items-center rounded border bg-card p-5 text-center shadow-subtle",
              calculation.compensaComprar ? "border-emerald-200" : calculation.lucroEstimado < 0 ? "border-red-200" : "border-amber-200"
            )}
          >
            <p className="font-semibold">Compensa comprar?</p>
            <div className="my-4 grid h-16 w-16 place-items-center rounded bg-muted text-muted-foreground">
              <HelpCircle className="h-8 w-8" />
            </div>
            <strong className={cn("text-2xl", calculation.compensaComprar ? "text-emerald-700" : calculation.lucroEstimado < 0 ? "text-red-600" : "text-amber-700")}>
              {calculation.vendaEstimada <= 0 || calculation.custoTotal <= 0 ? "Aguardando dados" : calculation.compensaComprar ? "Sim" : "Nao"}
            </strong>
            <p className="mt-2 text-sm text-muted-foreground">
              {calculation.vendaEstimada <= 0 || calculation.custoTotal <= 0
                ? "Preencha os valores para analisar."
                : calculation.compensaComprar
                  ? "Venda estimada cobre a margem desejada."
                  : "Venda estimada esta abaixo do preco minimo."}
            </p>
          </section>

          <section className="rounded border bg-card p-4 shadow-subtle">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Resultados da simulacao</h2>
            <ResultLine label="Custo total" value={formatCurrency(calculation.custoTotal)} />
            <ResultLine label="Lucro liquido" value={formatCurrency(calculation.lucroEstimado)} danger={calculation.lucroEstimado < 0} success={calculation.lucroEstimado > 0} />
            <ResultLine label="Preco min. venda" value={formatCurrency(calculation.precoMinimo)} strong />
            <ResultLine label="Margem real" value={`${calculation.margemReal.toFixed(1)}%`} />
            <ResultLine
              label={calculation.diferencaPrecoMinimo >= 0 ? "Folga acima minimo" : "Falta para minimo"}
              value={formatCurrency(Math.abs(calculation.diferencaPrecoMinimo))}
              danger={calculation.diferencaPrecoMinimo < 0}
              success={calculation.diferencaPrecoMinimo >= 0 && calculation.vendaEstimada > 0}
            />
          </section>
        </aside>
      </div>

      <section className="mt-5 grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Simulacoes salvas</h2>
          <Badge tone="info">{simulacoes.length} registros</Badge>
        </div>
        <DataTable<SimulacaoCompra>
          data={simulacoes}
          empty="Nenhuma simulacao salva."
          columns={[
            { key: "id", header: "ID", cell: (row) => <span className="font-semibold">#{row.id}</span> },
            { key: "data", header: "Data", cell: (row) => (row.createdAt ? formatDateTime(row.createdAt) : "-") },
            { key: "modelo", header: "Aparelho", cell: (row) => row.modelo_aparelho },
            { key: "custo", header: "Custo", cell: (row) => formatCurrency(row.custo_total) },
            { key: "venda", header: "Venda estimada", cell: (row) => formatCurrency(row.valor_venda_estimado) },
            {
              key: "lucro",
              header: "Lucro",
              cell: (row) => <span className={toNumber(row.lucro_estimado) < 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-700"}>{formatCurrency(row.lucro_estimado)}</span>
            },
            { key: "margem", header: "Margem", cell: (row) => `${toNumber(row.margem_real_percentual).toFixed(1)}%` },
            { key: "compensa", header: "Resultado", cell: (row) => <Badge tone={row.compensa_comprar ? "success" : "danger"}>{row.compensa_comprar ? "Compensa" : "Nao compensa"}</Badge> },
            { key: "pecas", header: "Pecas", cell: (row) => parseParts(row.pecas_necessarias).map((part) => part.nome).filter(Boolean).join(", ") || "-" },
            {
              key: "actions",
              header: "",
              cell: (row) => (
                <div className="flex justify-end gap-2">
                  <Button aria-label="Alterar" title="Alterar" size="icon" variant="secondary" onClick={() => openEdit(row)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button aria-label="Excluir" title="Excluir" size="icon" variant="danger" disabled={saving} onClick={() => void removeSimulation(row)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </section>
    </>
  );
}

function ResultLine({ label, value, strong, danger, success }: { label: string; value: string; strong?: boolean; danger?: boolean; success?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(strong && "font-bold", danger && "text-red-600", success && "text-emerald-700")}>{value}</span>
    </div>
  );
}
