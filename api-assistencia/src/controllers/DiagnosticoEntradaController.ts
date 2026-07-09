import fs from 'fs';
import path from 'path';

import { Request, Response } from 'express';

import { DiagnosticoEntradaService } from '../services/DiagnosticoEntradaService';
import { successResponse } from '../utils/jsonResponse';
import { parsePagination } from '../utils/pagination';
import { renderHtmlToPdf } from '../utils/renderPdf';

type ChecklistItem = { status?: string; observacao?: string | null };
type ChecklistMap = Record<string, ChecklistItem>;
type VisualMark = { area?: string; tipo?: string; observacao?: string | null };
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

const physicalAreas = [
  { key: 'tela', title: 'Tela' },
  { key: 'tampa_traseira', title: 'Tampa traseira' },
  { key: 'aro_carcaca', title: 'Aro / Carcaca' },
  { key: 'botoes', title: 'Botoes' },
  { key: 'conector_carga', title: 'Conector de carga' },
  { key: 'oxidacao', title: 'Sinais de oxidacao' }
] as const;

const oldPhysicalFallback: Record<string, string[]> = {
  tela: ['tela_trincada', 'tela_riscada', 'tela_manchada', 'touch_funcionando'],
  tampa_traseira: ['tampa_traseira_trincada', 'tampa_traseira_solta', 'tampa_traseira_riscada'],
  aro_carcaca: ['carcaca_amassada', 'carcaca_trincada', 'aro_torto', 'sinais_de_abertura'],
  botoes: ['botao_power_funcionando', 'botoes_volume_funcionando'],
  conector_carga: ['entrada_carregador_ok', 'conector_carga_funciona'],
  oxidacao: ['sinais_de_oxidacao']
};

const functionalGroups = [
  { title: 'Alimentacao', items: [['liga', 'Liga'], ['carrega', 'Carrega'], ['bateria', 'Bateria']] },
  { title: 'Conectividade', items: [['chip', 'Chip'], ['wifi', 'Wi-Fi'], ['bluetooth', 'Bluetooth']] },
  { title: 'Audio', items: [['alto_falante', 'Alto-falante'], ['microfone', 'Microfone'], ['vibracao', 'Vibracao']] },
  { title: 'Cameras', items: [['camera_frontal', 'Camera frontal'], ['camera_traseira', 'Camera traseira'], ['flash', 'Flash']] },
  { title: 'Seguranca', items: [['biometria', 'Biometria'], ['face_id', 'Face ID'], ['sensores', 'Sensores']] },
  { title: 'Tela', items: [['display', 'Display'], ['touch', 'Touch']] }
] as const;

const oldFunctionalFallback: Record<string, string[]> = {
  liga: ['aparelho_liga'],
  chip: ['reconhece_chip'],
  wifi: ['reconhece_wifi'],
  bluetooth: ['reconhece_bluetooth'],
  alto_falante: ['alto_falante_funciona'],
  microfone: ['microfone_funciona'],
  camera_frontal: ['camera_frontal_funciona'],
  camera_traseira: ['camera_traseira_funciona'],
  flash: ['flash_funciona'],
  biometria: ['biometria_funciona'],
  display: ['display_funciona'],
  touch: ['touch_funciona'],
  bateria: ['bateria_segura_carga']
};

const photoLabels: Record<string, string> = {
  frente: 'Frente',
  verso: 'Verso',
  lateral_esquerda: 'Lateral esquerda',
  lateral_direita: 'Lateral direita',
  conector_carga: 'Conector',
  detalhe_defeito: 'Defeito principal',
  outro: 'Outra'
};

function htmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== '';
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
  if (!fs.existsSync(filePath)) {
    return '';
  }

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

function statusMeta(status?: string) {
  const normalized = status ?? 'nao_testado';
  const map: Record<string, { icon: string; label: string; cls: string; relevant: boolean }> = {
    ok: { icon: '&#10003;', label: 'OK', cls: 'ok', relevant: true },
    boa: { icon: '&#10003;', label: 'Boa', cls: 'ok', relevant: true },
    bom: { icon: '&#10003;', label: 'Bom', cls: 'ok', relevant: true },
    funcionando: { icon: '&#10003;', label: 'Funcionando', cls: 'ok', relevant: true },
    nao_encontrado: { icon: '&#10003;', label: 'Nao encontrado', cls: 'ok', relevant: true },
    com_avarias: { icon: '&#9888;', label: 'Com avarias', cls: 'warning', relevant: true },
    parcial: { icon: '&#9888;', label: 'Parcial', cls: 'warning', relevant: true },
    com_folga: { icon: '&#9888;', label: 'Com folga', cls: 'warning', relevant: true },
    suspeita: { icon: '&#9888;', label: 'Suspeita', cls: 'warning', relevant: true },
    com_defeito: { icon: '&#10007;', label: 'Com defeito', cls: 'problem', relevant: true },
    com_problema: { icon: '&#10007;', label: 'Com problema', cls: 'problem', relevant: true },
    nao_funciona: { icon: '&#10007;', label: 'Nao funciona', cls: 'problem', relevant: true },
    quebrada: { icon: '&#10007;', label: 'Quebrada', cls: 'problem', relevant: true },
    muito_danificada: { icon: '&#10007;', label: 'Muito danificada', cls: 'problem', relevant: true },
    nao_funcionam: { icon: '&#10007;', label: 'Nao funcionam', cls: 'problem', relevant: true },
    nao_carrega: { icon: '&#10007;', label: 'Nao carrega', cls: 'problem', relevant: true },
    confirmado: { icon: '&#10007;', label: 'Confirmado', cls: 'problem', relevant: true },
    nao_testado: { icon: '&#9675;', label: 'Nao testado', cls: 'untested', relevant: false },
    nao_possui: { icon: '&#9675;', label: 'Nao possui', cls: 'missing', relevant: false }
  };

  return map[normalized] ?? map.nao_testado;
}

function bestItem(checklist: ChecklistMap | null | undefined, key: string, fallbacks: Record<string, string[]> = {}) {
  if (checklist?.[key]) {
    return checklist[key];
  }

  const legacyKeys = fallbacks[key] ?? [];
  for (const legacyKey of legacyKeys) {
    const item = checklist?.[legacyKey];
    if (item?.status && item.status !== 'nao_testado') {
      return item;
    }
  }

  return checklist?.[legacyKeys[0]];
}

function infoItem(label: string, value: unknown) {
  if (!hasValue(value)) {
    return '';
  }
  return `<div class="info-item"><span>${htmlEscape(label)}</span><strong>${htmlEscape(value)}</strong></div>`;
}

function companionBadge(label: string, enabled: boolean) {
  return `<span class="badge ${enabled ? 'yes' : 'no'}">${enabled ? '&#10003;' : '&#10007;'} ${htmlEscape(label)}</span>`;
}

function physicalCard(area: (typeof physicalAreas)[number], checklist?: ChecklistMap | null) {
  const item = bestItem(checklist, area.key, oldPhysicalFallback);
  const meta = statusMeta(item?.status);
  return `
    <article class="area-card ${meta.cls}">
      <div class="area-title">
        <span class="status-icon">${meta.icon}</span>
        <h3>${htmlEscape(area.title)}</h3>
      </div>
      <strong>${htmlEscape(meta.label)}</strong>
      ${item?.observacao ? `<p>${htmlEscape(item.observacao)}</p>` : ''}
    </article>
  `;
}

function functionalItem(label: string, item?: ChecklistItem) {
  const meta = statusMeta(item?.status);
  if (!meta.relevant && !item?.observacao) {
    return '';
  }

  return `
    <div class="functional-item ${meta.cls}">
      <span class="status-icon">${meta.icon}</span>
      <div>
        <strong>${htmlEscape(label)}</strong>
        ${item?.observacao ? `<small>${htmlEscape(item.observacao)}</small>` : ''}
      </div>
    </div>
  `;
}

function functionalChecklist(checklist?: ChecklistMap | null) {
  const groups = functionalGroups
    .map((group) => {
      const items = group.items
        .map(([key, label]) => functionalItem(label, bestItem(checklist, key, oldFunctionalFallback)))
        .filter(Boolean)
        .join('');
      if (!items) return '';
      return `<article class="check-card"><h3>${htmlEscape(group.title)}</h3><div class="functional-grid">${items}</div></article>`;
    })
    .filter(Boolean)
    .join('');

  return groups;
}

function visualMarks(marks: VisualMark[]) {
  const list = marks
    .filter((mark) => hasValue(mark.area) || hasValue(mark.tipo) || hasValue(mark.observacao))
    .map((mark) => `
      <li>
        <strong>${htmlEscape(mark.area || 'Area')}</strong>
        <span>${htmlEscape(mark.tipo || 'Marcacao')}${mark.observacao ? ` - ${htmlEscape(mark.observacao)}` : ''}</span>
      </li>
    `)
    .join('');

  return `
    <div class="visual-box">
      <div class="phone-map">
        <div class="phone-front"><span>Tela</span></div>
        <div class="phone-back"><span>Verso</span><i></i></div>
        <div class="phone-side"></div>
      </div>
      <div>
        <h3>Check-in visual</h3>
        ${list ? `<ul class="marks">${list}</ul>` : '<p class="muted compact">Nenhuma avaria visual marcada no desenho.</p>'}
      </div>
    </div>
  `;
}

function photoGallery(fotos: any[]) {
  if (!fotos.length) {
    return '';
  }

  const items = fotos
    .map((foto) => {
      const file = path.resolve(process.cwd(), String(foto.caminho_arquivo).replace(/^\//, ''));
      const src = dataUri(file);
      if (!src) return '';
      const label = photoLabels[foto.tipo_foto] ?? 'Foto';
      return `
        <figure>
          <img src="${src}" alt="${htmlEscape(label)}" />
          <figcaption>${htmlEscape(label)}${foto.descricao ? ` - ${htmlEscape(foto.descricao)}` : ''}</figcaption>
        </figure>
      `;
    })
    .filter(Boolean)
    .join('');

  return items ? `<section class="section photo-section"><h2>Galeria de fotos</h2><div class="photo-grid">${items}</div></section>` : '';
}

function buildPdfHtml(plain: any, userName?: string, company: CompanyProfile = companyFromRequest({ body: {} } as Request)) {
  const fotos = Array.isArray(plain.fotos) ? plain.fotos : [];
  const checklistFisico = parseJsonValue<ChecklistMap | null>(plain.checklist_fisico, null);
  const checklistFuncional = parseJsonValue<ChecklistMap | null>(plain.checklist_funcional, null);
  const parsedMarks = parseJsonValue<VisualMark[]>(plain.marcacoes_visuais, []);
  const marks = Array.isArray(parsedMarks) ? parsedMarks : [];
  const functionalHtml = functionalChecklist(checklistFuncional);
  const fullDevice = [plain.marca, plain.modelo].filter(Boolean).join(' ') || plain.aparelho;
  const companions = [
    companionBadge('Chip', plain.possui_chip),
    companionBadge('Cartao memoria', plain.possui_cartao_memoria),
    companionBadge('Capinha', plain.possui_capinha),
    companionBadge('Pelicula', plain.possui_pelicula),
    companionBadge('Carregador', plain.acompanha_carregador),
    companionBadge('Cabo', plain.acompanha_cabo),
    companionBadge('Caixa', plain.acompanha_caixa),
    companionBadge('Nota fiscal', plain.acompanha_nota_fiscal)
  ].join('');

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #fff; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .document { max-width: 100%; }
          .hero { display: grid; grid-template-columns: 1fr auto; gap: 18px; padding: 18px; border-radius: 16px; color: #fff; background: #111827; }
          .brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
          .logo { width: 62px; height: 62px; max-width: 62px; max-height: 62px; border-radius: 12px; background: rgba(255,255,255,.12); display: grid; place-items: center; font-weight: 800; font-size: 18px; border: 1px solid rgba(255,255,255,.25); object-fit: contain; padding: 4px; }
          .brand h1 { margin: 0; font-size: 22px; }
          .brand p, .doc-number p { margin: 4px 0 0; color: rgba(255,255,255,.8); font-size: 11px; }
          .doc-number { text-align: right; background: #dc2626; border-radius: 14px; padding: 12px 14px; min-width: 132px; }
          .doc-number strong { display: block; font-size: 24px; }
          .title-bar { display: flex; justify-content: space-between; align-items: center; margin: 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
          .title-bar h2 { margin: 0; font-size: 21px; }
          .status { padding: 7px 12px; border-radius: 999px; background: #fee2e2; color: #991b1b; font-weight: 700; text-transform: uppercase; font-size: 10px; }
          .section { margin-top: 14px; }
          .section h2 { margin: 0 0 9px; font-size: 14px; }
          .card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .card, .check-card, .area-card, .visual-box { border: 1px solid #e5e7eb; border-radius: 13px; padding: 11px; background: #fff; box-shadow: 0 4px 16px rgba(15,23,42,.05); break-inside: avoid; }
          .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; }
          .info-item span { display: block; color: #6b7280; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: .04em; }
          .info-item strong { display: block; margin-top: 3px; font-size: 12px; overflow-wrap: anywhere; }
          .defect { border-left: 4px solid #dc2626; padding: 10px 12px; background: #fef2f2; border-radius: 10px; line-height: 1.45; }
          .badges { display: flex; flex-wrap: wrap; gap: 7px; }
          .badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 7px 10px; font-weight: 700; font-size: 11px; }
          .badge.yes { background: #dcfce7; color: #166534; }
          .badge.no { background: #f3f4f6; color: #6b7280; }
          .physical-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; }
          .area-title { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
          .area-card h3 { margin: 0; font-size: 12px; }
          .area-card p { margin: 6px 0 0; color: #4b5563; line-height: 1.35; }
          .functional-sections { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
          .check-card h3 { margin: 0 0 8px; font-size: 12px; }
          .functional-grid { display: grid; gap: 6px; }
          .functional-item { display: grid; grid-template-columns: 22px 1fr; gap: 7px; align-items: start; padding: 7px; border-radius: 10px; }
          .functional-item strong { display: block; font-size: 11px; }
          .functional-item small { display: block; margin-top: 2px; color: #4b5563; line-height: 1.25; }
          .status-icon { width: 22px; height: 22px; border-radius: 50%; display: inline-grid; place-items: center; font-weight: 800; }
          .ok { background: #ecfdf5; } .ok .status-icon { background: #16a34a; color: #fff; }
          .warning { background: #fffbeb; } .warning .status-icon { background: #f59e0b; color: #fff; }
          .problem { background: #fef2f2; } .problem .status-icon { background: #dc2626; color: #fff; }
          .untested, .missing { background: #f3f4f6; } .untested .status-icon, .missing .status-icon { background: #9ca3af; color: #fff; }
          .visual-box { display: grid; grid-template-columns: 190px minmax(0,1fr); gap: 14px; align-items: center; }
          .phone-map { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 150px; }
          .phone-front, .phone-back { width: 64px; height: 126px; border: 5px solid #111827; border-radius: 18px; position: relative; display: grid; place-items: center; color: #6b7280; font-size: 10px; background: #f9fafb; }
          .phone-back i { position: absolute; top: 14px; left: 10px; width: 18px; height: 18px; border-radius: 50%; background: #111827; opacity: .45; }
          .phone-side { width: 12px; height: 118px; border-radius: 999px; background: #111827; opacity: .85; }
          .marks { margin: 0; padding-left: 16px; display: grid; gap: 5px; }
          .marks li span { color: #4b5563; }
          .photo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          figure { margin: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; break-inside: avoid; background: #fff; }
          figure img { width: 100%; height: 255px; object-fit: cover; display: block; }
          figcaption { min-height: 34px; padding: 8px; font-size: 10px; color: #374151; line-height: 1.25; }
          .terms { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 11px; font-size: 10px; line-height: 1.45; color: #374151; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 34px; }
          .signature { border-top: 1px solid #111827; padding-top: 7px; text-align: center; font-size: 10px; }
          .muted { color: #6b7280; }
          .compact { font-size: 10px; line-height: 1.4; }
          .photo-section { break-before: auto; }
        </style>
      </head>
      <body>
        <main class="document">
          <header class="hero">
            ${companyHeader(company)}
            <div class="doc-number">
              <p>Check-in tecnico</p>
              <strong>#${htmlEscape(plain.id)}</strong>
              <p>${htmlEscape(new Date(plain.createdAt).toLocaleString('pt-BR'))}</p>
            </div>
          </header>

          <div class="title-bar">
            <h2>Check-in Tecnico de Aparelho</h2>
            <span class="status">${htmlEscape(plain.status)}</span>
          </div>

          <section class="section card-grid">
            <article class="card">
              <h2>Cliente</h2>
              <div class="info-grid">
                ${infoItem('Nome', plain.cliente?.nome)}
                ${infoItem('Telefone', plain.cliente?.telefone)}
                ${infoItem('CPF', plain.cliente?.cpf)}
                ${infoItem('Endereco', plain.cliente?.endereco)}
              </div>
            </article>
            <article class="card">
              <h2>Aparelho</h2>
              <div class="info-grid">
                ${infoItem('Aparelho', plain.aparelho)}
                ${infoItem('Marca / modelo', fullDevice)}
                ${infoItem('Cor', plain.cor)}
                ${infoItem('IMEI', plain.imei)}
                ${plain.senha_desbloqueio ? infoItem('Senha informada', 'Sim') : ''}
              </div>
            </article>
          </section>

          <section class="section">
            <h2>Defeito relatado</h2>
            <div class="defect">${htmlEscape(plain.defeito_relatado || 'Nao informado')}</div>
          </section>

          <section class="section">
            <h2>Itens que acompanham</h2>
            <div class="badges">${companions}</div>
          </section>

          <section class="section">
            <h2>Estado fisico</h2>
            <div class="physical-grid">${physicalAreas.map((area) => physicalCard(area, checklistFisico)).join('')}</div>
          </section>

          <section class="section">
            ${visualMarks(marks)}
          </section>

          ${
            functionalHtml
              ? `<section class="section"><h2>Checklist funcional</h2><div class="functional-sections">${functionalHtml}</div></section>`
              : ''
          }

          ${photoGallery(fotos)}

          <section class="section">
            ${plain.observacao_geral ? `<h2>Observacoes gerais</h2><div class="terms">${htmlEscape(plain.observacao_geral)}</div>` : ''}
          </section>

          <section class="section">
            <h2>Termo de recebimento</h2>
            <div class="terms">
              Este documento registra o estado fisico e funcional do aparelho no momento da entrada na assistencia tecnica, antes da realizacao de qualquer servico.
              Itens nao testados nao puderam ser verificados no atendimento inicial. O cliente declara estar ciente das condicoes registradas neste check-in.
            </div>
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

export class DiagnosticoEntradaController {
  static async create(req: Request, res: Response) {
    const diagnostico = await DiagnosticoEntradaService.create(req.body, req.user?.id);
    return successResponse(res, diagnostico, 'Diagnostico de entrada cadastrado', 201);
  }

  static async list(req: Request, res: Response) {
    const diagnosticos = await DiagnosticoEntradaService.list({
      termo: req.query.termo as string | undefined,
      status: req.query.status as string | undefined,
      data: req.query.data as string | undefined
    }, parsePagination(req.query));
    return successResponse(res, diagnosticos);
  }

  static async findById(req: Request, res: Response) {
    const diagnostico = await DiagnosticoEntradaService.findById(Number(req.params.id));
    return successResponse(res, diagnostico);
  }

  static async update(req: Request, res: Response) {
    const diagnostico = await DiagnosticoEntradaService.update(Number(req.params.id), req.body);
    return successResponse(res, diagnostico, 'Diagnostico de entrada alterado');
  }

  static async delete(req: Request, res: Response) {
    await DiagnosticoEntradaService.delete(Number(req.params.id));
    return successResponse(res, null, 'Diagnostico de entrada removido');
  }

  static async finish(req: Request, res: Response) {
    const diagnostico = await DiagnosticoEntradaService.finish(Number(req.params.id));
    return successResponse(res, diagnostico, 'Diagnostico de entrada finalizado');
  }

  static async cancel(req: Request, res: Response) {
    const diagnostico = await DiagnosticoEntradaService.cancel(Number(req.params.id));
    return successResponse(res, diagnostico, 'Diagnostico de entrada cancelado');
  }

  static async addPhotos(req: Request, res: Response) {
    const fotos = await DiagnosticoEntradaService.addPhotos(Number(req.params.id), req.body.fotos);
    return successResponse(res, fotos, 'Fotos adicionadas', 201);
  }

  static async deletePhoto(req: Request, res: Response) {
    await DiagnosticoEntradaService.deletePhoto(Number(req.params.id), Number(req.params.fotoId));
    return successResponse(res, null, 'Foto removida');
  }

  static async pdf(req: Request, res: Response) {
    const diagnostico = await DiagnosticoEntradaService.findById(Number(req.params.id));
    const plain = diagnostico.get({ plain: true }) as any;
    const company = companyFromRequest(req);
    const pdf = await renderHtmlToPdf(buildPdfHtml(plain, req.user?.nome, company));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=check-in-tecnico-${diagnostico.id}.pdf`);
    return res.send(pdf);
  }
}
