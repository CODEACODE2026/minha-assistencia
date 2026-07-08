import fs from 'fs';
import path from 'path';

import { Request, Response } from 'express';

import { TermoEntregaService } from '../services/TermoEntregaService';
import { successResponse } from '../utils/jsonResponse';
import { renderHtmlToPdf } from '../utils/renderPdf';

type TesteFinal = { status?: string; observacao?: string | null };
type CompanyProfile = {
  nome?: string;
  responsavel?: string;
  documento?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  site?: string;
  logo?: string | null;
};

const testLabels: Record<string, string> = {
  liga: 'Liga',
  carrega: 'Carrega',
  touch: 'Touch',
  display: 'Display',
  wifi: 'Wi-Fi',
  bluetooth: 'Bluetooth',
  chip: 'Chip',
  alto_falante: 'Alto-falante',
  microfone: 'Microfone',
  vibracao: 'Vibracao',
  camera_frontal: 'Camera frontal',
  camera_traseira: 'Camera traseira',
  flash: 'Flash',
  biometria: 'Biometria',
  face_id: 'Face ID'
};

const photoLabels: Record<string, string> = {
  frente: 'Frente',
  verso: 'Verso',
  lateral: 'Lateral',
  servico_realizado: 'Servico realizado',
  outra: 'Outra'
};

function htmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') {
    return (value ?? fallback) as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function dataUri(filePath: string) {
  if (!fs.existsSync(filePath)) return '';
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function companyFromRequest(req: Request): CompanyProfile {
  const company = (req.body?.company ?? {}) as CompanyProfile;
  return {
    nome: company.nome || 'Minha Assistencia',
    responsavel: company.responsavel || '',
    documento: company.documento || '',
    telefone: company.telefone || '',
    whatsapp: company.whatsapp || '',
    email: company.email || '',
    endereco: company.endereco || '',
    cidade: company.cidade || '',
    site: company.site || '',
    logo: typeof company.logo === 'string' && company.logo.startsWith('data:image/') ? company.logo : null
  };
}

function companyHeader(company: CompanyProfile) {
  const contacts = [company.telefone, company.whatsapp, company.email].filter(Boolean).join(' | ');
  const address = [company.endereco, company.cidade].filter(Boolean).join(' - ');
  const subtitle = [company.documento, company.responsavel].filter(Boolean).join(' | ');

  return `
    <div class="brand">
      ${
        company.logo
          ? `<img class="logo" src="${company.logo}" alt="${htmlEscape(company.nome)}" />`
          : `<div class="logo">MA</div>`
      }
      <div>
        <h1>${htmlEscape(company.nome || 'Minha Assistencia')}</h1>
        ${subtitle ? `<p>${htmlEscape(subtitle)}</p>` : ''}
        ${contacts ? `<p>${htmlEscape(contacts)}</p>` : '<p>WhatsApp e atendimento tecnico</p>'}
        ${address ? `<p>${htmlEscape(address)}</p>` : '<p>Endereco da assistencia</p>'}
        ${company.site ? `<p>${htmlEscape(company.site)}</p>` : ''}
      </div>
    </div>
  `;
}

function parseParts(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function statusMeta(status?: string) {
  const map: Record<string, { icon: string; label: string; cls: string; show: boolean }> = {
    aprovado: { icon: '&#10003;', label: 'Aprovado', cls: 'ok', show: true },
    reprovado: { icon: '&#10007;', label: 'Reprovado', cls: 'problem', show: true },
    nao_testado: { icon: '&#9675;', label: 'Nao testado', cls: 'muted-card', show: false }
  };
  return map[status ?? ''] ?? map.nao_testado;
}

function serviceList(text?: string | null) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length
    ? `<ul class="clean-list">${lines.map((line) => `<li>${htmlEscape(line)}</li>`).join('')}</ul>`
    : '<p class="muted">Servico nao informado.</p>';
}

function partsList(parts: any[]) {
  if (!parts.length) return '<p class="muted">Nenhuma peca registrada.</p>';
  return `<div class="parts-grid">${parts
    .map((part) => `<div class="part"><strong>${htmlEscape(part.nome)}</strong><span>Quantidade: ${htmlEscape(part.quantidade ?? 1)}</span></div>`)
    .join('')}</div>`;
}

function testsGrid(testes: Record<string, TesteFinal>) {
  const items = Object.entries(testes)
    .map(([key, value]) => {
      const meta = statusMeta(value?.status);
      if (!meta.show && !value?.observacao) return '';
      return `<div class="test ${meta.cls}"><span>${meta.icon}</span><div><strong>${htmlEscape(testLabels[key] ?? key)}</strong><small>${htmlEscape(meta.label)}${value?.observacao ? ` - ${htmlEscape(value.observacao)}` : ''}</small></div></div>`;
    })
    .filter(Boolean)
    .join('');

  return items ? `<div class="tests-grid">${items}</div>` : '';
}

function photoGallery(fotos: any[]) {
  const items = fotos
    .map((foto) => {
      const file = path.resolve(process.cwd(), String(foto.foto).replace(/^\//, ''));
      const src = dataUri(file);
      if (!src) return '';
      const label = photoLabels[foto.tipo_foto] ?? 'Foto';
      return `<figure><img src="${src}" alt="${htmlEscape(label)}" /><figcaption>${htmlEscape(label)}${foto.descricao ? ` - ${htmlEscape(foto.descricao)}` : ''}</figcaption></figure>`;
    })
    .filter(Boolean)
    .join('');

  return items ? `<section class="section page-break"><h2>Fotos finais</h2><div class="photo-grid">${items}</div></section>` : '';
}

function buildPdfHtml(plain: any, userName?: string, company: CompanyProfile = companyFromRequest({ body: {} } as Request)) {
  const ordem = plain.ordem_servico ?? {};
  const cliente = plain.cliente ?? ordem.cliente ?? {};
  const parts = parseParts(ordem.pecas_usadas);
  const testes = parseJsonValue<Record<string, TesteFinal>>(plain.testes_finais, {});
  const testsHtml = testsGrid(testes);
  const fotos = Array.isArray(plain.fotos) ? plain.fotos : [];

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .hero { display: grid; grid-template-columns: 1fr auto; gap: 18px; padding: 18px; border-radius: 16px; color: #fff; background: #111827; }
          .brand { display: flex; align-items: center; gap: 14px; }
          .logo { width: 62px; height: 62px; max-width: 62px; max-height: 62px; border-radius: 12px; background: rgba(255,255,255,.12); display: grid; place-items: center; font-weight: 800; font-size: 18px; border: 1px solid rgba(255,255,255,.25); object-fit: contain; padding: 4px; }
          h1, h2, h3, p { margin-top: 0; }
          .brand h1 { margin: 0; font-size: 22px; }
          .brand p, .doc-number p { margin: 4px 0 0; color: rgba(255,255,255,.8); font-size: 11px; }
          .doc-number { text-align: right; background: #dc2626; border-radius: 14px; padding: 12px 14px; min-width: 132px; }
          .doc-number strong { display: block; font-size: 24px; }
          .title-bar { display: flex; justify-content: space-between; align-items: center; margin: 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
          .title-bar h2 { margin: 0; font-size: 21px; }
          .badge { padding: 7px 12px; border-radius: 999px; background: #fee2e2; color: #991b1b; font-weight: 700; text-transform: uppercase; font-size: 10px; }
          .section { margin-top: 14px; }
          .section h2 { margin: 0 0 9px; font-size: 14px; }
          .card-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
          .card, .guarantee, .terms { border: 1px solid #e5e7eb; border-radius: 13px; padding: 12px; background: #fff; box-shadow: 0 4px 16px rgba(15,23,42,.05); break-inside: avoid; }
          .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px 12px; }
          .info span { display: block; color: #6b7280; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: .04em; }
          .info strong { display: block; margin-top: 3px; overflow-wrap: anywhere; }
          .clean-list { margin: 0; padding-left: 18px; display: grid; gap: 5px; }
          .parts-grid, .tests-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
          .part, .test { border-radius: 12px; padding: 9px; border: 1px solid #e5e7eb; break-inside: avoid; }
          .part span, .test small { display: block; margin-top: 3px; color: #4b5563; }
          .test { display: grid; grid-template-columns: 24px 1fr; gap: 7px; align-items: start; }
          .test span { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; }
          .ok { background: #ecfdf5; } .ok span { background: #16a34a; color: #fff; }
          .problem { background: #fef2f2; } .problem span { background: #dc2626; color: #fff; }
          .muted-card { background: #f3f4f6; }
          .guarantee { border-left: 5px solid #dc2626; background: #fff7f7; }
          .guarantee strong { display: block; color: #991b1b; font-size: 20px; }
          .photo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          figure { margin: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; break-inside: avoid; }
          figure img { width: 100%; height: 245px; object-fit: cover; display: block; }
          figcaption { min-height: 34px; padding: 8px; font-size: 10px; color: #374151; }
          .terms { background: #f9fafb; font-size: 10px; line-height: 1.45; color: #374151; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 34px; }
          .signature { border-top: 1px solid #111827; padding-top: 7px; text-align: center; font-size: 10px; }
          .muted { color: #6b7280; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <main>
          <header class="hero">
            ${companyHeader(company)}
            <div class="doc-number">
              <p>Termo de entrega</p>
              <strong>#${htmlEscape(plain.id)}</strong>
              <p>${htmlEscape(new Date(plain.data_entrega).toLocaleString('pt-BR'))}</p>
            </div>
          </header>

          <div class="title-bar">
            <h2>TERMO DE ENTREGA E GARANTIA</h2>
            <span class="badge">OS #${htmlEscape(plain.ordem_servico_id)}</span>
          </div>

          <section class="section card-grid">
            <article class="card">
              <h2>Cliente</h2>
              <div class="info-grid">
                <div class="info"><span>Nome</span><strong>${htmlEscape(cliente.nome)}</strong></div>
                <div class="info"><span>Telefone</span><strong>${htmlEscape(cliente.telefone)}</strong></div>
              </div>
            </article>
            <article class="card">
              <h2>Aparelho</h2>
              <div class="info-grid">
                <div class="info"><span>Aparelho</span><strong>${htmlEscape(ordem.aparelho)}</strong></div>
                <div class="info"><span>Valor</span><strong>R$ ${htmlEscape(ordem.valor_total ?? '0.00')}</strong></div>
                <div class="info"><span>Data da OS</span><strong>${ordem.createdAt ? htmlEscape(new Date(ordem.createdAt).toLocaleDateString('pt-BR')) : '-'}</strong></div>
                <div class="info"><span>Entrega</span><strong>${htmlEscape(new Date(plain.data_entrega).toLocaleDateString('pt-BR'))}</strong></div>
              </div>
            </article>
          </section>

          <section class="section">
            <h2>Servicos executados</h2>
            <div class="card">${serviceList(plain.servico_realizado)}</div>
          </section>

          <section class="section">
            <h2>Pecas utilizadas</h2>
            ${partsList(parts)}
          </section>

          ${testsHtml ? `<section class="section"><h2>Testes finais</h2>${testsHtml}</section>` : ''}

          ${photoGallery(fotos)}

          <section class="section">
            <div class="guarantee">
              <strong>${plain.garantia_dias > 0 ? `Garantia de ${htmlEscape(plain.garantia_dias)} dias` : 'Sem garantia'}</strong>
              <p>${htmlEscape(plain.cobertura_garantia || '')}</p>
            </div>
          </section>

          ${plain.observacoes_entrega ? `<section class="section"><h2>Observacoes</h2><div class="terms">${htmlEscape(plain.observacoes_entrega)}</div></section>` : ''}

          <section class="section">
            <h2>Termo</h2>
            <div class="terms">Declaro que recebi o aparelho acima descrito e conferi seu funcionamento no momento da entrega. Estou ciente das condicoes de garantia informadas neste documento.</div>
          </section>

          <section class="signatures">
            <div class="signature">Assinatura do cliente</div>
            <div class="signature">Assinatura do tecnico<br/>${htmlEscape(userName || '')}</div>
            <div class="signature">Assinatura da assistencia</div>
          </section>
        </main>
      </body>
    </html>
  `;
}

export class TermoEntregaController {
  static async create(req: Request, res: Response) {
    const termo = await TermoEntregaService.create(req.body, req.user?.id);
    return successResponse(res, termo, 'Termo de entrega gerado', 201);
  }

  static async list(req: Request, res: Response) {
    const termos = await TermoEntregaService.list({ ordemServicoId: req.query.ordem_servico_id ? Number(req.query.ordem_servico_id) : undefined });
    return successResponse(res, termos);
  }

  static async findById(req: Request, res: Response) {
    const termo = await TermoEntregaService.findById(Number(req.params.id));
    return successResponse(res, termo);
  }

  static async update(req: Request, res: Response) {
    const termo = await TermoEntregaService.update(Number(req.params.id), req.body);
    return successResponse(res, termo, 'Termo de entrega atualizado');
  }

  static async delete(req: Request, res: Response) {
    await TermoEntregaService.delete(Number(req.params.id));
    return successResponse(res, null, 'Termo de entrega removido');
  }

  static async addPhotos(req: Request, res: Response) {
    const fotos = await TermoEntregaService.addPhotos(Number(req.params.id), req.body.fotos);
    return successResponse(res, fotos, 'Fotos adicionadas', 201);
  }

  static async deletePhoto(req: Request, res: Response) {
    await TermoEntregaService.deletePhoto(Number(req.params.id), Number(req.params.fotoId));
    return successResponse(res, null, 'Foto removida');
  }

  static async pdf(req: Request, res: Response) {
    const termo = await TermoEntregaService.findById(Number(req.params.id));
    const plain = termo.get({ plain: true }) as any;
    const company = companyFromRequest(req);
    const pdf = await renderHtmlToPdf(buildPdfHtml(plain, req.user?.nome, company));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=termo-entrega-${termo.id}.pdf`);
    return res.send(pdf);
  }
}
