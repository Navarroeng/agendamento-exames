import { formatCurrency } from "@/lib/money";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { listarClientesParaSelect } from "@/services/cliente.service";
import {
  buildResumoPorTipoExame,
  countColaboradoresItens,
  formatPeriodoFromIso,
  itemToPdfDisplayRow,
} from "@/lib/fatura-mappers";
import {
  drawResumoPorTipoExamePdf,
  estimateResumoPorTipoHeight,
} from "@/lib/pdf-resumo-por-tipo";
import type { FaturaLinhaCliente, FaturaLinhaClinica } from "@/lib/fatura-filters";
import { NAVARRO_DADOS_BANCARIOS } from "@/lib/navarro-pagamento";
import {
  gerarPdfCustosClinicasFromFatura,
  gerarPdfCustosClinicasPreview,
} from "@/lib/custos-clinicas-pdf";
import type { FaturaComItens, FaturaItemInsert } from "@/lib/types";

/* ── Paleta premium ──────────────────────────────────────────────── */
const NAVY: [number, number, number] = [8, 43, 99];
const GOLD: [number, number, number] = [201, 151, 43];
const GOLD_STRONG: [number, number, number] = [168, 118, 18];
const GOLD_LIGHT: [number, number, number] = [232, 210, 158];
const GOLD_TOTAL_BG: [number, number, number] = [252, 246, 232];
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY_LINE: [number, number, number] = [217, 221, 229];
const BORDER_TOP: [number, number, number] = [227, 230, 236];
const ROW_BORDER: [number, number, number] = [231, 234, 240];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const PAY_BORDER: [number, number, number] = [199, 215, 245];
const PAY_HEADER: [number, number, number] = [21, 32, 77];
const PAY_BODY: [number, number, number] = [246, 249, 255];
const PAY_PIX_BG: [number, number, number] = [26, 37, 85];
const PAY_GOLD_LABEL: [number, number, number] = [245, 215, 122];
const PAY_TEXT_DARK: [number, number, number] = [15, 23, 42];
const PAY_FAV_MUTED: [number, number, number] = [148, 163, 184];

const MARGIN = 10;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

const HEADER_H = 48;
const HEADER_UPPER_H = 29;
const HEADER_LOWER_H = 18.5;
const SUMMARY_BAR_H = 14;
const FOOTER_H = 13;
const FOOTER_BOTTOM_MARGIN = 8;
const BOTTOM_SECTION_H = 44;
const SECTION_GAP = 5;
const ROWS_PER_PAGE = 25;
const TABLE_HEAD_H = 11;
const CONTINUATION_TABLE_START_Y = MARGIN + 5;

const LOGO_MAX_MM = 24;

type JsPDF = import("jspdf").jsPDF;
type RGB = [number, number, number];

interface ClienteInfo {
  empresa: string;
  cnpj: string;
  endereco: string;
}

interface PdfSummaryStats {
  colaboradores: number;
  exames: number;
  valorTotal: string;
  vencimento: string;
}

interface PdfLayoutOptions {
  titulo: string;
  numeroFatura: string;
  emissao: string;
  mesReferencia: string;
  destinatarioTitulo: string;
  clienteInfo: ClienteInfo;
  periodo: string;
  vencimento: string;
  summaryStats: PdfSummaryStats;
  tableHead: string[];
  tableBody: string[][];
  tableColumnStyles: Record<number, object>;
  totalValue: string;
  resumoItens?: Pick<FaturaItemInsert, "exame_nome" | "valor_unitario">[];
  resumoTotalColumnLabel?: string;
}

interface LogoAsset {
  dataUrl: string;
  width: number;
  height: number;
}

const NAVARRO = {
  site: "www.navarroeng.com.br",
  email: "contato@navarroeng.com.br",
  telefone: "(11) 3181-7697",
  whatsapp: "(11) 97706-5599",
  agradecimento:
    "Agradecemos a confiança em nossos serviços! Estamos à disposição para quaisquer esclarecimentos.",
} as const;

const OBSERVACOES = [
  "Valores referente à realização de exames ocupacionais realizados no mês de referência acima.",
  "Pagamento conforme condições comerciais acordadas.",
] as const;

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

    const ratio = dims.w / dims.h;
    let width = LOGO_MAX_MM;
    let height = width / ratio;
    if (height > LOGO_MAX_MM) {
      height = LOGO_MAX_MM;
      width = height * ratio;
    }

    return { dataUrl, width, height };
  } catch {
    return null;
  }
}

function formatEmissaoBR(date = new Date()): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function calcVencimentoBR(date = new Date()): { label: string; dias: number } {
  const venc = new Date(date);
  venc.setDate(venc.getDate() + 30);
  const dias = Math.ceil(
    (venc.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  return {
    label: venc.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    dias,
  };
}

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

function mesAnoLabelFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const base = iso.split("T")[0];
  const match = base.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = match[1];
  const monthIndex = parseInt(match[2], 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${MESES_PT[monthIndex]}${year}`;
}

function mesAnoLabelFromPeriodoText(periodo: string): string | null {
  const match = periodo.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const month = parseInt(match[2], 10);
  const year = match[3];
  if (month < 1 || month > 12) return null;
  return `${MESES_PT[month - 1]}${year}`;
}

function mesReferenciaDisplay(
  mesReferencia: string,
  periodo: string
): string {
  if (mesReferencia.trim()) return mesReferencia;
  const fromPeriodo = mesAnoLabelFromPeriodoText(periodo);
  if (fromPeriodo) {
    const monthName = fromPeriodo.replace(/\d{4}$/, "");
    const year = fromPeriodo.slice(-4);
    return `${monthName}/${year}`;
  }
  return periodo || "—";
}

function sanitizeEmpresaFilename(nome: string): string {
  const normalized = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]+/g, " ");

  const parts = normalized.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Empresa";

  return parts
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function buildFaturaPdfFilename(
  referenciaNome: string,
  periodoInicioIso?: string | null,
  periodoTexto?: string
): string {
  const mesAno =
    mesAnoLabelFromIso(periodoInicioIso) ??
    mesAnoLabelFromPeriodoText(periodoTexto ?? "") ??
    "Periodo";

  const empresa = sanitizeEmpresaFilename(referenciaNome);
  return `Fatura-${mesAno}-${empresa}.pdf`;
}

function generateInvoiceNumber(prefix: string, destinatario: string): string {
  const year = new Date().getFullYear();
  const hash =
    destinatario.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    100000;
  return `${prefix}-${year}-${String(hash).padStart(5, "0")}`;
}

async function resolveClienteInfo(nome: string): Promise<ClienteInfo> {
  const fallback: ClienteInfo = { empresa: nome, cnpj: "—", endereco: "—" };
  try {
    const clientes = await listarClientesParaSelect();
    const n = nome.trim().toLowerCase();
    const found = clientes.find(
      (c) =>
        c.nome.trim().toLowerCase() === n ||
        c.nome.toLowerCase().includes(n)
    );
    if (!found) return fallback;
    return {
      empresa: found.nome || nome,
      cnpj: found.cnpj || "—",
      endereco: "—",
    };
  } catch {
    return fallback;
  }
}

function mesReferenciaFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const base = iso.split("T")[0];
  const match = base.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return `${match[2]}/${match[1]}`;
}

/* ── Primitivos gráficos ─────────────────────────────────────────── */
function fillNavyUpperBlock(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  leftRatio: number,
  diagCut: number
) {
  const leftW = w * leftRatio;
  const topRightX = x + leftW;
  const bottomRightX = x + leftW - diagCut;

  doc.setFillColor(...NAVY);
  doc.triangle(x, y, topRightX, y, bottomRightX, y + h, "F");
  doc.triangle(x, y, bottomRightX, y + h, x, y + h, "F");
}

function drawGoldDiagonalStripe(
  doc: JsPDF,
  topX: number,
  bottomX: number,
  y: number,
  h: number,
  stripeW: number
) {
  const dx = topX - bottomX;
  const len = Math.sqrt(dx * dx + h * h);
  const nx = (-h / len) * stripeW;
  const ny = (dx / len) * stripeW;

  doc.setFillColor(...GOLD);
  doc.triangle(topX, y, bottomX, y + h, bottomX + nx, y + h + ny, "F");
  doc.triangle(topX, y, bottomX + nx, y + h + ny, topX + nx, y + ny, "F");
}

function drawGoldLineH(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h = 0.55
) {
  doc.setFillColor(...GOLD);
  doc.rect(x, y, w, h, "F");
}

function drawSectionTitle(
  doc: JsPDF,
  x: number,
  y: number,
  title: string,
  lineW: number
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), x, y);
  drawGoldLineH(doc, x, y + 2, lineW, 0.4);
}

/* ── Cabeçalho premium ───────────────────────────────────────────── */
function drawPremiumHeader(
  doc: JsPDF,
  y: number,
  options: {
    logo: LogoAsset | null;
    clienteTitulo: string;
    clienteInfo: ClienteInfo;
    numeroFatura: string;
    mesReferencia: string;
    vencimento: string;
  }
): number {
  const x = MARGIN;
  const w = CONTENT_W;
  const upperH = HEADER_UPPER_H;
  const lowerH = HEADER_LOWER_H;
  const leftRatio = 0.62;
  const diagCut = 10;
  const goldStripeW = 3.7;
  const leftW = w * leftRatio;

  doc.setFillColor(...WHITE);
  doc.rect(x, y, w, HEADER_H, "F");

  doc.setDrawColor(...GOLD_LIGHT);
  doc.setLineWidth(0.35);
  doc.rect(x, y, w, HEADER_H, "S");

  fillNavyUpperBlock(doc, x, y, w, upperH, leftRatio, diagCut);
  drawGoldDiagonalStripe(
    doc,
    x + leftW,
    x + leftW - diagCut,
    y,
    upperH,
    goldStripeW
  );

  const padX = 8;
  const padY = 5;
  const logoX = x + padX;
  const logoY = y + padY + (upperH - padY * 2 - (options.logo?.height ?? 18)) / 2;

  if (options.logo) {
    doc.addImage(
      options.logo.dataUrl,
      "PNG",
      logoX,
      logoY,
      options.logo.width,
      options.logo.height,
      undefined,
      "FAST"
    );
  }

  const textX = options.logo
    ? logoX + options.logo.width + 6
    : logoX;

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text("NAVARRO", textX, y + 14);

  drawGoldLineH(doc, textX, y + 16.5, 55, 0.55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text("ENGENHARIA DE SEGURANÇA", textX, y + 21);
  doc.text("E MEDICINA OCUPACIONAL", textX, y + 24.5);

  const rightX = x + leftW + goldStripeW;
  const rightW = w - leftW - goldStripeW;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(options.clienteTitulo.toUpperCase(), rightX + 8, y + 11);

  drawGoldLineH(doc, rightX + 8, y + 13, 42, 0.3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  const empresaLines = doc.splitTextToSize(
    options.clienteInfo.empresa,
    rightW - 16
  );
  doc.text(empresaLines[0], rightX + 8, y + 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(`CNPJ: ${options.clienteInfo.cnpj}`, rightX + 8, y + 25);

  const lowerY = y + upperH;

  doc.setDrawColor(...BORDER_TOP);
  doc.setLineWidth(0.25);
  doc.line(x, lowerY, x + w, lowerY);

  const cols = [
    { label: "FATURA Nº", value: options.numeroFatura },
    { label: "VENCIMENTO", value: options.vencimento },
    { label: "MÊS DE REFERÊNCIA", value: options.mesReferencia },
  ];

  const colW = w / 3;
  cols.forEach((col, i) => {
    const cx = x + colW * i + colW / 2;

    if (i > 0) {
      doc.setDrawColor(...GRAY_LINE);
      doc.setLineWidth(0.25);
      doc.line(x + colW * i, lowerY + 2, x + colW * i, lowerY + lowerH - 2);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text(col.label, cx, lowerY + 6, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(col.value, cx, lowerY + 12.5, { align: "center" });

    const lineW = 42;
    drawGoldLineH(doc, cx - lineW / 2, lowerY + 14.5, lineW, 0.55);
  });

  return y + HEADER_H;
}

function drawSummaryCards(doc: JsPDF, y: number, stats: PdfSummaryStats): number {
  const h = SUMMARY_BAR_H;
  const gap = 2;
  const cardW = (CONTENT_W - gap * 3) / 4;
  const radius = 1.4;

  const cards: { label: string; value: string }[] = [
    { label: "COLABORADORES", value: String(stats.colaboradores) },
    { label: "EXAMES", value: String(stats.exames) },
    { label: "VALOR TOTAL", value: stats.valorTotal },
    { label: "VENCIMENTO", value: stats.vencimento },
  ];

  cards.forEach((card, i) => {
    const cx = MARGIN + i * (cardW + gap);

    doc.setFillColor(...WHITE);
    doc.setDrawColor(232, 237, 245);
    doc.setLineWidth(0.25);
    doc.roundedRect(cx, y, cardW, h, radius, radius, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...PAY_FAV_MUTED);
    doc.text(card.label, cx + 3, y + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(card.label === "VALOR TOTAL" ? 8 : 9);
    doc.setTextColor(...NAVY);
    const valueLines = doc.splitTextToSize(card.value, cardW - 6);
    doc.text(valueLines[0], cx + 3, y + 10.5);
  });

  return y + h;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function getStandardTableMetrics() {
  const firstPageTableStartY =
    MARGIN + HEADER_H + SECTION_GAP + SUMMARY_BAR_H + SECTION_GAP;
  const bottomY =
    PAGE_H -
    FOOTER_BOTTOM_MARGIN -
    FOOTER_H -
    SECTION_GAP -
    BOTTOM_SECTION_H;
  const available = bottomY - firstPageTableStartY - SECTION_GAP;
  let minCellHeight = Math.max(
    6,
    (available - TABLE_HEAD_H) / ROWS_PER_PAGE
  );
  minCellHeight *= 0.94;
  const fontSize = Math.max(7, 9.5 * (minCellHeight / 11) * 0.96);
  const cellPad = Math.max(1, 3 * (minCellHeight / 11));

  return {
    firstPageTableStartY,
    bottomY,
    minCellHeight,
    fontSize,
    cellPad,
  };
}

function getPageTableLayout(
  isFirstPage: boolean,
  isLastPage: boolean,
  resumoHeight = 0
) {
  const standard = getStandardTableMetrics();
  const tableStartY = isFirstPage
    ? standard.firstPageTableStartY
    : CONTINUATION_TABLE_START_Y;
  const resumoReserved =
    isLastPage && resumoHeight > 0 ? resumoHeight + SECTION_GAP : 0;
  const tableEndY = isLastPage
    ? standard.bottomY - resumoReserved
    : PAGE_H - MARGIN;

  return {
    ...standard,
    tableStartY,
    tableEndY,
    tableMarginBottom: PAGE_H - tableEndY + 2,
  };
}

function paginateClienteTableRows(
  rows: string[][],
  resumoHeight: number
): string[][][] {
  if (rows.length === 0) return [[]];

  const rowsCap = (first: boolean, last: boolean) => {
    const layout = getPageTableLayout(first, last, last ? resumoHeight : 0);
    const available = layout.tableEndY - layout.tableStartY - TABLE_HEAD_H;
    return Math.max(4, Math.floor(available / layout.minCellHeight));
  };

  const singleCap = rowsCap(true, true);
  if (rows.length <= singleCap) return [rows];

  const firstCap = rowsCap(true, false);
  const contCap = rowsCap(false, false);
  const lastCap = rowsCap(false, true);

  const chunks: string[][][] = [];
  let i = 0;

  chunks.push(rows.slice(i, i + firstCap));
  i += firstCap;

  if (rows.length - i <= lastCap) {
    chunks.push(rows.slice(i));
    return chunks;
  }

  while (rows.length - i > lastCap) {
    chunks.push(rows.slice(i, i + contCap));
    i += contCap;
  }

  if (i < rows.length) {
    chunks.push(rows.slice(i));
  }

  return chunks;
}

function drawBottomSection(
  doc: JsPDF,
  y: number,
  totalValue: string,
  subtotalValue: string
) {
  const gap = 4.8;
  const totalW = CONTENT_W;
  const obsW = totalW * 0.32;
  const resumoW = totalW * 0.28;
  const payW = totalW - obsW - resumoW - gap * 2;
  const h = BOTTOM_SECTION_H;

  const obsX = MARGIN;
  drawSectionTitle(doc, obsX, y + 5, "Observações", obsW * 0.55);

  let oy = y + 11;
  OBSERVACOES.forEach((text) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(text, obsW - 5);
    (lines as string[]).forEach((line: string, i: number) => {
      if (i === 0) {
        doc.setFillColor(...NAVY);
        doc.circle(obsX + 1.2, oy - 0.8, 0.55, "F");
      }
      doc.text(line, obsX + 4, oy + i * 3.6);
    });
    oy += lines.length * 3.6 + 1.2;
  });

  const resumoX = obsX + obsW + gap;
  const cardRadius = 2;

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.35);
  doc.roundedRect(resumoX, y, resumoW, h, cardRadius, cardRadius, "S");

  doc.setFillColor(...NAVY);
  doc.roundedRect(resumoX, y, resumoW, 11, cardRadius, cardRadius, "F");
  doc.setFillColor(...NAVY);
  doc.rect(resumoX, y + 8, resumoW, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text("RESUMO DA COBRANÇA", resumoX + resumoW / 2, y + 7.2, {
    align: "center",
  });

  const labelX = resumoX + 4;
  const valueX = resumoX + resumoW - 4;
  const totalBandH = 8;
  const totalBandY = y + h - totalBandH - 1.5;
  const totalRowY = totalBandY + 5.5;
  const dividerY = totalBandY - 1.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text("Subtotal", labelX, dividerY - 10);
  doc.text(subtotalValue, valueX, dividerY - 10, { align: "right" });

  doc.text("Desconto", labelX, dividerY - 4.5);
  doc.text(formatCurrency(0), valueX, dividerY - 4.5, { align: "right" });

  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.2);
  doc.line(resumoX + 3, dividerY, resumoX + resumoW - 3, dividerY);

  doc.setFillColor(...GOLD_TOTAL_BG);
  doc.roundedRect(
    resumoX + 2.5,
    totalBandY,
    resumoW - 5,
    totalBandH,
    1.2,
    1.2,
    "F"
  );

  doc.setDrawColor(...GOLD_LIGHT);
  doc.setLineWidth(0.25);
  doc.line(resumoX + 3, totalBandY, resumoX + resumoW - 3, totalBandY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...NAVY);
  doc.text("TOTAL A PAGAR", labelX, totalRowY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD_STRONG);
  doc.text(totalValue, valueX, totalRowY, { align: "right" });

  drawPagamentoCard(doc, resumoX + resumoW + gap, y, payW, h);
}

function drawPagamentoCard(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const d = NAVARRO_DADOS_BANCARIOS;
  const radius = 2.2;
  const headerH = 7;
  const padX = 4;
  const labelColW = 17;

  doc.setDrawColor(...PAY_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, radius, radius, "S");

  doc.setFillColor(...PAY_HEADER);
  doc.roundedRect(x, y, w, headerH, radius, radius, "F");
  doc.rect(x, y + headerH - 2, w, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(d.titulo.toUpperCase(), x + padX, y + 4.6);

  const bodyY = y + headerH;
  doc.setFillColor(...PAY_BODY);
  doc.rect(x, bodyY, w, h - headerH, "F");

  const bankRows: [string, string][] = [
    ["Banco", d.banco],
    ["Agência", d.agencia],
    ["Conta", d.conta],
  ];

  let py = bodyY + 3.5;
  bankRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(label.toUpperCase(), x + padX, py);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PAY_TEXT_DARK);
    doc.text(value, x + padX + labelColW, py);
    py += 3.2;
  });

  const pixX = x + padX;
  const pixW = w - padX * 2;
  const pixY = py + 0.8;
  const pixH = 9;
  const pixRadius = 1.4;

  doc.setDrawColor(...GOLD_LIGHT);
  doc.setLineWidth(0.2);
  doc.roundedRect(pixX, pixY, pixW, pixH, pixRadius, pixRadius, "S");

  doc.setFillColor(...PAY_PIX_BG);
  doc.roundedRect(pixX, pixY, pixW, pixH, pixRadius, pixRadius, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(...PAY_GOLD_LABEL);
  doc.text("CNPJ PIX", pixX + 3, pixY + 3.4);

  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text(d.pixCnpj, pixX + 3, pixY + 7.5);

  const favDividerY = pixY + pixH + 2;
  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.2);
  doc.line(x + padX, favDividerY, x + w - padX, favDividerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(...PAY_FAV_MUTED);
  doc.text("FAVORECIDO", x + padX, favDividerY + 2.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  const favLines = doc.splitTextToSize(d.favorecido, w - padX * 2);
  (favLines as string[]).forEach((line: string, i: number) => {
    doc.text(line, x + padX, favDividerY + 5.4 + i * 2.8);
  });
}

function drawPremiumWatermark(
  doc: JsPDF,
  logo: LogoAsset | null,
  yTop: number,
  yBottom: number,
  GStateCtor: new (opts: { opacity: number }) => object
) {
  if (!logo) return;

  const span = yBottom - yTop;
  const w = 80;
  const h = (logo.height / logo.width) * w;
  const x = (PAGE_W - w) / 2;
  const imgY = yTop + (span - h) / 2;

  doc.saveGraphicsState();
  doc.setGState(new GStateCtor({ opacity: 0.09 }));
  doc.addImage(logo.dataUrl, "PNG", x, imgY, w, h, undefined, "FAST");
  doc.restoreGraphicsState();
}

function drawPageNumber(
  doc: JsPDF,
  pageNumber: number,
  totalPages: number
) {
  const label = `Página ${pageNumber} de ${totalPages}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(label, PAGE_W / 2, PAGE_H - FOOTER_BOTTOM_MARGIN / 2 + 1, {
    align: "center",
  });
}

function drawPremiumFooter(
  doc: JsPDF,
  pageNumber: number,
  totalPages: number
) {
  const y = PAGE_H - FOOTER_BOTTOM_MARGIN - FOOTER_H;
  const h = FOOTER_H;
  const pageLabel = `Página ${pageNumber} de ${totalPages}`;

  doc.setFillColor(...NAVY);
  doc.rect(0, y, PAGE_W, h, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(200, 210, 225);
  doc.text(pageLabel, PAGE_W - MARGIN, y + 3.8, { align: "right" });

  const items = [
    NAVARRO.telefone,
    `WhatsApp ${NAVARRO.whatsapp}`,
    NAVARRO.email,
    NAVARRO.site,
  ];

  doc.setFontSize(8);
  doc.setTextColor(...WHITE);

  const widths = items.map((item) => doc.getTextWidth(item));
  const sepW = 6;
  const totalW =
    widths.reduce((sum, w) => sum + w, 0) + sepW * (items.length - 1);
  let cx = (PAGE_W - totalW) / 2;

  items.forEach((item, i) => {
    doc.text(item, cx, y + 4.5);
    cx += widths[i];

    if (i < items.length - 1) {
      const sepX = cx + sepW / 2;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.35);
      doc.line(sepX, y + 2.2, sepX, y + 6.8);
      cx += sepW;
    }
  });

  doc.setFontSize(7);
  doc.setTextColor(220, 230, 245);
  doc.text(NAVARRO.agradecimento, PAGE_W / 2, y + 9.5, {
    align: "center",
    maxWidth: CONTENT_W,
  });
}

async function renderReferencePdf(
  options: PdfLayoutOptions,
  filename: string
): Promise<void> {
  const { jsPDF, GState } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await loadLogoAsset();

  const resumoRows = options.resumoItens?.length
    ? buildResumoPorTipoExame(options.resumoItens)
    : [];
  const resumoHeight =
    resumoRows.length > 0
      ? estimateResumoPorTipoHeight(resumoRows.length)
      : 0;

  const chunks =
    resumoHeight > 0
      ? paginateClienteTableRows(options.tableBody, resumoHeight)
      : chunkArray(options.tableBody, ROWS_PER_PAGE);
  const totalPages = chunks.length;

  const headerOptions = {
    logo,
    clienteTitulo: options.destinatarioTitulo,
    clienteInfo: options.clienteInfo,
    numeroFatura: options.numeroFatura,
    mesReferencia: options.mesReferencia,
    vencimento: options.vencimento,
  };

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) doc.addPage();

    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === totalPages - 1;
    const layout = getPageTableLayout(
      isFirstPage,
      isLastPage,
      isLastPage ? resumoHeight : 0
    );
    const pageRows = chunks[pageIndex];

    doc.setFillColor(...WHITE);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");

    drawPremiumWatermark(
      doc,
      logo,
      layout.tableStartY,
      layout.tableEndY,
      GState
    );

    let tableStartY = layout.tableStartY + 2;

    if (isFirstPage) {
      let y = MARGIN;
      y = drawPremiumHeader(doc, y, headerOptions);
      y += SECTION_GAP;
      y = drawSummaryCards(doc, y, options.summaryStats);
      y += SECTION_GAP;
      tableStartY = y;
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [options.tableHead],
      body: pageRows,
      margin: {
        left: MARGIN,
        right: MARGIN,
        top: layout.tableStartY,
        bottom: layout.tableMarginBottom,
      },
      tableWidth: CONTENT_W,
      rowPageBreak: "avoid",
      showHead: pageIndex === 0 ? "firstPage" : "everyPage",
      styles: {
        font: "helvetica",
        fontSize: layout.fontSize,
        cellPadding: {
          top: layout.cellPad * 0.35,
          right: 3,
          bottom: layout.cellPad * 0.35,
          left: 3,
        },
        textColor: NAVY,
        lineColor: ROW_BORDER,
        lineWidth: 0.15,
        overflow: "linebreak" as const,
        valign: "middle" as const,
        minCellHeight: layout.minCellHeight,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontStyle: "bold" as const,
        fontSize: layout.fontSize,
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        minCellHeight: TABLE_HEAD_H,
      },
      bodyStyles: {
        fillColor: WHITE,
        textColor: NAVY,
        fontSize: layout.fontSize,
      },
      alternateRowStyles: { fillColor: WHITE },
      columnStyles: options.tableColumnStyles,
    });

    if (isLastPage) {
      if (resumoRows.length > 0 && options.resumoItens) {
        const tableEnd =
          (doc as JsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
            ?.finalY ?? layout.tableStartY;
        drawResumoPorTipoExamePdf(
          doc,
          tableEnd + SECTION_GAP,
          resumoRows,
          options.resumoItens.length,
          options.totalValue,
          options.resumoTotalColumnLabel ?? "TOTAL FATURADO (R$)",
          { margin: MARGIN, contentW: CONTENT_W },
          autoTable
        );
      }

      drawBottomSection(
        doc,
        layout.bottomY,
        options.totalValue,
        options.totalValue
      );
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (i === pageCount) {
      drawPremiumFooter(doc, i, pageCount);
    } else {
      drawPageNumber(doc, i, pageCount);
    }
  }

  doc.save(filename);
}

const PDF_TABLE_HEAD = [
  "DATA DO EXAME",
  "NOME DO COLABORADOR",
  "TIPO DE ASO",
  "NOME DO EXAME",
  "VALOR UNITÁRIO",
];

const PDF_COLUMN_STYLES: Record<number, object> = {
  0: { cellWidth: 26, halign: "center" as const },
  1: { cellWidth: 52 },
  2: { cellWidth: 28, halign: "center" as const },
  3: { cellWidth: 52 },
  4: {
    cellWidth: 32,
    halign: "right" as const,
    fontStyle: "bold" as const,
  },
};

export async function gerarPdfFromFatura(fatura: FaturaComItens): Promise<void> {
  if (fatura.tipo === "clinica") {
    await gerarPdfCustosClinicasFromFatura(fatura);
    return;
  }

  const itens = fatura.fatura_itens ?? [];
  const periodo = formatPeriodoFromIso(
    fatura.periodo_inicio,
    fatura.periodo_fim
  );
  const vencLabel = formatDateIsoToBR(fatura.data_vencimento);
  const emissao = fatura.data_emissao
    ? formatDateIsoToBR(fatura.data_emissao.split("T")[0])
    : formatEmissaoBR();
  const mesRef =
    mesReferenciaFromIso(fatura.periodo_inicio) ??
    mesReferenciaDisplay("", periodo);

  const clienteInfo =
    fatura.tipo === "cliente"
      ? await resolveClienteInfo(fatura.referencia_nome)
      : {
          empresa: fatura.referencia_nome,
          cnpj: "—",
          endereco: "—",
        };

  const tableBody = itens.map((item) =>
    itemToPdfDisplayRow(
      {
        agendamento_id: item.agendamento_id,
        data_agendamento: item.data_agendamento,
        colaborador: item.colaborador,
        cliente_nome: item.cliente_nome,
        clinica_nome: item.clinica_nome,
        tipo_aso: item.tipo_aso,
        exame_nome: item.exame_nome,
        valor_unitario: Number(item.valor_unitario),
        quantidade: item.quantidade,
        valor_total: Number(item.valor_total),
      },
      fatura.tipo
    )
  );

  const isCliente = fatura.tipo === "cliente";

  await renderReferencePdf(
    {
      titulo: isCliente
        ? "FATURA DE EXAMES OCUPACIONAIS"
        : "RELATÓRIO DE PAGAMENTO DA CLÍNICA",
      numeroFatura: fatura.numero,
      emissao,
      mesReferencia: mesRef,
      destinatarioTitulo: isCliente ? "Dados do cliente" : "Dados da clínica",
      clienteInfo,
      periodo,
      vencimento: vencLabel,
      summaryStats: {
        colaboradores: countColaboradoresItens(itens),
        exames: itens.length,
        valorTotal: formatCurrency(Number(fatura.valor_total)),
        vencimento: vencLabel,
      },
      tableHead: PDF_TABLE_HEAD,
      tableBody,
      tableColumnStyles: PDF_COLUMN_STYLES,
      totalValue: formatCurrency(Number(fatura.valor_total)),
      resumoItens: itens.map((item) => ({
        exame_nome: item.exame_nome,
        valor_unitario: Number(item.valor_unitario),
      })),
      resumoTotalColumnLabel: "TOTAL FATURADO (R$)",
    },
    buildFaturaPdfFilename(
      fatura.referencia_nome,
      fatura.periodo_inicio ?? fatura.periodo_fim
    )
  );
}

export async function gerarPdfFaturaCliente(options: {
  destinatario: string;
  periodo: string;
  linhas: FaturaLinhaCliente[];
  dataVencimento?: string;
  numeroFatura?: string;
  mesReferencia?: string;
}): Promise<void> {
  const total = options.linhas.reduce((sum, l) => sum + l.valorCliente, 0);
  const emissao = formatEmissaoBR();
  const vencIso = options.dataVencimento;
  const vencLabel = vencIso
    ? formatDateIsoToBR(vencIso)
    : calcVencimentoBR().label;
  const clienteInfo = await resolveClienteInfo(options.destinatario);
  const mesRef = mesReferenciaDisplay(
    options.mesReferencia ?? "",
    options.periodo
  );

  await renderReferencePdf(
    {
      titulo: "FATURA DE EXAMES OCUPACIONAIS",
      numeroFatura:
        options.numeroFatura ??
        generateInvoiceNumber("FAT-CLI", options.destinatario),
      emissao,
      mesReferencia: mesRef,
      destinatarioTitulo: "Dados do cliente",
      clienteInfo,
      periodo: options.periodo,
      vencimento: vencLabel,
      summaryStats: {
        colaboradores: new Set(
          options.linhas.map((l) => l.colaborador.trim()).filter(Boolean)
        ).size,
        exames: options.linhas.length,
        valorTotal: formatCurrency(total),
        vencimento: vencLabel,
      },
      tableHead: PDF_TABLE_HEAD,
      tableBody: options.linhas.map((l) => [
        l.data,
        l.colaborador,
        l.aso,
        l.exame,
        formatCurrency(l.valorCliente),
      ]),
      tableColumnStyles: PDF_COLUMN_STYLES,
      totalValue: formatCurrency(total),
      resumoItens: options.linhas.map((l) => ({
        exame_nome: l.exame,
        valor_unitario: l.valorCliente,
      })),
      resumoTotalColumnLabel: "TOTAL FATURADO (R$)",
    },
    buildFaturaPdfFilename(options.destinatario, null, options.periodo)
  );
}

export async function gerarPdfFaturaClinica(options: {
  clinica: string;
  periodo: string;
  linhas: FaturaLinhaClinica[];
  dataVencimento?: string;
  numeroFatura?: string;
  mesReferencia?: string;
}): Promise<void> {
  await gerarPdfCustosClinicasPreview({
    clinica: options.clinica,
    linhas: options.linhas,
    mesReferencia: options.mesReferencia,
    periodoInicioIso: null,
  });
}
