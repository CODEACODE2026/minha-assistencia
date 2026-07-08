"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, FileDown, History, Plus, Trash2 } from "lucide-react";
import { ApiErrorState } from "@/components/features/api-state";
import { PageHeader } from "@/components/features/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { api, getStoredAuth } from "@/lib/api";
import { companyProfileUpdatedEvent, getStoredCompanyProfile, type CompanyProfile } from "@/lib/company-profile";
import { generateClientHistoryPdf } from "@/lib/document-pdf";
import type { Cliente, Orcamento, OrcamentoStatus } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type ClientForm = {
  nome: string;
  telefone: string;
  cpf: string;
  endereco: string;
  observacao: string;
};

const emptyForm: ClientForm = {
  nome: "",
  telefone: "",
  cpf: "",
  endereco: "",
  observacao: ""
};

const statusTone: Record<OrcamentoStatus, "success" | "warning" | "danger" | "info"> = {
  aberto: "warning",
  aprovado: "success",
  recusado: "danger",
  finalizado: "info"
};

function toNumber(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseParts(pecas: Orcamento["pecas_usadas"]) {
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

function toForm(cliente: Cliente): ClientForm {
  return {
    nome: cliente.nome,
    telefone: cliente.telefone,
    cpf: cliente.cpf ?? "",
    endereco: cliente.endereco ?? "",
    observacao: cliente.observacao ?? ""
  };
}

function toPayload(form: ClientForm) {
  return {
    nome: form.nome.trim(),
    telefone: form.telefone.trim(),
    cpf: form.cpf.trim() || null,
    endereco: form.endereco.trim() || null,
    observacao: form.observacao.trim() || null
  };
}

export function ClientsWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [selectedHistoryOrderId, setSelectedHistoryOrderId] = useState<number | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => getStoredCompanyProfile());
  const [form, setForm] = useState<ClientForm>(emptyForm);

  useEffect(() => {
    setToken(getStoredAuth()?.token ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const updateProfile = () => setCompanyProfile(getStoredCompanyProfile());
    updateProfile();
    window.addEventListener(companyProfileUpdatedEvent, updateProfile);
    window.addEventListener("storage", updateProfile);

    return () => {
      window.removeEventListener(companyProfileUpdatedEvent, updateProfile);
      window.removeEventListener("storage", updateProfile);
    };
  }, []);

  const loadClientes = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const [clientsData, budgetsData] = await Promise.all([api.clientes(token), api.orcamentos(token)]);
      setClientes(clientsData);
      setOrcamentos(budgetsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadClientes();
    } else if (hydrated) {
      setLoading(false);
    }
  }, [hydrated, loadClientes, token]);

  function updateField(field: keyof ClientForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEditModal(cliente: Cliente) {
    setEditing(cliente);
    setForm(toForm(cliente));
    setOpen(true);
  }

  function openHistoryModal(cliente: Cliente) {
    setSelectedClient(cliente);
    setSelectedHistoryOrderId(null);
    setHistoryOpen(true);
  }

  const selectedHistory = useMemo(() => {
    if (!selectedClient) {
      return {
        orders: [] as Orcamento[],
        totalSpent: 0,
        totalServices: 0,
        selectedOrder: null as Orcamento | null,
        selectedParts: [] as Array<{ nome: string; quantidade: number; valor: number; total: number }>
      };
    }

    const orders = orcamentos
      .filter((orcamento) => orcamento.cliente_id === selectedClient.id)
      .sort((a, b) => new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime());
    const selectedOrder = orders.find((orcamento) => orcamento.id === selectedHistoryOrderId) ?? orders[0] ?? null;
    const selectedParts = selectedOrder
      ? parseParts(selectedOrder.pecas_usadas).map((part) => ({
          nome: part.nome,
          quantidade: Number(part.quantidade),
          valor: toNumber(part.valor),
          total: Number(part.quantidade) * toNumber(part.valor)
        }))
      : [];

    return {
      orders,
      totalSpent: orders.reduce((total, order) => total + toNumber(order.valor_total), 0),
      totalServices: orders.length,
      selectedOrder,
      selectedParts
    };
  }, [orcamentos, selectedClient, selectedHistoryOrderId]);


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
      const payload = toPayload(form);
      const saved = editing ? await api.atualizarCliente(token, editing.id, payload) : await api.criarCliente(token, payload);

      setClientes((current) => (editing ? current.map((cliente) => (cliente.id === saved.id ? saved : cliente)) : [saved, ...current]));
      setSuccess(editing ? "Cliente alterado com sucesso." : "Cliente cadastrado com sucesso.");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(cliente: Cliente) {
    if (!token || !window.confirm(`Confirmar exclusao do cliente "${cliente.nome}"?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.removerCliente(token, cliente.id);
      setClientes((current) => current.filter((item) => item.id !== cliente.id));
      setSuccess("Cliente removido com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel remover o cliente. Verifique se ele possui OS, orcamentos ou vendas vinculadas.");
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || loading) {
    return (
      <>
        <PageHeader title="Clientes" description="Cadastro centralizado para atendimentos, orcamentos e OS" />
        <DataTable<Cliente> loading data={[]} columns={[{ key: "loading", header: "Clientes", cell: () => null }]} />
      </>
    );
  }

  if (!token) {
    return (
      <>
        <PageHeader title="Clientes" description="Cadastro centralizado para atendimentos, orcamentos e OS" />
        <ApiErrorState message="Usuario nao autenticado. Faca login para carregar os clientes." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cadastro centralizado para atendimentos, orcamentos e OS"
        action={
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        }
      />

      {error ? <ApiErrorState message={error} onRetry={() => void loadClientes()} /> : null}
      {success ? (
        <section className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {success}
        </section>
      ) : null}

      <DataTable<Cliente>
        data={clientes}
        empty="Nenhum cliente cadastrado."
        columns={[
          { key: "id", header: "ID", cell: (row) => <span className="font-semibold">#{row.id}</span> },
          { key: "nome", header: "Nome", cell: (row) => row.nome },
          { key: "telefone", header: "Telefone", cell: (row) => row.telefone },
          { key: "cpf", header: "CPF", cell: (row) => row.cpf ?? "-" },
          { key: "endereco", header: "Endereco", cell: (row) => row.endereco ?? "-" },
          {
            key: "actions",
            header: "",
            cell: (row) => (
              <div className="flex justify-end gap-2">
                <Button aria-label="Alterar" title="Alterar" size="icon" variant="secondary" onClick={() => openEditModal(row)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button aria-label="Historico" title="Historico" size="icon" variant="secondary" onClick={() => openHistoryModal(row)}>
                  <History className="h-4 w-4" />
                </Button>
                <Button aria-label="Excluir" title="Excluir" size="icon" variant="danger" disabled={saving} onClick={() => void handleRemove(row)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          }
        ]}
      />

      <Modal open={open} title={editing ? "Alterar cliente" : "Novo cliente"} className="max-w-3xl" onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nome" value={form.nome} onChange={(event) => updateField("nome", event.target.value)} required />
            <Input label="Telefone" value={form.telefone} onChange={(event) => updateField("telefone", event.target.value)} required />
            <Input label="CPF" value={form.cpf} onChange={(event) => updateField("cpf", event.target.value)} />
            <Input label="Endereco" value={form.endereco} onChange={(event) => updateField("endereco", event.target.value)} />
          </div>
          <Textarea label="Observacao" value={form.observacao} onChange={(event) => updateField("observacao", event.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={historyOpen} title={selectedClient ? `Historico de ${selectedClient.nome}` : "Historico do cliente"} className="max-w-5xl" onClose={() => setHistoryOpen(false)}>
        {selectedClient ? (
          <div className="grid gap-5">
            <section className="flex min-w-0 flex-col gap-4 overflow-hidden rounded border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 overflow-hidden rounded border bg-muted/30">
                  {companyProfile.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={companyProfile.logo} alt={companyProfile.nome} className="block h-full w-full object-contain p-1" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-sm font-semibold text-muted-foreground">Logo</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="break-words font-semibold">{companyProfile.nome}</p>
                  <p className="break-words text-sm text-muted-foreground">{[companyProfile.telefone, companyProfile.whatsapp, companyProfile.email].filter(Boolean).join(" | ") || "Dados da assistencia nao cadastrados."}</p>
                  <p className="break-words text-sm text-muted-foreground">{[companyProfile.endereco, companyProfile.cidade].filter(Boolean).join(" - ")}</p>
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => generateClientHistoryPdf(companyProfile, selectedClient, selectedHistory.orders)}>
                <FileDown className="h-4 w-4" />
                Gerar PDF
              </Button>
            </section>

            <section className="grid gap-3 md:grid-cols-4">
              <div className="rounded border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">Telefone</p>
                <strong className="mt-1 block">{selectedClient.telefone}</strong>
              </div>
              <div className="rounded border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">Servicos/OS</p>
                <strong className="mt-1 block">{selectedHistory.totalServices}</strong>
              </div>
              <div className="rounded border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">Total em servicos</p>
                <strong className="mt-1 block">{formatCurrency(selectedHistory.totalSpent)}</strong>
              </div>
              <div className="rounded border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">CPF</p>
                <strong className="mt-1 block">{selectedClient.cpf ?? "-"}</strong>
              </div>
            </section>

            <section className="grid gap-3">
              <div>
                <h3 className="font-semibold">Servicos e orcamentos</h3>
                <p className="text-sm text-muted-foreground">Historico vinculado ao cliente pela API.</p>
              </div>
              <DataTable<Orcamento>
                data={selectedHistory.orders}
                empty="Nenhum servico ou orcamento para este cliente."
                columns={[
                  { key: "id", header: "Registro", cell: (row) => <span className="font-semibold">#{row.id}</span> },
                  { key: "data", header: "Data", cell: (row) => (row.createdAt ? formatDateTime(row.createdAt) : "-") },
                  { key: "aparelho", header: "Aparelho", cell: (row) => row.aparelho },
                  { key: "servico", header: "Servico", cell: (row) => row.servico },
                  { key: "status", header: "Status", cell: (row) => <Badge tone={statusTone[row.status]}>{row.status}</Badge> },
                  { key: "total", header: "Total", cell: (row) => formatCurrency(row.valor_total) },
                  {
                    key: "pecas",
                    header: "",
                    cell: (row) => (
                      <Button
                        size="sm"
                        variant={selectedHistory.selectedOrder?.id === row.id ? "primary" : "secondary"}
                        onClick={() => setSelectedHistoryOrderId(row.id)}
                      >
                        Ver pecas
                      </Button>
                    )
                  }
                ]}
              />
            </section>

            <section className="grid gap-3">
              <div>
                <h3 className="font-semibold">Produtos e pecas do registro selecionado</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedHistory.selectedOrder
                    ? `Mostrando itens do registro #${selectedHistory.selectedOrder.id} - ${selectedHistory.selectedOrder.aparelho}.`
                    : "Selecione um orcamento ou OS para ver os itens usados."}
                </p>
              </div>
              <DataTable<(typeof selectedHistory.selectedParts)[number]>
                data={selectedHistory.selectedParts}
                empty="Nenhum produto vinculado a este registro."
                columns={[
                  { key: "nome", header: "Produto", cell: (row) => row.nome },
                  { key: "quantidade", header: "Quantidade", cell: (row) => row.quantidade },
                  { key: "valor", header: "Valor unitario", cell: (row) => formatCurrency(row.valor) },
                  { key: "total", header: "Total", cell: (row) => formatCurrency(row.total) }
                ]}
              />
            </section>

            {selectedClient.observacao ? (
              <section className="rounded border bg-muted/30 p-3">
                <p className="text-sm font-semibold">Observacao do cliente</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedClient.observacao}</p>
              </section>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
