import type { CompanyProfile } from "@/lib/company-profile";
import type { Cliente, Orcamento } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type DocumentPart = {
  nome: string;
  quantidade: number;
  valor: number;
  total: number;
};

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseParts(pecas: Orcamento["pecas_usadas"]): DocumentPart[] {
  const rawParts = Array.isArray(pecas)
    ? pecas
    : typeof pecas === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(pecas);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  return rawParts.map((part) => {
    const quantidade = Number(part.quantidade) || 0;
    const valor = Number(part.valor) || 0;

    return {
      nome: part.nome,
      quantidade,
      valor,
      total: quantidade * valor
    };
  });
}

function companyHeader(profile: CompanyProfile) {
  return `
    <header class="company">
      <div class="brand">
        ${
          profile.logo
            ? `<img class="logo" src="${profile.logo}" alt="${escapeHtml(profile.nome)}" />`
            : `<div class="logo-placeholder">LOGO</div>`
        }
        <div>
          <h1>${escapeHtml(profile.nome)}</h1>
          <p>${escapeHtml([profile.documento, profile.responsavel].filter(Boolean).join(" | "))}</p>
          <p>${escapeHtml([profile.telefone, profile.whatsapp, profile.email].filter(Boolean).join(" | "))}</p>
          <p>${escapeHtml([profile.endereco, profile.cidade].filter(Boolean).join(" - "))}</p>
          ${profile.site ? `<p>${escapeHtml(profile.site)}</p>` : ""}
        </div>
      </div>
    </header>
  `;
}

function styles() {
  return `
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #f3f4f6; color: #111827; font-family: Arial, Helvetica, sans-serif; }
      .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 18mm; }
      .company { border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
      .brand { display: flex; gap: 16px; align-items: center; min-width: 0; overflow: hidden; }
      .brand > div:last-child { min-width: 0; overflow-wrap: anywhere; }
      .logo, .logo-placeholder { flex: 0 0 82px; width: 82px; max-width: 82px; height: 82px; max-height: 82px; border: 1px solid #d1d5db; border-radius: 8px; object-fit: contain; padding: 6px; overflow: hidden; }
      .logo-placeholder { display: grid; place-items: center; color: #6b7280; font-size: 12px; }
      h1 { margin: 0 0 6px; font-size: 24px; }
      h2 { margin: 0 0 12px; font-size: 18px; }
      h3 { margin: 18px 0 8px; font-size: 15px; }
      p { margin: 2px 0; font-size: 12px; line-height: 1.35; }
      .title { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
      .title strong { font-size: 20px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
      .label { color: #6b7280; font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
      .value { margin-top: 3px; font-size: 13px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; }
      .totals { margin-top: 14px; margin-left: auto; width: 280px; }
      .totals div { display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding: 6px 0; font-size: 13px; }
      .totals strong { font-size: 15px; }
      .note { margin-top: 18px; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; white-space: pre-wrap; }
      .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 44px; }
      .signature div { border-top: 1px solid #111827; padding-top: 8px; text-align: center; font-size: 12px; }
      @media print {
        body { background: #fff; }
        .page { width: auto; min-height: auto; margin: 0; padding: 0; }
      }
    </style>
  `;
}

function openPrintWindow(title: string, body: string) {
  const popup = window.open("", "_blank", "width=1000,height=800");
  if (!popup) {
    window.alert("Permita pop-ups para gerar o PDF.");
    return;
  }

  popup.document.open();
  popup.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        ${styles()}
      </head>
      <body>
        <main class="page">${body}</main>
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  popup.document.close();
}

export function generateOrcamentoPdf(profile: CompanyProfile, orcamento: Orcamento, type: "orcamento" | "os") {
  const parts = parseParts(orcamento.pecas_usadas);
  const title = type === "os" ? `Ordem de Servico #${orcamento.id}` : `Orcamento #${orcamento.id}`;
  const cliente = orcamento.cliente;
  const valorPecas = Number(orcamento.valor_pecas) || parts.reduce((total, part) => total + part.total, 0);
  const valorMaoObra = Number(orcamento.valor_mao_obra) || 0;
  const desconto = Number(orcamento.desconto) || 0;
  const valorTotal = Number(orcamento.valor_total) || Math.max(0, valorPecas + valorMaoObra - desconto);

  openPrintWindow(
    title,
    `
      ${companyHeader(profile)}
      <section class="title">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>Status: ${escapeHtml(orcamento.status)}</p>
        </div>
        <div>
          <p>Emitido em: ${escapeHtml(new Date().toLocaleDateString("pt-BR"))}</p>
          ${orcamento.createdAt ? `<p>Criado em: ${escapeHtml(formatDateTime(orcamento.createdAt))}</p>` : ""}
        </div>
      </section>

      <section class="grid">
        <div class="box"><div class="label">Cliente</div><div class="value">${escapeHtml(cliente?.nome ?? `Cliente #${orcamento.cliente_id}`)}</div></div>
        <div class="box"><div class="label">Telefone</div><div class="value">${escapeHtml(cliente?.telefone ?? "-")}</div></div>
        <div class="box"><div class="label">Aparelho</div><div class="value">${escapeHtml(orcamento.aparelho)}</div></div>
        <div class="box"><div class="label">Servico</div><div class="value">${escapeHtml(orcamento.servico)}</div></div>
      </section>

      <h3>Defeito relatado</h3>
      <div class="box">${escapeHtml(orcamento.defeito_relatado)}</div>

      <h3>Pecas e produtos</h3>
      <table>
        <thead><tr><th>Item</th><th>Qtd.</th><th>Valor unitario</th><th>Total</th></tr></thead>
        <tbody>
          ${
            parts.length
              ? parts
                  .map(
                    (part) =>
                      `<tr><td>${escapeHtml(part.nome)}</td><td>${part.quantidade}</td><td>${formatCurrency(part.valor)}</td><td>${formatCurrency(part.total)}</td></tr>`
                  )
                  .join("")
              : `<tr><td colspan="4">Nenhuma peca vinculada.</td></tr>`
          }
        </tbody>
      </table>

      <section class="totals">
        <div><span>Pecas</span><span>${formatCurrency(valorPecas)}</span></div>
        <div><span>Mao de obra</span><span>${formatCurrency(valorMaoObra)}</span></div>
        <div><span>Desconto</span><span>${formatCurrency(desconto)}</span></div>
        <div><strong>Total</strong><strong>${formatCurrency(valorTotal)}</strong></div>
      </section>

      ${orcamento.observacao ? `<div class="note"><strong>Observacao:</strong><br />${escapeHtml(orcamento.observacao)}</div>` : ""}
      ${profile.observacaoPdf ? `<div class="note"><strong>Condicoes:</strong><br />${escapeHtml(profile.observacaoPdf)}</div>` : ""}

      <section class="signature">
        <div>Assinatura da assistencia</div>
        <div>Assinatura do cliente</div>
      </section>
    `
  );
}

export function generateClientHistoryPdf(profile: CompanyProfile, cliente: Cliente, orders: Orcamento[]) {
  openPrintWindow(
    `Historico de ${cliente.nome}`,
    `
      ${companyHeader(profile)}
      <section class="title">
        <div>
          <strong>Historico do cliente</strong>
          <p>${escapeHtml(cliente.nome)}</p>
        </div>
        <div>
          <p>Emitido em: ${escapeHtml(new Date().toLocaleDateString("pt-BR"))}</p>
        </div>
      </section>

      <section class="grid">
        <div class="box"><div class="label">Telefone</div><div class="value">${escapeHtml(cliente.telefone)}</div></div>
        <div class="box"><div class="label">CPF</div><div class="value">${escapeHtml(cliente.cpf ?? "-")}</div></div>
        <div class="box"><div class="label">Endereco</div><div class="value">${escapeHtml(cliente.endereco ?? "-")}</div></div>
        <div class="box"><div class="label">Total em registros</div><div class="value">${orders.length}</div></div>
      </section>

      <h3>Servicos e orcamentos</h3>
      <table>
        <thead><tr><th>Registro</th><th>Data</th><th>Aparelho</th><th>Servico</th><th>Status</th><th>Total</th></tr></thead>
        <tbody>
          ${
            orders.length
              ? orders
                  .map(
                    (order) =>
                      `<tr><td>#${order.id}</td><td>${escapeHtml(order.createdAt ? formatDateTime(order.createdAt) : "-")}</td><td>${escapeHtml(order.aparelho)}</td><td>${escapeHtml(order.servico)}</td><td>${escapeHtml(order.status)}</td><td>${formatCurrency(order.valor_total)}</td></tr>`
                  )
                  .join("")
              : `<tr><td colspan="6">Nenhum registro encontrado.</td></tr>`
          }
        </tbody>
      </table>

      ${cliente.observacao ? `<div class="note"><strong>Observacao do cliente:</strong><br />${escapeHtml(cliente.observacao)}</div>` : ""}
    `
  );
}
