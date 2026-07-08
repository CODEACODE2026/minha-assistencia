"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { Building2, ImagePlus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/features/page-header";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { defaultCompanyProfile, getStoredCompanyProfile, setStoredCompanyProfile, type CompanyProfile } from "@/lib/company-profile";

export function CompanySettingsWorkspace() {
  const [form, setForm] = useState<CompanyProfile>(defaultCompanyProfile);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(getStoredCompanyProfile());
  }, []);

  function updateField(field: keyof CompanyProfile, value: string | null) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");
    setSuccess("");

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem para a logo.");
      return;
    }

    if (file.size > 1024 * 1024) {
      setError("A logo deve ter no maximo 1 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("logo", typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => setError("Nao foi possivel carregar a logo.");
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const profile = {
      ...form,
      nome: form.nome.trim() || defaultCompanyProfile.nome,
      responsavel: form.responsavel.trim(),
      documento: form.documento.trim(),
      telefone: form.telefone.trim(),
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim(),
      endereco: form.endereco.trim(),
      cidade: form.cidade.trim(),
      site: form.site.trim(),
      observacaoPdf: form.observacaoPdf.trim()
    };

    setStoredCompanyProfile(profile);
    setForm(profile);
    setSuccess("Dados da assistencia salvos com sucesso.");
  }

  return (
    <>
      <PageHeader title="Dados da assistencia" description="Dados usados no sistema, historico do cliente e emissao de documentos." />

      {success ? (
        <section className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {success}
        </section>
      ) : null}
      {error ? <section className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-100">{error}</section> : null}

      <form className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]" onSubmit={handleSubmit}>
        <section className="grid min-w-0 gap-4 rounded border bg-card p-4 shadow-subtle">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Nome da assistencia" value={form.nome} onChange={(event) => updateField("nome", event.target.value)} required />
            <Input label="Responsavel" value={form.responsavel} onChange={(event) => updateField("responsavel", event.target.value)} />
            <Input label="CNPJ/CPF" value={form.documento} onChange={(event) => updateField("documento", event.target.value)} />
            <Input label="Telefone" value={form.telefone} onChange={(event) => updateField("telefone", event.target.value)} />
            <Input label="WhatsApp" value={form.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} />
            <Input label="E-mail" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            <Input label="Cidade/UF" value={form.cidade} onChange={(event) => updateField("cidade", event.target.value)} />
            <Input label="Site ou Instagram" value={form.site} onChange={(event) => updateField("site", event.target.value)} />
          </div>

          <Textarea label="Endereco" value={form.endereco} onChange={(event) => updateField("endereco", event.target.value)} />
          <Textarea
            label="Observacao padrao para PDF"
            value={form.observacaoPdf}
            onChange={(event) => updateField("observacaoPdf", event.target.value)}
            placeholder="Ex.: garantia, prazo de retirada, formas de pagamento ou termos do orcamento."
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setForm(defaultCompanyProfile)}>
              Limpar
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Salvar dados
            </Button>
          </div>
        </section>

        <aside className="grid min-w-0 content-start gap-4 rounded border bg-card p-4 shadow-subtle">
          <div className="min-w-0">
            <h2 className="font-semibold">Logo</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use PNG, JPG ou WebP ate 1 MB.</p>
          </div>

          <div className="grid h-48 w-full min-w-0 max-w-full place-items-center overflow-hidden rounded border bg-muted/30 p-4">
            {form.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo} alt="Logo da assistencia" className="block max-h-40 max-w-full object-contain" />
            ) : (
              <div className="grid gap-2 text-center text-muted-foreground">
                <Building2 className="mx-auto h-10 w-10" />
                <span className="text-sm">Nenhuma logo importada</span>
              </div>
            )}
          </div>

          <label className="inline-flex h-10 min-w-0 cursor-pointer items-center justify-center gap-2 rounded border border-transparent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-gray-800 dark:hover:bg-gray-200">
            <ImagePlus className="h-4 w-4" />
            Importar logo
            <input className="sr-only" type="file" accept="image/*" onChange={handleLogoChange} />
          </label>

          {form.logo ? (
            <Button type="button" variant="danger" onClick={() => updateField("logo", null)}>
              <Trash2 className="h-4 w-4" />
              Remover logo
            </Button>
          ) : null}
        </aside>
      </form>
    </>
  );
}
