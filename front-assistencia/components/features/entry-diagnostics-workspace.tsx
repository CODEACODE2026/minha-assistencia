"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Edit3, FileDown, MessageCircle, Plus, Search, Trash2, Upload } from "lucide-react";
import { ApiErrorState } from "@/components/features/api-state";
import { PageHeader } from "@/components/features/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { api, getStoredAuth } from "@/lib/api";
import { getStoredCompanyProfile } from "@/lib/company-profile";
import type {
  ChecklistDiagnostico,
  ChecklistDiagnosticoStatus,
  Cliente,
  DiagnosticoEntrada,
  DiagnosticoEntradaStatus,
  DiagnosticoFotoTipo,
  DiagnosticoMarcacaoVisual
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type PhysicalArea = {
  key: string;
  title: string;
  options: Array<{ value: ChecklistDiagnosticoStatus; label: string }>;
};

const physicalAreas: PhysicalArea[] = [
  {
    key: "tela",
    title: "Tela",
    options: [
      { value: "boa", label: "Boa" },
      { value: "com_avarias", label: "Com avarias" },
      { value: "nao_funciona", label: "Nao funciona" }
    ]
  },
  {
    key: "tampa_traseira",
    title: "Tampa traseira",
    options: [
      { value: "boa", label: "Boa" },
      { value: "com_avarias", label: "Com avarias" },
      { value: "quebrada", label: "Quebrada" }
    ]
  },
  {
    key: "aro_carcaca",
    title: "Aro / carcaca",
    options: [
      { value: "boa", label: "Boa" },
      { value: "com_avarias", label: "Com avarias" },
      { value: "muito_danificada", label: "Muito danificada" }
    ]
  },
  {
    key: "botoes",
    title: "Botoes",
    options: [
      { value: "funcionando", label: "Funcionando" },
      { value: "parcial", label: "Parcial" },
      { value: "nao_funcionam", label: "Nao funcionam" }
    ]
  },
  {
    key: "conector_carga",
    title: "Conector de carga",
    options: [
      { value: "bom", label: "Bom" },
      { value: "com_folga", label: "Com folga" },
      { value: "nao_carrega", label: "Nao carrega" }
    ]
  },
  {
    key: "oxidacao",
    title: "Sinais de oxidacao",
    options: [
      { value: "nao_encontrado", label: "Nao encontrado" },
      { value: "suspeita", label: "Suspeita" },
      { value: "confirmado", label: "Confirmado" }
    ]
  }
];

const functionalItems = [
  ["liga", "Liga"],
  ["carrega", "Carrega"],
  ["touch", "Touch"],
  ["display", "Display"],
  ["chip", "Chip"],
  ["wifi", "Wi-Fi"],
  ["bluetooth", "Bluetooth"],
  ["alto_falante", "Alto-falante"],
  ["microfone", "Microfone"],
  ["vibracao", "Vibracao"],
  ["camera_frontal", "Camera frontal"],
  ["camera_traseira", "Camera traseira"],
  ["flash", "Flash"],
  ["biometria", "Biometria"],
  ["face_id", "Face ID"],
  ["sensores", "Sensores"]
] as const;

const functionalOptions: Array<{ value: ChecklistDiagnosticoStatus; label: string }> = [
  { value: "funcionando", label: "Funcionando" },
  { value: "com_defeito", label: "Com defeito" },
  { value: "nao_testado", label: "Nao testado" }
];

const companionItems = [
  ["possui_chip", "Chip"],
  ["possui_cartao_memoria", "Cartao memoria"],
  ["possui_capinha", "Capinha"],
  ["possui_pelicula", "Pelicula"],
  ["acompanha_carregador", "Carregador"],
  ["acompanha_cabo", "Cabo"],
  ["acompanha_caixa", "Caixa"],
  ["acompanha_nota_fiscal", "Nota fiscal"]
] as const;

const visualAreas = ["Tela", "Tampa traseira", "Cameras", "Aro esquerdo", "Aro direito", "Conector"] as const;
const visualTypes = ["Trincado", "Riscado", "Amassado", "Quebrado"] as const;

const photoTypes: Array<{ value: DiagnosticoFotoTipo; label: string }> = [
  { value: "frente", label: "Frente" },
  { value: "verso", label: "Verso" },
  { value: "lateral_esquerda", label: "Lateral esquerda" },
  { value: "lateral_direita", label: "Lateral direita" },
  { value: "conector_carga", label: "Conector" },
  { value: "detalhe_defeito", label: "Defeito principal" },
  { value: "outro", label: "Outras" }
];

type FormState = {
  cliente_id: string;
  cliente_busca: string;
  aparelho: string;
  marca: string;
  modelo: string;
  cor: string;
  imei: string;
  senha_desbloqueio: string;
  defeito_relatado: string;
  observacao_geral: string;
  possui_chip: boolean;
  possui_cartao_memoria: boolean;
  possui_capinha: boolean;
  possui_pelicula: boolean;
  acompanha_carregador: boolean;
  acompanha_cabo: boolean;
  acompanha_caixa: boolean;
  acompanha_nota_fiscal: boolean;
};

type PendingPhoto = {
  id: number;
  arquivo_base64: string;
  descricao: string;
  tipo_foto: DiagnosticoFotoTipo;
};

const emptyForm: FormState = {
  cliente_id: "",
  cliente_busca: "",
  aparelho: "",
  marca: "",
  modelo: "",
  cor: "",
  imei: "",
  senha_desbloqueio: "",
  defeito_relatado: "",
  observacao_geral: "",
  possui_chip: false,
  possui_cartao_memoria: false,
  possui_capinha: false,
  possui_pelicula: false,
  acompanha_carregador: false,
  acompanha_cabo: false,
  acompanha_caixa: false,
  acompanha_nota_fiscal: false
};

const statusTone: Record<DiagnosticoEntradaStatus, "success" | "warning" | "danger" | "info"> = {
  aberto: "warning",
  finalizado: "success",
  cancelado: "danger"
};

function makePhysicalChecklist(): ChecklistDiagnostico {
  return Object.fromEntries(physicalAreas.map((area) => [area.key, { status: area.options[0].value, observacao: "" }])) as ChecklistDiagnostico;
}

function makeFunctionalChecklist(): ChecklistDiagnostico {
  return Object.fromEntries(functionalItems.map(([key]) => [key, { status: "nao_testado", observacao: "" }])) as ChecklistDiagnostico;
}

function clientLabel(cliente: Cliente) {
  return `${cliente.nome} - ${cliente.telefone}`;
}

function normalizeMarks(marks?: unknown) {
  const parsed = parseJsonValue<DiagnosticoMarcacaoVisual[]>(marks, []);
  return parsed.map((mark, index) => ({ id: Date.now() + index, area: mark.area, tipo: mark.tipo, observacao: mark.observacao ?? "" }));
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") {
    return (value ?? fallback) as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function EntryDiagnosticsWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiagnosticoEntrada | null>(null);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoEntrada[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [physical, setPhysical] = useState<ChecklistDiagnostico>(() => makePhysicalChecklist());
  const [functional, setFunctional] = useState<ChecklistDiagnostico>(() => makeFunctionalChecklist());
  const [visualMarks, setVisualMarks] = useState<Array<DiagnosticoMarcacaoVisual & { id: number }>>([]);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({ termo: "", status: "", data: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setToken(getStoredAuth()?.token ?? null);
    setHydrated(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [diagnosticosData, clientesData] = await Promise.all([api.diagnosticosEntrada(token, filters), api.clientes(token)]);
      setDiagnosticos(diagnosticosData);
      setClientes(clientesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar check-ins.");
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  useEffect(() => {
    if (token) void loadData();
    else if (hydrated) setLoading(false);
  }, [hydrated, loadData, token]);

  const suggestions = useMemo(() => {
    const term = form.cliente_busca.toLowerCase().trim();
    return clientes.filter((cliente) => `${cliente.nome} ${cliente.telefone} ${cliente.cpf ?? ""}`.toLowerCase().includes(term)).slice(0, 6);
  }, [clientes, form.cliente_busca]);

  function selectClient(cliente: Cliente) {
    setForm((current) => ({ ...current, cliente_id: String(cliente.id), cliente_busca: clientLabel(cliente) }));
    setShowSuggestions(false);
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setPhysical(makePhysicalChecklist());
    setFunctional(makeFunctionalChecklist());
    setVisualMarks([]);
    setPhotos([]);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(diagnostico: DiagnosticoEntrada) {
    if (diagnostico.status === "finalizado" && !window.confirm("Este check-in esta finalizado. Deseja abrir para conferencia mesmo assim?")) {
      return;
    }

    setEditing(diagnostico);
    setForm({
      cliente_id: String(diagnostico.cliente_id),
      cliente_busca: diagnostico.cliente ? clientLabel(diagnostico.cliente) : `Cliente #${diagnostico.cliente_id}`,
      aparelho: diagnostico.aparelho,
      marca: diagnostico.marca ?? "",
      modelo: diagnostico.modelo ?? "",
      cor: diagnostico.cor ?? "",
      imei: diagnostico.imei ?? "",
      senha_desbloqueio: diagnostico.senha_desbloqueio ?? "",
      defeito_relatado: diagnostico.defeito_relatado,
      observacao_geral: diagnostico.observacao_geral ?? "",
      possui_chip: diagnostico.possui_chip,
      possui_cartao_memoria: diagnostico.possui_cartao_memoria,
      possui_capinha: diagnostico.possui_capinha,
      possui_pelicula: diagnostico.possui_pelicula,
      acompanha_carregador: diagnostico.acompanha_carregador,
      acompanha_cabo: diagnostico.acompanha_cabo,
      acompanha_caixa: diagnostico.acompanha_caixa,
      acompanha_nota_fiscal: diagnostico.acompanha_nota_fiscal
    });
    setPhysical({ ...makePhysicalChecklist(), ...(parseJsonValue<ChecklistDiagnostico | null>(diagnostico.checklist_fisico, null) ?? {}) });
    setFunctional({ ...makeFunctionalChecklist(), ...(parseJsonValue<ChecklistDiagnostico | null>(diagnostico.checklist_funcional, null) ?? {}) });
    setVisualMarks(normalizeMarks(diagnostico.marcacoes_visuais));
    setPhotos([]);
    setOpen(true);
  }

  function payload() {
    return {
      cliente_id: Number(form.cliente_id),
      aparelho: form.aparelho.trim(),
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      cor: form.cor.trim() || null,
      imei: form.imei.trim() || null,
      senha_desbloqueio: form.senha_desbloqueio.trim() || null,
      defeito_relatado: form.defeito_relatado.trim(),
      observacao_geral: form.observacao_geral.trim() || null,
      possui_chip: form.possui_chip,
      possui_cartao_memoria: form.possui_cartao_memoria,
      possui_capinha: form.possui_capinha,
      possui_pelicula: form.possui_pelicula,
      acompanha_carregador: form.acompanha_carregador,
      acompanha_cabo: form.acompanha_cabo,
      acompanha_caixa: form.acompanha_caixa,
      acompanha_nota_fiscal: form.acompanha_nota_fiscal,
      checklist_fisico: physical,
      checklist_funcional: functional,
      marcacoes_visuais: visualMarks.map(({ area, tipo, observacao }) => ({ area, tipo, observacao: observacao?.trim() || null }))
    };
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (!form.cliente_id) {
      setError("Selecione um cliente valido.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = editing ? await api.atualizarDiagnosticoEntrada(token, editing.id, payload()) : await api.criarDiagnosticoEntrada(token, payload());
      if (photos.length) {
        await api.adicionarFotosDiagnosticoEntrada(token, saved.id, photos.map(({ arquivo_base64, descricao, tipo_foto }) => ({ arquivo_base64, descricao, tipo_foto })));
      }
      setSuccess(editing ? "Check-in alterado com sucesso." : "Check-in cadastrado com sucesso.");
      setOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar check-in.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const validFiles = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (files.length !== validFiles.length) {
      setError("Algumas fotos foram ignoradas. Use JPG, PNG ou WEBP com ate 5MB.");
    }

    const loaded = await Promise.all(
      validFiles.map(
        (file, index) =>
          new Promise<PendingPhoto>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ id: Date.now() + index, arquivo_base64: String(reader.result), descricao: "", tipo_foto: index === 0 ? "frente" : "outro" });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );
    setPhotos((current) => [...current, ...loaded]);
  }

  async function finish(diagnostico: DiagnosticoEntrada) {
    if (!token || !window.confirm(`Finalizar check-in #${diagnostico.id}? Depois disso ele fica bloqueado para edicao normal.`)) return;
    const saved = await api.finalizarDiagnosticoEntrada(token, diagnostico.id);
    setDiagnosticos((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  }

  async function remove(diagnostico: DiagnosticoEntrada) {
    if (!token || !window.confirm(`Excluir check-in #${diagnostico.id}?`)) return;
    await api.removerDiagnosticoEntrada(token, diagnostico.id);
    setDiagnosticos((current) => current.filter((item) => item.id !== diagnostico.id));
  }

  async function pdf(diagnostico: DiagnosticoEntrada) {
    if (!token) {
      setError("Usuario nao autenticado.");
      return;
    }

    setError(null);
    try {
      const blob = await api.diagnosticoEntradaPdf(token, diagnostico.id, getStoredCompanyProfile());
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar PDF.");
    }
  }

  async function convertToServiceOrder(diagnostico: DiagnosticoEntrada) {
    if (!token || !window.confirm(`Converter check-in #${diagnostico.id} para ordem de servico/orcamento?`)) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.criarOrcamento(token, {
        cliente_id: diagnostico.cliente_id,
        aparelho: [diagnostico.aparelho, diagnostico.marca, diagnostico.modelo].filter(Boolean).join(" "),
        defeito_relatado: diagnostico.defeito_relatado,
        servico: "Analise tecnica do aparelho",
        pecas_usadas: [],
        valor_pecas: 0,
        valor_mao_obra: 0,
        desconto: 0,
        status: "aberto",
        observacao: [`Origem: check-in tecnico #${diagnostico.id}. Fotos e marcacoes visuais vinculadas ao check-in original.`, diagnostico.observacao_geral].filter(Boolean).join("\n")
      });
      setSuccess("Ordem de servico/orcamento criada a partir do check-in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao converter check-in.");
    } finally {
      setSaving(false);
    }
  }

  async function sendWhatsApp(diagnostico: DiagnosticoEntrada) {
    if (!token) return;
    const telefone = diagnostico.cliente?.telefone;
    if (!telefone) {
      setError("Cliente sem telefone cadastrado.");
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await api.enviarWhatsApp(token, {
        telefone,
        mensagem: `O check-in tecnico #${diagnostico.id} do aparelho ${diagnostico.aparelho} foi registrado na Minha Assistencia.`
      });
      setSuccess("Mensagem enviada/processada pelo WhatsApp.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar WhatsApp.");
    }
  }

  function addVisualMark(area: string, tipo: string) {
    setVisualMarks((current) => [...current, { id: Date.now(), area, tipo, observacao: "" }]);
  }

  if (!hydrated || loading) return <DataTable<DiagnosticoEntrada> loading data={[]} columns={[{ key: "loading", header: "Check-ins", cell: () => null }]} />;
  if (!token) return <ApiErrorState message="Usuario nao autenticado. Faca login para carregar os check-ins." />;

  return (
    <>
      <PageHeader title="Check-in tecnico" description="Entrada rapida do aparelho com fotos, avarias e PDF para o cliente." action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Novo check-in</Button>} />
      {error ? <ApiErrorState message={error} onRetry={() => void loadData()} /> : null}
      {success ? <section className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{success}</section> : null}

      <section className="mb-4 grid gap-3 rounded border bg-card p-4 shadow-subtle md:grid-cols-[1fr_180px_180px_auto] md:items-end">
        <Input label="Buscar" value={filters.termo} onChange={(event) => setFilters((current) => ({ ...current, termo: event.target.value }))} placeholder="Cliente, aparelho, defeito" />
        <label className="grid gap-1.5 text-sm font-medium">
          <span>Status</span>
          <select className="h-10 rounded border bg-background px-3 text-sm" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">Todos</option>
            <option value="aberto">Aberto</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>
        <Input label="Data" type="date" value={filters.data} onChange={(event) => setFilters((current) => ({ ...current, data: event.target.value }))} />
        <Button variant="secondary" onClick={() => void loadData()}><Search className="h-4 w-4" />Buscar</Button>
      </section>

      <DataTable<DiagnosticoEntrada>
        data={diagnosticos}
        empty="Nenhum check-in encontrado."
        columns={[
          { key: "id", header: "Numero", cell: (row) => <span className="font-semibold">#{row.id}</span> },
          { key: "cliente", header: "Cliente", cell: (row) => row.cliente?.nome ?? `Cliente #${row.cliente_id}` },
          { key: "aparelho", header: "Aparelho", cell: (row) => [row.aparelho, row.marca, row.modelo].filter(Boolean).join(" ") },
          { key: "defeito", header: "Defeito", cell: (row) => row.defeito_relatado },
          { key: "status", header: "Status", cell: (row) => <Badge tone={statusTone[row.status]}>{row.status}</Badge> },
          { key: "data", header: "Entrada", cell: (row) => (row.createdAt ? formatDateTime(row.createdAt) : "-") },
          {
            key: "actions",
            header: "",
            cell: (row) => (
              <div className="flex flex-wrap justify-end gap-2">
                {row.status !== "finalizado" ? <Button aria-label="Editar" title="Editar" size="icon" variant="secondary" onClick={() => openEdit(row)}><Edit3 className="h-4 w-4" /></Button> : null}
                {row.status === "aberto" ? <Button aria-label="Finalizar" title="Finalizar" size="icon" variant="secondary" onClick={() => void finish(row)}><CheckCircle2 className="h-4 w-4" /></Button> : null}
                <Button aria-label="Converter OS" title="Converter OS" size="icon" variant="secondary" onClick={() => void convertToServiceOrder(row)}><ClipboardList className="h-4 w-4" /></Button>
                <Button aria-label="WhatsApp" title="WhatsApp" size="icon" variant="secondary" onClick={() => void sendWhatsApp(row)}><MessageCircle className="h-4 w-4" /></Button>
                <Button aria-label="Gerar PDF" title="Gerar PDF" size="icon" variant="secondary" onClick={() => void pdf(row)}><FileDown className="h-4 w-4" /></Button>
                <Button aria-label="Excluir" title="Excluir" size="icon" variant="danger" disabled={saving} onClick={() => void remove(row)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )
          }
        ]}
      />

      <Modal open={open} title={editing ? `Editar check-in #${editing.id}` : "Novo check-in tecnico"} className="max-w-7xl" onClose={() => setOpen(false)}>
        <form className="grid gap-5" onSubmit={save}>
          <section className="grid gap-3 rounded border bg-muted/30 p-4">
            <h3 className="font-semibold">1. Cliente</h3>
            <div className="relative">
              <Input label="Cliente" value={form.cliente_busca} onChange={(event) => { setForm((current) => ({ ...current, cliente_busca: event.target.value, cliente_id: "" })); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} required />
              {showSuggestions ? (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border bg-card shadow-xl">
                  {suggestions.map((cliente) => <button key={cliente.id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); selectClient(cliente); }}>{cliente.nome} - {cliente.telefone}</button>)}
                  {!suggestions.length ? <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</div> : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid gap-3 rounded border bg-card p-4">
            <h3 className="font-semibold">2. Dados do aparelho</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="Aparelho" value={form.aparelho} onChange={(event) => setForm((current) => ({ ...current, aparelho: event.target.value }))} placeholder="Celular, tablet..." required />
              <Input label="Marca" value={form.marca} onChange={(event) => setForm((current) => ({ ...current, marca: event.target.value }))} />
              <Input label="Modelo" value={form.modelo} onChange={(event) => setForm((current) => ({ ...current, modelo: event.target.value }))} />
              <Input label="Cor" value={form.cor} onChange={(event) => setForm((current) => ({ ...current, cor: event.target.value }))} />
              <Input label="IMEI" value={form.imei} onChange={(event) => setForm((current) => ({ ...current, imei: event.target.value }))} />
              <Input label="Senha/padrao autorizado" value={form.senha_desbloqueio} onChange={(event) => setForm((current) => ({ ...current, senha_desbloqueio: event.target.value }))} />
            </div>
            <Textarea label="Defeito relatado pelo cliente" value={form.defeito_relatado} onChange={(event) => setForm((current) => ({ ...current, defeito_relatado: event.target.value }))} required />
          </section>

          <section className="grid gap-3 rounded border bg-card p-4">
            <h3 className="font-semibold">3. Itens que acompanham</h3>
            <div className="flex flex-wrap gap-2">
              {companionItems.map(([field, label]) => {
                const selected = Boolean(form[field]);
                return (
                  <button
                    key={field}
                    type="button"
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${selected ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    onClick={() => setForm((current) => ({ ...current, [field]: !selected }))}
                  >
                    {selected ? "Sim" : "Nao"} - {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid gap-3 rounded border bg-card p-4">
            <h3 className="font-semibold">4. Estado fisico por area</h3>
            <div className="grid gap-3 lg:grid-cols-3">
              {physicalAreas.map((area) => (
                <div key={area.key} className="grid gap-3 rounded border p-3">
                  <strong>{area.title}</strong>
                  <div className="grid gap-2">
                    {area.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded border px-3 py-2 text-left text-sm ${physical[area.key]?.status === option.value ? "border-primary bg-primary/10 font-semibold text-primary" : "bg-background hover:bg-muted"}`}
                        onClick={() => setPhysical((current) => ({ ...current, [area.key]: { ...current[area.key], status: option.value } }))}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <Input placeholder="Observacao opcional" value={physical[area.key]?.observacao ?? ""} onChange={(event) => setPhysical((current) => ({ ...current, [area.key]: { ...current[area.key], observacao: event.target.value } }))} />
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 rounded border bg-card p-4">
            <h3 className="font-semibold">5. Check-in visual</h3>
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              <div className="grid place-items-center rounded-xl border bg-muted/30 p-4">
                <div className="relative h-64 w-40 rounded-[2rem] border-8 border-foreground bg-background shadow-inner">
                  <button type="button" className="absolute inset-x-8 top-10 rounded border bg-card px-2 py-1 text-xs shadow" onClick={() => addVisualMark("Tela", "Trincado")}>Tela</button>
                  <button type="button" className="absolute left-[-3.25rem] top-20 rounded border bg-card px-2 py-1 text-xs shadow" onClick={() => addVisualMark("Aro esquerdo", "Riscado")}>Aro E</button>
                  <button type="button" className="absolute right-[-3.25rem] top-20 rounded border bg-card px-2 py-1 text-xs shadow" onClick={() => addVisualMark("Aro direito", "Riscado")}>Aro D</button>
                  <button type="button" className="absolute inset-x-8 bottom-4 rounded border bg-card px-2 py-1 text-xs shadow" onClick={() => addVisualMark("Conector", "Quebrado")}>Conector</button>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-2">
                  {visualAreas.map((area) => visualTypes.map((tipo) => <Button key={`${area}-${tipo}`} type="button" size="sm" variant="secondary" onClick={() => addVisualMark(area, tipo)}>{area}: {tipo}</Button>))}
                </div>
                <div className="grid gap-2">
                  {visualMarks.map((mark) => (
                    <div key={mark.id} className="grid gap-2 rounded border p-2 md:grid-cols-[150px_140px_1fr_auto] md:items-center">
                      <select className="h-9 rounded border bg-background px-2 text-sm" value={mark.area} onChange={(event) => setVisualMarks((current) => current.map((item) => item.id === mark.id ? { ...item, area: event.target.value } : item))}>
                        {visualAreas.map((area) => <option key={area} value={area}>{area}</option>)}
                      </select>
                      <select className="h-9 rounded border bg-background px-2 text-sm" value={mark.tipo} onChange={(event) => setVisualMarks((current) => current.map((item) => item.id === mark.id ? { ...item, tipo: event.target.value } : item))}>
                        {visualTypes.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                      </select>
                      <Input placeholder="Detalhe opcional" value={mark.observacao ?? ""} onChange={(event) => setVisualMarks((current) => current.map((item) => item.id === mark.id ? { ...item, observacao: event.target.value } : item))} />
                      <Button type="button" size="sm" variant="ghost" onClick={() => setVisualMarks((current) => current.filter((item) => item.id !== mark.id))}>Remover</Button>
                    </div>
                  ))}
                  {!visualMarks.length ? <p className="text-sm text-muted-foreground">Clique em uma area do aparelho ou nos botoes para registrar avarias visuais.</p> : null}
                </div>
              </div>
            </div>
          </section>

          <FunctionalChecklist value={functional} onChange={setFunctional} />

          <section className="grid gap-3 rounded border bg-card p-4">
            <h3 className="font-semibold">7. Fotos</h3>
            <label className="inline-flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded border bg-accent px-4 text-sm font-medium text-accent-foreground">
              <Upload className="h-4 w-4" />Importar fotos
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotos} />
            </label>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {photos.map((foto) => (
                <div key={foto.id} className="grid gap-2 rounded border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.arquivo_base64} alt="Preview" className="h-36 w-full rounded object-cover" />
                  <select className="h-9 rounded border bg-background px-2 text-sm" value={foto.tipo_foto} onChange={(event) => setPhotos((current) => current.map((item) => item.id === foto.id ? { ...item, tipo_foto: event.target.value as DiagnosticoFotoTipo } : item))}>
                    {photoTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                  <Input placeholder="Legenda da foto" value={foto.descricao} onChange={(event) => setPhotos((current) => current.map((item) => item.id === foto.id ? { ...item, descricao: event.target.value } : item))} />
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPhotos((current) => current.filter((item) => item.id !== foto.id))}>Remover foto</Button>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 rounded border bg-card p-4">
            <h3 className="font-semibold">8. Observacoes finais</h3>
            <Textarea label="Observacao geral" value={form.observacao_geral} onChange={(event) => setForm((current) => ({ ...current, observacao_geral: event.target.value }))} />
          </section>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar check-in"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function FunctionalChecklist({ value, onChange }: { value: ChecklistDiagnostico; onChange: (value: ChecklistDiagnostico) => void }) {
  return (
    <section className="grid gap-3 rounded border bg-card p-4">
      <h3 className="font-semibold">6. Testes funcionais rapidos</h3>
      <div className="grid gap-2 lg:grid-cols-2">
        {functionalItems.map(([key, label]) => {
          const selected = value[key]?.status ?? "nao_testado";
          return (
            <div key={key} className="grid gap-2 rounded border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">{label}</strong>
                <div className="flex flex-wrap gap-1">
                  {functionalOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${selected === option.value ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      onClick={() => onChange({ ...value, [key]: { ...value[key], status: option.value, observacao: option.value === "com_defeito" ? value[key]?.observacao ?? "" : "" } })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {selected === "com_defeito" ? (
                <Input aria-label={`Observacao ${label}`} placeholder="Descreva rapidamente o defeito" value={value[key]?.observacao ?? ""} onChange={(event) => onChange({ ...value, [key]: { ...value[key], observacao: event.target.value } })} />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
