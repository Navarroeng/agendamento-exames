import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { buildResumoPorTipoExame } from "@/lib/fatura-mappers";
import {
  drawResumoPorTipoExamePdf,
  estimateResumoPorTipoHeight,
} from "@/lib/pdf-resumo-por-tipo";
import { formatCurrency } from "@/lib/money";
import { listarClinicas } from "@/services/clinica.service";
import type { FaturaComItens, FaturaItemInsert } from "@/lib/types";
import type { FaturaLinhaClinica } from "@/lib/fatura-filters";

/* ── Paleta (relatório Custos Clínicas) ─────────────────────────── */
const NAVY: [number, number, number] = [8, 43, 99];
const GOLD: [number, number, number] = [201, 151, 43];
const GOLD_LIGHT: [number, number, number] = [232, 210, 158];
const WHITE: [number, number, number] = [255, 255, 255];
const GRAY_LINE: [number, number, number] = [217, 221, 229];
const ROW_BORDER: [number, number, number] = [231, 234, 240];
const ROW_ZEBRA: [number, number, number] = [248, 250, 252];
const TEXT_MUTED: [number, number, number] = [100, 116, 139];
const BRAND_BLUE: [number, number, number] = [79, 99, 255];

const MARGIN = 10;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

const HEADER_UPPER_H = 29;
const HEADER_H = HEADER_UPPER_H + 2;
const REPORT_ID_H = 17;
const SUMMARY_H = 14;
const SECTION_TITLE_H = 9;
const FOOTER_H = 13;
const FOOTER_BOTTOM_MARGIN = 8;
const SECTION_GAP = 4;
const TABLE_HEAD_H = 9;
const CONTINUATION_TABLE_START_Y = MARGIN + 4;
const LOGO_MAX_MM = 24;

const NAVARRO = {
  site: "www.navarroeng.com.br",
  email: "contato@navarroeng.com.br",
  telefone: "(11) 3181-7697",
  whatsapp: "(11) 97706-5599",
  agradecimento:
    "Agradecemos a confiança em nossos serviços! Estamos à disposição para quaisquer esclarecimentos.",
} as const;

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

const CLINICA_TABLE_HEAD = [
  "DATA",
  "EMPRESA",
  "COLABORADOR",
  "EXAME",
  "VALOR (R$)",
];

const CLINICA_COLUMN_STYLES: Record<number, object> = {
  0: { cellWidth: 24, halign: "center" as const },
  1: { cellWidth: 46 },
  2: { cellWidth: 46 },
  3: { cellWidth: 44 },
  4: {
    cellWidth: 30,
    halign: "right" as const,
    fontStyle: "bold" as const,
  },
};

type JsPDF = import("jspdf").jsPDF;

interface LogoAsset {
  dataUrl: string;
  width: number;
  height: number;
}

interface ClinicaInfo {
  nome: string;
  cnpj: string;
}

export interface CustosClinicasPdfInput {
  clinicaNome: string;
  mesReferencia: string;
  emissaoIso?: string | null;
  itens: FaturaItemInsert[];
  filename: string;
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

function mesAnoLabelFromIso(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const base = iso.split("T")[0];
  const match = base.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const monthIndex = parseInt(match[2], 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${MESES_PT[monthIndex]}/${match[1]}`;
}

function formatEmissaoRelatorio(emissaoIso?: string | null): string {
  const date = emissaoIso ? new Date(emissaoIso) : new Date();
  const data = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${data} ${hora}`;
}

function formatDataCell(date: string): string {
  if (date.includes("/")) return date;
  return formatDateIsoToBR(date.split("T")[0]);
}

async function resolveClinicaInfo(nome: string): Promise<ClinicaInfo> {
  const fallback: ClinicaInfo = { nome, cnpj: "—" };
  try {
    const clinicas = await listarClinicas(500);
    const n = nome.trim().toLowerCase();
    const found = clinicas.find(
      (c) =>
        c.razao_social.trim().toLowerCase() === n ||
        c.nome_fantasia.trim().toLowerCase() === n ||
        c.razao_social.toLowerCase().includes(n) ||
        c.nome_fantasia.toLowerCase().includes(n)
    );
    if (!found) return fallback;
    return {
      nome: found.razao_social || found.nome_fantasia || nome,
      cnpj: found.cnpj || "—",
    };
  } catch {
    return fallback;
  }
}

function itensToTableBody(itens: FaturaItemInsert[]): string[][] {
  return itens.map((item) => [
    formatDataCell(item.data_agendamento),
    item.cliente_nome,
    item.colaborador,
    item.exame_nome,
    formatCurrency(Number(item.valor_unitario)),
  ]);
}

function linhasToItens(linhas: FaturaLinhaClinica[]): FaturaItemInsert[] {
  return linhas.map((l, i) => ({
    agendamento_id: `preview-${i}`,
    data_agendamento: l.data,
    colaborador: l.colaborador,
    cliente_nome: l.cliente,
    clinica_nome: "",
    tipo_aso: l.aso,
    exame_nome: l.exame,
    valor_unitario: l.custoClinica,
    quantidade: 1,
    valor_total: l.custoClinica,
  }));
}

function sanitizeFilename(nome: string): string {
  const normalized = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]+/g, " ");
  const parts = normalized.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Clinica";
  return parts
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

export function buildCustosClinicasPdfFilename(
  clinicaNome: string,
  periodoInicioIso?: string | null
): string {
  const mesAno = mesAnoLabelFromIso(periodoInicioIso) ?? "Periodo";
  return `Relatorio-Custos-${mesAno}-${sanitizeFilename(clinicaNome)}.pdf`;
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
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text(title.toUpperCase(), x, y);
  drawGoldLineH(doc, x, y + 2, lineW, 0.35);
}

/* ── Cabeçalho (parte superior igual à fatura cliente) ───────────── */
function drawClinicaHeader(
  doc: JsPDF,
  y: number,
  logo: LogoAsset | null,
  clinicaInfo: ClinicaInfo
): number {
  const x = MARGIN;
  const w = CONTENT_W;
  const upperH = HEADER_UPPER_H;
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
  const logoY =
    y + padY + (upperH - padY * 2 - (logo?.height ?? 18)) / 2;

  if (logo) {
    doc.addImage(
      logo.dataUrl,
      "PNG",
      logoX,
      logoY,
      logo.width,
      logo.height,
      undefined,
      "FAST"
    );
  }

  const textX = logo ? logoX + logo.width + 6 : logoX;

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
  doc.text("DADOS DA CLÍNICA", rightX + 8, y + 11);
  drawGoldLineH(doc, rightX + 8, y + 13, 42, 0.3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  const nomeLines = doc.splitTextToSize(clinicaInfo.nome, rightW - 16);
  doc.text(nomeLines[0], rightX + 8, y + 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  if (clinicaInfo.cnpj && clinicaInfo.cnpj !== "—") {
    doc.text(`CNPJ: ${clinicaInfo.cnpj}`, rightX + 8, y + 25);
  }

  const lowerY = y + upperH;
  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.25);
  doc.line(x, lowerY, x + w, lowerY);

  return y + HEADER_H;
}

function drawOutlineCalendarIcon(doc: JsPDF, x: number, y: number) {
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y - 3, 3.5, 3.5, 0.4, 0.4, "S");
  doc.line(x + 0.8, y - 1.5, x + 2.7, y - 1.5);
}

function drawOutlineClockIcon(doc: JsPDF, x: number, y: number) {
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.25);
  doc.circle(x + 1.75, y - 1.25, 1.75, "S");
  doc.line(x + 1.75, y - 1.25, x + 1.75, y - 2.5);
  doc.line(x + 1.75, y - 1.25, x + 2.6, y - 0.8);
}

function drawReportIdentification(
  doc: JsPDF,
  y: number,
  mesReferencia: string,
  emissao: string
): number {
  const x = MARGIN;
  const w = CONTENT_W;
  const h = REPORT_ID_H;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("RELATÓRIO DE CONFERÊNCIA", x + 6, y + 6.5);
  doc.setFontSize(10);
  doc.text("CUSTOS DA CLÍNICA", x + 6, y + 12);

  const rightX = x + w * 0.52;
  const iconSize = 3.5;

  drawOutlineCalendarIcon(doc, rightX, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("MÊS DE REFERÊNCIA", rightX + iconSize + 2, y + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(mesReferencia, rightX + iconSize + 2, y + 9.5);

  drawOutlineClockIcon(doc, rightX, y + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("DATA DE EMISSÃO DO RELATÓRIO", rightX + iconSize + 2, y + 12.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text(emissao, rightX + iconSize + 2, y + 16);

  return y + h;
}

function drawClinicaSummaryCards(
  doc: JsPDF,
  y: number,
  exames: number,
  colaboradores: number,
  totalCusto: string
): number {
  const h = SUMMARY_H;
  const gap = 3;
  const cardW = (CONTENT_W - gap * 2) / 3;
  const radius = 1.4;

  const cards = [
    { label: "TOTAL DE EXAMES", value: String(exames) },
    { label: "TOTAL DE COLABORADORES", value: String(colaboradores) },
    { label: "TOTAL DE CUSTO DA CLÍNICA", value: totalCusto },
  ];

  cards.forEach((card, i) => {
    const cx = MARGIN + i * (cardW + gap);

    doc.setFillColor(...WHITE);
    doc.setDrawColor(232, 237, 245);
    doc.setLineWidth(0.25);
    doc.roundedRect(cx, y, cardW, h, radius, radius, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(...TEXT_MUTED);
    const labelLines = doc.splitTextToSize(card.label, cardW - 6);
    doc.text(labelLines[0], cx + 3, y + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(i === 2 ? 8.5 : 10);
    doc.setTextColor(...NAVY);
    const valueLines = doc.splitTextToSize(card.value, cardW - 6);
    doc.text(valueLines[0], cx + 3, y + 11);
  });

  return y + h;
}

function drawFooterIcon(
  doc: JsPDF,
  kind: "phone" | "whatsapp" | "email" | "site",
  x: number,
  y: number
) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.2);
  const s = 2.2;

  if (kind === "phone") {
    doc.roundedRect(x, y - s, s * 0.55, s, 0.3, 0.3, "S");
    doc.line(x + s * 0.15, y - s * 0.15, x + s * 0.4, y - s * 0.85);
  } else if (kind === "whatsapp") {
    doc.circle(x + s * 0.45, y - s * 0.5, s * 0.45, "S");
  } else if (kind === "email") {
    doc.rect(x, y - s * 0.75, s, s * 0.55, "S");
    doc.line(x, y - s * 0.75, x + s * 0.5, y - s * 0.35);
    doc.line(x + s, y - s * 0.75, x + s * 0.5, y - s * 0.35);
  } else {
    doc.circle(x + s * 0.45, y - s * 0.5, s * 0.45, "S");
    doc.line(x + s * 0.1, y - s * 0.15, x + s * 0.8, y - s * 0.15);
  }
}

function drawClinicaFooter(
  doc: JsPDF,
  pageNumber: number,
  totalPages: number
) {
  const y = PAGE_H - FOOTER_BOTTOM_MARGIN - FOOTER_H;
  const h = FOOTER_H;

  doc.setFillColor(...NAVY);
  doc.rect(0, y, PAGE_W, h, "F");

  const items: { kind: "phone" | "whatsapp" | "email" | "site"; text: string }[] =
    [
      { kind: "phone", text: NAVARRO.telefone },
      { kind: "whatsapp", text: `WhatsApp ${NAVARRO.whatsapp}` },
      { kind: "email", text: NAVARRO.email },
      { kind: "site", text: NAVARRO.site },
    ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);

  const iconW = 3;
  const gap = 1.5;
  const sepW = 5;
  const widths = items.map(
    (item) => iconW + gap + doc.getTextWidth(item.text)
  );
  const totalW =
    widths.reduce((s, w) => s + w, 0) + sepW * (items.length - 1);
  let cx = (PAGE_W - totalW) / 2;

  items.forEach((item, i) => {
    drawFooterIcon(doc, item.kind, cx, y + 4.8);
    doc.text(item.text, cx + iconW + gap, y + 4.5);
    cx += widths[i];

    if (i < items.length - 1) {
      const sepX = cx + sepW / 2;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.3);
      doc.line(sepX, y + 2.2, sepX, y + 6.8);
      cx += sepW;
    }
  });

  doc.setFontSize(6.5);
  doc.setTextColor(220, 230, 245);
  doc.text(NAVARRO.agradecimento, PAGE_W / 2, y + 9.5, {
    align: "center",
    maxWidth: CONTENT_W,
  });

  doc.setFontSize(7);
  doc.setTextColor(200, 210, 225);
  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    PAGE_W - MARGIN,
    y + 3.5,
    { align: "right" }
  );
}

function getClinicaRowsPerPage(
  isFirstPage: boolean,
  isLastPage: boolean,
  resumoHeight: number
) {
  const footerReserved = FOOTER_H + FOOTER_BOTTOM_MARGIN + SECTION_GAP;
  const resumoReserved = isLastPage ? resumoHeight + SECTION_GAP : 0;

  const tableStartY = isFirstPage
    ? MARGIN +
      HEADER_H +
      SECTION_GAP +
      REPORT_ID_H +
      SECTION_GAP +
      SUMMARY_H +
      SECTION_GAP +
      SECTION_TITLE_H +
      2
    : CONTINUATION_TABLE_START_Y;

  const tableEndY = PAGE_H - footerReserved - resumoReserved - MARGIN;
  const available = tableEndY - tableStartY - TABLE_HEAD_H;
  const minCellHeight = 5.2;
  return Math.max(4, Math.floor(available / minCellHeight));
}

function paginateTableRows(
  rows: string[][],
  resumoHeight: number
): string[][][] {
  if (rows.length === 0) return [[]];

  const singleCap = getClinicaRowsPerPage(true, true, resumoHeight);
  if (rows.length <= singleCap) return [rows];

  const contCap = getClinicaRowsPerPage(false, false, resumoHeight);
  const lastCap = getClinicaRowsPerPage(false, true, resumoHeight);
  const firstCap = getClinicaRowsPerPage(true, false, resumoHeight);

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

async function renderCustosClinicasPdfInternal(
  input: CustosClinicasPdfInput
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await loadLogoAsset();
  const clinicaInfo = await resolveClinicaInfo(input.clinicaNome);
  const tableBody = itensToTableBody(input.itens);
  const resumo = buildResumoPorTipoExame(input.itens);
  const totalExames = input.itens.length;
  const totalColaboradores = new Set(
    input.itens.map((i) => i.colaborador.trim()).filter(Boolean)
  ).size;
  const totalValor = formatCurrency(
    input.itens.reduce((s, i) => s + Number(i.valor_unitario), 0)
  );
  const emissao = formatEmissaoRelatorio(input.emissaoIso);
  const resumoHeight = estimateResumoPorTipoHeight(resumo.length);

  const chunks = paginateTableRows(tableBody, resumoHeight);
  const totalPages = chunks.length;

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) doc.addPage();

    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === totalPages - 1;

    doc.setFillColor(...WHITE);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");

    let tableStartY: number;

    if (isFirstPage) {
      let y = MARGIN;
      y = drawClinicaHeader(doc, y, logo, clinicaInfo);
      y += SECTION_GAP;
      y = drawReportIdentification(doc, y, input.mesReferencia, emissao);
      y += SECTION_GAP;
      y = drawClinicaSummaryCards(
        doc,
        y,
        totalExames,
        totalColaboradores,
        totalValor
      );
      y += SECTION_GAP;
      drawSectionTitle(
        doc,
        MARGIN,
        y + 4,
        "DETALHAMENTO DOS EXAMES",
        68
      );
      tableStartY = y + SECTION_TITLE_H;
    } else {
      tableStartY = CONTINUATION_TABLE_START_Y;
    }

    const footerReserved = FOOTER_H + FOOTER_BOTTOM_MARGIN + SECTION_GAP;
    const resumoReserved = isLastPage ? resumoHeight + SECTION_GAP : 0;
    const tableEndY = PAGE_H - footerReserved - resumoReserved - MARGIN;

    autoTable(doc, {
      startY: tableStartY,
      head: [CLINICA_TABLE_HEAD],
      body: chunks[pageIndex],
      margin: {
        left: MARGIN,
        right: MARGIN,
        top: tableStartY,
        bottom: PAGE_H - tableEndY + 2,
      },
      tableWidth: CONTENT_W,
      rowPageBreak: "avoid",
      showHead: isFirstPage ? "firstPage" : "everyPage",
      styles: {
        font: "helvetica",
        fontSize: 7.8,
        cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
        textColor: NAVY,
        lineColor: ROW_BORDER,
        lineWidth: 0.15,
        overflow: "linebreak" as const,
        valign: "middle" as const,
        minCellHeight: 5.2,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontStyle: "bold" as const,
        fontSize: 7.8,
        cellPadding: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
        minCellHeight: TABLE_HEAD_H,
      },
      bodyStyles: { fillColor: WHITE },
      alternateRowStyles: { fillColor: ROW_ZEBRA },
      columnStyles: CLINICA_COLUMN_STYLES,
    });

    if (isLastPage) {
      const tableEnd = (doc as JsPDF & { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY;
      const resumoY = (tableEnd ?? tableStartY) + SECTION_GAP;
      drawResumoPorTipoExamePdf(
        doc,
        resumoY,
        resumo,
        totalExames,
        totalValor,
        "TOTAL DE CUSTO (R$)",
        { margin: MARGIN, contentW: CONTENT_W },
        autoTable
      );
    }

    drawClinicaFooter(doc, pageIndex + 1, totalPages);
  }

  doc.save(input.filename);
}

export async function renderCustosClinicasPdf(
  input: CustosClinicasPdfInput
): Promise<void> {
  await renderCustosClinicasPdfInternal(input);
}

export async function gerarPdfCustosClinicasFromFatura(
  fatura: FaturaComItens
): Promise<void> {
  const itens = (fatura.fatura_itens ?? []).map((item) => ({
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
  }));

  const mesRef =
    mesAnoLabelFromIso(fatura.periodo_inicio) ??
    fatura.periodo_inicio?.split("T")[0] ??
    "—";

  await renderCustosClinicasPdf({
    clinicaNome: fatura.referencia_nome,
    mesReferencia: mesRef,
    emissaoIso: fatura.data_emissao,
    itens,
    filename: buildCustosClinicasPdfFilename(
      fatura.referencia_nome,
      fatura.periodo_inicio ?? fatura.periodo_fim
    ),
  });
}

export async function gerarPdfCustosClinicasPreview(options: {
  clinica: string;
  linhas: FaturaLinhaClinica[];
  mesReferencia?: string;
  periodoInicioIso?: string | null;
}): Promise<void> {
  const itens = linhasToItens(options.linhas);
  const mesRef =
    options.mesReferencia?.trim() ||
    mesAnoLabelFromIso(options.periodoInicioIso) ||
    "—";

  await renderCustosClinicasPdf({
    clinicaNome: options.clinica,
    mesReferencia: mesRef,
    emissaoIso: null,
    itens,
    filename: buildCustosClinicasPdfFilename(
      options.clinica,
      options.periodoInicioIso
    ),
  });
}
