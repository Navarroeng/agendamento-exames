import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCNPJ } from "@/lib/cnpj";
import { formatCurrency } from "@/lib/money";
import type {
  OrcamentoComItens,
  OrcamentoItemRecord,
  ServicoSstRecord,
} from "@/lib/orcamento-types";
import {
  isPacoteCompletoSst,
  resolveItensInclusosServico,
} from "@/lib/servico-sst-pacote";
import { buscarClientePorId } from "@/services/cliente.service";
import { listarServicosSst } from "@/services/servico-sst.service";

/* ── Paleta Navarro premium ─────────────────────────────────────── */
const NAVY: [number, number, number] = [8, 43, 99];
const NAVY_SOFT: [number, number, number] = [21, 52, 108];
const GOLD: [number, number, number] = [201, 151, 43];
const GOLD_LIGHT: [number, number, number] = [232, 210, 158];
const GOLD_BG: [number, number, number] = [252, 246, 232];
const WHITE: [number, number, number] = [255, 255, 255];
const SLATE_50: [number, number, number] = [248, 250, 252];
const SLATE_100: [number, number, number] = [241, 245, 249];
const SLATE_200: [number, number, number] = [226, 232, 240];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_700: [number, number, number] = [51, 65, 85];
const SLATE_900: [number, number, number] = [15, 23, 42];
const CHECK_GREEN: [number, number, number] = [22, 101, 52];

const MARGIN = 12;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 283;
const FOOTER_H = 12;

const NAVARRO = {
  site: "www.navarroeng.com.br",
  email: "contato@navarroeng.com.br",
  telefone: "(11) 3181-7697",
  whatsapp: "(11) 97706-5599",
  razaoSocial: "Navarro Engenharia de Segurança do Trabalho e Medicina Ocupacional",
  responsavelTecnico: "Equipe Técnica Navarro Engenharia",
} as const;

const PROPOSTA_DESCRICAO_PARAGRAFOS: readonly string[] = [
  [
    "Valor abaixo equivalente a realização e elaboração dos laudos, disponibilização dos arquivos em",
    "PDF para a empresa e gestão dos eventos de saúde e segurança do trabalho S-2210; S-2220; S-",
    "2240 dentro da plataforma E-social durante toda vigência do contrato (12 meses). Incluindo o",
    "Laudo de Riscos Psicossociais conforme a nova NR-01.",
  ].join("\n"),
  "(Laudos obrigatórios por lei sujeito a multa do Ministério do trabalho MTE)",
] as const;

const PACOTE_COMPLETO_INCLUSOS_ITENS: readonly string[] = [
  "Todos Laudos e Serviços listados à cima.",
  "Gestão completa e envio ao eSocial",
  "Exames Clínicos: 1",
  "CAT - Cortesia",
] as const;

const PACOTE_COMPLETO_INCLUSOS_OBSERVACOES: readonly string[] = [
  "Se necessário a realização de Exames\nComplementares serão cobrados à parte.",
  "ASO's adicionais serão cobrados à parte.",
] as const;

type JsPDF = import("jspdf").jsPDF;
type RGB = [number, number, number];

interface LogoAsset {
  dataUrl: string;
  width: number;
  height: number;
}

interface ClientePdfInfo {
  cnpj: string;
  endereco: string;
  cidade: string;
}

/* ── Utilitários ─────────────────────────────────────────────────── */
async function loadLogoAsset(): Promise<LogoAsset | null> {
  try {
    const response = await fetch("/logo-navarro.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 280, h: 64 });
      img.src = dataUrl;
    });

    const maxMm = 26;
    const ratio = dims.w / dims.h;
    let width = maxMm;
    let height = width / ratio;
    if (height > maxMm) {
      height = maxMm;
      width = height * ratio;
    }

    return { dataUrl, width, height };
  } catch {
    return null;
  }
}

async function resolveClientePdfInfo(
  orcamento: OrcamentoComItens
): Promise<ClientePdfInfo> {
  if (!orcamento.cliente_id) {
    return { cnpj: "—", endereco: "—", cidade: "—" };
  }

  try {
    const cliente = await buscarClientePorId(orcamento.cliente_id);
    if (!cliente) {
      return { cnpj: "—", endereco: "—", cidade: "—" };
    }
    return {
      cnpj: formatCNPJ(cliente.cnpj),
      endereco: "—",
      cidade: "—",
    };
  } catch {
    return { cnpj: "—", endereco: "—", cidade: "—" };
  }
}

function displayValue(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function ensureSpace(doc: JsPDF, y: number, needed: number): number {
  if (y + needed > FOOTER_Y - 2) {
    doc.addPage();
    return MARGIN + 4;
  }
  return y;
}

function drawCard(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { fill?: RGB; stroke?: RGB; radius?: number }
) {
  const fill = options?.fill ?? SLATE_50;
  const stroke = options?.stroke ?? SLATE_200;
  const radius = options?.radius ?? 2.5;
  doc.setFillColor(...fill);
  doc.setDrawColor(...stroke);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, radius, radius, "FD");
}

function drawSectionTitle(
  doc: JsPDF,
  y: number,
  title: string,
  options?: { x?: number; width?: number }
): number {
  const x = options?.x ?? MARGIN;
  const width = options?.width ?? 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), x, y);

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(x, y + 1.5, x + width, y + 1.5);

  return y + 7;
}

function resolveCatalogoServico(
  item: OrcamentoItemRecord,
  catalogo: ServicoSstRecord[]
): ServicoSstRecord | undefined {
  return (
    catalogo.find((servico) => servico.id === item.servico_id) ??
    catalogo.find((servico) => servico.nome === item.servico_nome)
  );
}

function collectAllInclusos(
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const itens = [...(orcamento.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );

  for (const item of itens) {
    const servico = resolveCatalogoServico(item, catalogo);
    const inclusos = resolveItensInclusosServico(servico, item.servico_nome);
    for (const line of inclusos) {
      const key = line.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(line.trim());
    }
  }

  return result;
}

function orcamentoHasPacoteCompleto(
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[]
): boolean {
  const itens = orcamento.orcamento_itens ?? [];
  return itens.some((item) => {
    const servico = resolveCatalogoServico(item, catalogo);
    return isPacoteCompletoSst(servico?.nome ?? item.servico_nome);
  });
}

function measurePacoteCompletoInclusosBlockHeight(
  doc: JsPDF,
  width: number
): number {
  const textWidth = width - 10;
  let h = 8;

  doc.setFontSize(7.5);
  PACOTE_COMPLETO_INCLUSOS_ITENS.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, textWidth);
    h += lines.length * 3.6 + 1.5;
  });

  h += 4;
  h += 5;

  doc.setFontSize(7);
  PACOTE_COMPLETO_INCLUSOS_OBSERVACOES.forEach((paragrafo) => {
    const lines = wrapParagraphLines(doc, paragrafo, textWidth);
    h += lines.length * 3.5 + 2;
  });

  return h + 6;
}

function drawPacoteCompletoInclusosBlock(
  doc: JsPDF,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  drawCard(doc, x, y, width, height, {
    fill: GOLD_BG,
    stroke: SLATE_200,
  });

  const textX = x + 5;
  const textWidth = width - 10;
  let itemY = y + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("O QUE ESTÁ INCLUSO?", textX, itemY);
  itemY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_700);
  PACOTE_COMPLETO_INCLUSOS_ITENS.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, textWidth);
    doc.text(lines, textX, itemY);
    itemY += lines.length * 3.6 + 1.5;
  });

  itemY += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_700);
  doc.text("Observações:", textX, itemY);
  itemY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_700);
  PACOTE_COMPLETO_INCLUSOS_OBSERVACOES.forEach((paragrafo) => {
    const lines = wrapParagraphLines(doc, paragrafo, textWidth);
    doc.text(lines, textX, itemY);
    itemY += lines.length * 3.5 + 2;
  });
}

function wrapParagraphLines(
  doc: JsPDF,
  text: string,
  maxWidth: number
): string[] {
  return text.split("\n").flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed) return [];
    return doc.splitTextToSize(trimmed, maxWidth);
  });
}

function parseFormaPagamentoLines(forma: string | null): {
  condicao: string;
  parcelamento: string | null;
  aVista: string | null;
} {
  const condicao = forma?.trim() || "A combinar";
  const lower = condicao.toLowerCase();

  const parcelamento =
    /parcel|(\d+\s*x)|(\d+x)/i.test(condicao) ? condicao : null;
  const aVista =
    /à vista|a vista|vista/i.test(lower) && !parcelamento ? condicao : null;

  return { condicao, parcelamento, aVista };
}

function calcDescontoValor(orcamento: OrcamentoComItens): number {
  const subtotal = Number(orcamento.subtotal);
  const total = Number(orcamento.valor_total);
  const pct = Number(orcamento.desconto_percentual);
  if (pct > 0) {
    return Math.max(0, subtotal - total);
  }
  return Math.max(0, subtotal - total);
}

/* ── Cabeçalho ─────────────────────────────────────────────────── */
function drawHeader(
  doc: JsPDF,
  logo: LogoAsset | null,
  orcamento: OrcamentoComItens
): number {
  const headerH = 46;
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, MARGIN, CONTENT_W, headerH, 3, 3, "F");

  doc.setFillColor(...GOLD);
  doc.triangle(
    MARGIN + CONTENT_W * 0.68,
    MARGIN,
    MARGIN + CONTENT_W,
    MARGIN,
    MARGIN + CONTENT_W,
    MARGIN + headerH * 0.55,
    "F"
  );

  const logoX = MARGIN + 5;
  const logoY = MARGIN + 7;
  if (logo) {
    doc.addImage(logo.dataUrl, "PNG", logoX, logoY, logo.width, logo.height);
  } else {
    doc.setTextColor(...WHITE);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("NAVARRO", logoX, logoY + 8);
  }

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PROPOSTA COMERCIAL", MARGIN + CONTENT_W - 5, MARGIN + 16, {
    align: "right",
  });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GOLD_LIGHT);
  const metaY = MARGIN + 24;
  doc.text(`Nº ${orcamento.numero}`, MARGIN + CONTENT_W - 5, metaY, {
    align: "right",
  });
  doc.text(
    `Emissão: ${formatDateIsoToBR(orcamento.data_proposta)}`,
    MARGIN + CONTENT_W - 5,
    metaY + 4.5,
    { align: "right" }
  );
  doc.text(
    `Validade: ${formatDateIsoToBR(orcamento.validade_proposta) || "30 dias"}`,
    MARGIN + CONTENT_W - 5,
    metaY + 9,
    { align: "right" }
  );

  doc.setFillColor(...NAVY_SOFT);
  doc.rect(MARGIN, MARGIN + headerH - 11, CONTENT_W, 11, "F");
  doc.setFontSize(6.5);
  doc.setTextColor(...GOLD_LIGHT);
  const contactY = MARGIN + headerH - 4;
  doc.text(
    `${NAVARRO.telefone}  ·  ${NAVARRO.email}  ·  ${NAVARRO.site}`,
    MARGIN + 5,
    contactY
  );
  doc.text(NAVARRO.responsavelTecnico, MARGIN + CONTENT_W - 5, contactY, {
    align: "right",
  });

  return MARGIN + headerH + 6;
}

/* ── Card do cliente ───────────────────────────────────────────── */
function drawClientCard(
  doc: JsPDF,
  y: number,
  orcamento: OrcamentoComItens,
  clienteInfo: ClientePdfInfo
): number {
  y = drawSectionTitle(doc, y, "Dados do cliente");

  const cardH = 36;
  drawCard(doc, MARGIN, y, CONTENT_W, cardH, {
    fill: WHITE,
    stroke: SLATE_200,
  });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN, y + cardH);

  const col1X = MARGIN + 6;
  const col2X = MARGIN + CONTENT_W / 2 + 2;
  let rowY = y + 7;

  const fieldsLeft: [string, string][] = [
    ["Cliente", orcamento.cliente_nome],
    ["CNPJ", clienteInfo.cnpj],
    ["Contato", displayValue(orcamento.contato)],
    ["E-mail", displayValue(orcamento.email)],
  ];

  const fieldsRight: [string, string][] = [
    ["Telefone", displayValue(orcamento.telefone)],
    ["Endereço", clienteInfo.endereco],
    ["Cidade", clienteInfo.cidade],
    ["Responsável Navarro", orcamento.responsavel],
  ];

  doc.setFontSize(7);

  fieldsLeft.forEach(([label, value], index) => {
    const lineY = rowY + index * 7.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_500);
    doc.text(label, col1X, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_900);
    doc.text(String(value).slice(0, 52), col1X + 22, lineY);
  });

  fieldsRight.forEach(([label, value], index) => {
    const lineY = rowY + index * 7.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_500);
    doc.text(label, col2X, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_900);
    doc.text(String(value).slice(0, 52), col2X + 28, lineY);
  });

  return y + cardH + 6;
}

/* ── Descrição da proposta ─────────────────────────────────────── */
function measureDescricaoPropostaHeight(
  doc: JsPDF,
  paragrafos: readonly string[]
): number {
  if (paragrafos.length === 0) return 0;

  doc.setFontSize(7.5);
  const textWidth = CONTENT_W - 12;
  let h = 6;

  paragrafos.forEach((paragrafo, index) => {
    const lines = wrapParagraphLines(doc, paragrafo, textWidth);
    h += lines.length * 3.8;
    if (index < paragrafos.length - 1) h += 4;
  });

  return h + 6;
}

function drawDescricaoProposta(
  doc: JsPDF,
  y: number,
  paragrafos: readonly string[]
): number {
  if (paragrafos.length === 0) return y;

  y = ensureSpace(doc, y, measureDescricaoPropostaHeight(doc, paragrafos) + 10);
  y = drawSectionTitle(doc, y, "Descrição da proposta");

  const blockH = measureDescricaoPropostaHeight(doc, paragrafos);
  drawCard(doc, MARGIN, y, CONTENT_W, blockH, {
    fill: SLATE_50,
    stroke: SLATE_200,
  });

  let textY = y + 6;
  const textX = MARGIN + 6;
  const textWidth = CONTENT_W - 12;

  paragrafos.forEach((paragrafo, index) => {
    const isNotaLegal = index === paragrafos.length - 1 && paragrafos.length > 1;
    doc.setFont("helvetica", isNotaLegal ? "italic" : "normal");
    doc.setFontSize(isNotaLegal ? 7 : 7.5);
    doc.setTextColor(...(isNotaLegal ? SLATE_500 : SLATE_700));

    const lines = wrapParagraphLines(doc, paragrafo, textWidth);
    doc.text(lines, textX, textY);
    textY += lines.length * 3.8 + (index < paragrafos.length - 1 ? 4 : 0);
  });

  return y + blockH + 6;
}

/* ── Tabela de serviços ────────────────────────────────────────── */
function measureInclusosBlockHeight(
  doc: JsPDF,
  inclusos: string[],
  maxWidth: number
): number {
  if (inclusos.length === 0) return 0;

  let height = 3.5;
  doc.setFontSize(6.5);
  inclusos.forEach((line) => {
    const wrapped = doc.splitTextToSize(`• ${line}`, maxWidth);
    height += wrapped.length * 3.2;
  });
  return height;
}

function estimateServiceRowHeight(
  doc: JsPDF,
  item: OrcamentoItemRecord,
  servico: ServicoSstRecord | undefined,
  serviceColWidth: number
): number {
  const inclusos = resolveItensInclusosServico(servico, item.servico_nome);
  const isPacote = isPacoteCompletoSst(servico?.nome ?? item.servico_nome);

  if (isPacote && inclusos.length > 0) {
    return 8 + measureInclusosBlockHeight(doc, inclusos, serviceColWidth - 4);
  }

  let h = 7;
  const descricao = servico?.descricao?.trim();
  if (descricao) {
    doc.setFontSize(6.5);
    const lines = doc.splitTextToSize(descricao, serviceColWidth - 4);
    h += lines.length * 3.2 + 1.5;
  }
  return h;
}

function drawServicesTable(
  doc: JsPDF,
  y: number,
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[]
): number {
  const itens = [...(orcamento.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );
  if (itens.length === 0) return y;

  y = drawSectionTitle(doc, y, "Serviços propostos");

  const colWidths = [76, 20, 34, 34];
  const colStarts = [
    MARGIN,
    MARGIN + colWidths[0],
    MARGIN + colWidths[0] + colWidths[1],
    MARGIN + colWidths[0] + colWidths[1] + colWidths[2],
  ];
  const headers = ["Serviço", "Qtd.", "Valor unit.", "Total"];

  const drawTableHead = (startY: number) => {
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, startY, CONTENT_W, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    headers.forEach((header, index) => {
      const align = index === 0 ? "left" : "right";
      const x =
        index === 0
          ? colStarts[index] + 3
          : colStarts[index] + colWidths[index] - 2;
      doc.text(header, x, startY + 5.5, { align });
    });
    return startY + 8;
  };

  y = drawTableHead(y);

  itens.forEach((item, index) => {
    const servico = resolveCatalogoServico(item, catalogo);
    const inclusos = resolveItensInclusosServico(servico, item.servico_nome);
    const isPacote = isPacoteCompletoSst(servico?.nome ?? item.servico_nome);
    const rowH = estimateServiceRowHeight(
      doc,
      item,
      servico,
      colWidths[0]
    );

    y = ensureSpace(doc, y, rowH + 2);
    if (y <= MARGIN + 10) {
      y = drawTableHead(y);
    }

    if (index % 2 === 0) {
      doc.setFillColor(...SLATE_50);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_900);
    doc.text(item.servico_nome, colStarts[0] + 3, y + 4.5);

    let detailY = y + 8;
    if (isPacote && inclusos.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...SLATE_500);
      doc.text("Inclui:", colStarts[0] + 3, detailY);
      detailY += 3.5;

      doc.setFont("helvetica", "normal");
      inclusos.forEach((line) => {
        const wrapped = doc.splitTextToSize(`• ${line}`, colWidths[0] - 4);
        doc.text(wrapped, colStarts[0] + 3, detailY);
        detailY += wrapped.length * 3.2;
      });
    } else {
      const descricao = servico?.descricao?.trim();
      if (descricao) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...SLATE_500);
        const lines = doc.splitTextToSize(descricao, colWidths[0] - 4);
        doc.text(lines, colStarts[0] + 3, detailY);
      }
    }

    const valueY = y + 5;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_900);
    doc.text(String(item.quantidade), colStarts[1] + colWidths[1] - 2, valueY, {
      align: "right",
    });
    doc.text(
      formatCurrency(Number(item.valor_unitario)),
      colStarts[2] + colWidths[2] - 2,
      valueY,
      { align: "right" }
    );
    doc.setFont("helvetica", "bold");
    doc.text(
      formatCurrency(Number(item.valor_total)),
      colStarts[3] + colWidths[3] - 2,
      valueY,
      { align: "right" }
    );

    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH);
    y += rowH;
  });

  doc.setDrawColor(...SLATE_200);
  doc.roundedRect(MARGIN, y - 0.5, CONTENT_W, 0.5, 0, 0, "S");

  return y + 5;
}

/* ── Resumo financeiro + checklist (lado a lado) ─────────────────── */
function drawFinancialAndInclusosRow(
  doc: JsPDF,
  y: number,
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[],
  inclusos: string[]
): number {
  const pagamento = parseFormaPagamentoLines(orcamento.forma_pagamento);
  const descontoValor = calcDescontoValor(orcamento);
  const descontoPct = Number(orcamento.desconto_percentual);
  const hasPacote = orcamentoHasPacoteCompleto(orcamento, catalogo);

  const boxW = 88;
  const boxH = 52;
  const gap = 5;
  const checklistW = CONTENT_W - boxW - gap;

  let checklistBlockH = 0;
  if (hasPacote) {
    checklistBlockH = measurePacoteCompletoInclusosBlockHeight(doc, checklistW);
  } else if (inclusos.length > 0) {
    doc.setFontSize(7);
    const itemsPerCol = Math.ceil(inclusos.length / 2);
    const colW = (checklistW - 8) / 2;
    const measureCol = (items: string[]) =>
      items.reduce((sum, item) => {
        const lines = doc.splitTextToSize(item, colW - 6);
        return sum + lines.length * 3.6 + 2;
      }, 8);
    checklistBlockH =
      Math.max(
        measureCol(inclusos.slice(0, itemsPerCol)),
        measureCol(inclusos.slice(itemsPerCol))
      ) + 10;
  }

  const rowH = Math.max(boxH + 8, checklistBlockH + 8);
  y = ensureSpace(doc, y, rowH);

  const boxX = MARGIN + CONTENT_W - boxW;

  if (hasPacote || inclusos.length > 0) {
    const contentY = hasPacote
      ? y + 7
      : drawSectionTitle(doc, y, "O que está incluso");
    drawSectionTitle(doc, y, "Resumo financeiro", { x: boxX, width: 28 });

    if (hasPacote) {
      drawPacoteCompletoInclusosBlock(
        doc,
        MARGIN,
        contentY,
        checklistW,
        checklistBlockH
      );
    } else {
      drawCard(doc, MARGIN, contentY, checklistW, checklistBlockH, {
        fill: WHITE,
        stroke: SLATE_200,
      });

      const colW = (checklistW - 8) / 2;
      const itemsPerCol = Math.ceil(inclusos.length / 2);
      const leftItems = inclusos.slice(0, itemsPerCol);
      const rightItems = inclusos.slice(itemsPerCol);

      const drawColumn = (items: string[], x: number, startItemY: number) => {
        let itemY = startItemY;
        items.forEach((item) => {
          doc.setTextColor(...CHECK_GREEN);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.text("✓", x, itemY);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...SLATE_700);
          const lines = doc.splitTextToSize(item, colW - 6);
          doc.text(lines, x + 4, itemY);
          itemY += lines.length * 3.6 + 2;
        });
      };

      drawColumn(leftItems, MARGIN + 4, contentY + 5);
      drawColumn(rightItems, MARGIN + colW + 4, contentY + 5);
    }

    drawCard(doc, boxX, contentY, boxW, boxH, {
      fill: GOLD_BG,
      stroke: GOLD,
      radius: 3,
    });

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1);
    doc.line(boxX, contentY, boxX, contentY + boxH);

    let lineY = contentY + 8;
    const labelX = boxX + 5;
    const valueX = boxX + boxW - 5;

    const drawLine = (
      label: string,
      value: string,
      options?: { bold?: boolean; size?: number; color?: RGB }
    ) => {
      doc.setFont("helvetica", options?.bold ? "bold" : "normal");
      doc.setFontSize(options?.size ?? 7.5);
      doc.setTextColor(...(options?.color ?? SLATE_700));
      doc.text(label, labelX, lineY);
      doc.text(value, valueX, lineY, { align: "right" });
      lineY += options?.size && options.size > 8 ? 8 : 5.5;
    };

    drawLine("Subtotal", formatCurrency(Number(orcamento.subtotal)));

    if (descontoPct > 0 || descontoValor > 0) {
      drawLine(
        "Desconto",
        `${descontoPct.toFixed(2).replace(".", ",")}% (${formatCurrency(descontoValor)})`
      );
    }

    lineY += 1;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.line(labelX, lineY, valueX, lineY);
    lineY += 6;

    drawLine("Valor Total", formatCurrency(Number(orcamento.valor_total)), {
      bold: true,
      size: 11,
      color: NAVY,
    });

    lineY += 1;
    drawLine("Condição de pagamento", pagamento.condicao, { size: 7 });
    if (pagamento.parcelamento && pagamento.parcelamento !== pagamento.condicao) {
      drawLine("Parcelamento", pagamento.parcelamento, { size: 7 });
    }
    if (pagamento.aVista) {
      drawLine("Valor à vista", pagamento.aVista, { size: 7 });
    }

    return Math.max(contentY + checklistBlockH, contentY + boxH) + 6;
  }

  y = drawSectionTitle(doc, y, "Resumo financeiro");
  drawCard(doc, boxX, y, boxW, boxH, {
    fill: GOLD_BG,
    stroke: GOLD,
    radius: 3,
  });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(boxX, y, boxX, y + boxH);

  let lineY = y + 8;
  const labelX = boxX + 5;
  const valueX = boxX + boxW - 5;

  const drawLine = (
    label: string,
    value: string,
    options?: { bold?: boolean; size?: number; color?: RGB }
  ) => {
    doc.setFont("helvetica", options?.bold ? "bold" : "normal");
    doc.setFontSize(options?.size ?? 7.5);
    doc.setTextColor(...(options?.color ?? SLATE_700));
    doc.text(label, labelX, lineY);
    doc.text(value, valueX, lineY, { align: "right" });
    lineY += options?.size && options.size > 8 ? 8 : 5.5;
  };

  drawLine("Subtotal", formatCurrency(Number(orcamento.subtotal)));

  if (descontoPct > 0 || descontoValor > 0) {
    drawLine(
      "Desconto",
      `${descontoPct.toFixed(2).replace(".", ",")}% (${formatCurrency(descontoValor)})`
    );
  }

  lineY += 1;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(labelX, lineY, valueX, lineY);
  lineY += 6;

  drawLine("Valor Total", formatCurrency(Number(orcamento.valor_total)), {
    bold: true,
    size: 11,
    color: NAVY,
  });

  lineY += 1;
  drawLine("Condição de pagamento", pagamento.condicao, { size: 7 });
  if (pagamento.parcelamento && pagamento.parcelamento !== pagamento.condicao) {
    drawLine("Parcelamento", pagamento.parcelamento, { size: 7 });
  }
  if (pagamento.aVista) {
    drawLine("Valor à vista", pagamento.aVista, { size: 7 });
  }

  return y + boxH + 6;
}

/* ── Observações ───────────────────────────────────────────────── */
function drawObservacoesCard(doc: JsPDF, y: number, texto: string): number {
  const trimmed = texto.trim();
  if (!trimmed) return y;

  doc.setFontSize(7.5);
  const lines = doc.splitTextToSize(trimmed, CONTENT_W - 12);
  const blockH = lines.length * 3.8 + 10;

  y = ensureSpace(doc, y, blockH + 6);
  y = drawSectionTitle(doc, y, "Observações");

  drawCard(doc, MARGIN, y, CONTENT_W, blockH, {
    fill: SLATE_50,
    stroke: SLATE_200,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_700);
  doc.text(lines, MARGIN + 6, y + 6);

  return y + blockH + 6;
}

/* ── Rodapé ────────────────────────────────────────────────────── */
function drawFooter(doc: JsPDF, pageNumber: number, totalPages: number) {
  const y = FOOTER_Y;

  doc.setFillColor(...NAVY);
  doc.rect(0, y - 1, PAGE_W, FOOTER_H + 4, "F");

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(NAVARRO.razaoSocial, PAGE_W / 2, y + 4, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...WHITE);
  doc.text(
    `${NAVARRO.site}  ·  ${NAVARRO.email}  ·  WhatsApp ${NAVARRO.whatsapp}  ·  ${NAVARRO.telefone}`,
    PAGE_W / 2,
    y + 8,
    { align: "center" }
  );

  doc.setFontSize(6);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    MARGIN + CONTENT_W,
    y + 8,
    { align: "right" }
  );
}

function buildFilename(orcamento: OrcamentoComItens): string {
  const cliente = orcamento.cliente_nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `Proposta-${orcamento.numero}-${cliente || "Cliente"}.pdf`;
}

/* ── Export ──────────────────────────────────────────────────────── */
export async function gerarPdfOrcamento(
  orcamento: OrcamentoComItens
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const [logo, catalogo, clienteInfo] = await Promise.all([
    loadLogoAsset(),
    listarServicosSst(),
    resolveClientePdfInfo(orcamento),
  ]);

  const inclusos = collectAllInclusos(orcamento, catalogo);

  let y = drawHeader(doc, logo, orcamento);
  y = drawClientCard(doc, y, orcamento, clienteInfo);
  y = drawDescricaoProposta(doc, y, PROPOSTA_DESCRICAO_PARAGRAFOS);
  y = drawServicesTable(doc, y, orcamento, catalogo);
  y = drawFinancialAndInclusosRow(doc, y, orcamento, catalogo, inclusos);
  y = drawObservacoesCard(doc, y, orcamento.observacoes ?? "");

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, totalPages);
  }

  doc.save(buildFilename(orcamento));
}
