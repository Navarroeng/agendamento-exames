import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCNPJ } from "@/lib/cnpj";
import {
  resolveItemValorServico,
  resolveQuantidadeColaboradoresOrcamento,
} from "@/lib/orcamento-calculo";
import { calcCondicoesPagamentoProposta } from "@/lib/orcamento-pagamento";
import { formatCurrency } from "@/lib/money";
import type {
  OrcamentoComItens,
  OrcamentoItemRecord,
  ServicoSstRecord,
} from "@/lib/orcamento-types";
import {
  isPacoteCompletoSst,
  PACOTE_COMPLETO_SST_NOME,
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

const PREMIUM_CARD_RADIUS = 3;
const PREMIUM_CARD_HEADER_H = 9;
const PREMIUM_CARD_PADDING = 5;
const CHECKLIST_ITEM_GAP = 4.2;

const MARGIN = 12;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 283;
const FOOTER_H = 12;

/** Opacidade da marca d'água (5–10%). */
export const ORCAMENTO_WATERMARK_OPACITY = 0.08;
/** Largura da marca d'água em relação à área útil (35–45%). */
export const ORCAMENTO_WATERMARK_WIDTH_RATIO = 0.4;
const NAVARRO_SYMBOL_URL = "/apple-touch-icon.png";

const NAVARRO = {
  site: "www.navarroeng.com.br",
  email: "contato@navarroeng.com.br",
  telefone: "(11) 3181-7697",
  whatsapp: "(11) 97706-5599",
  razaoSocial: "Navarro Engenharia de Segurança do Trabalho e Medicina Ocupacional",
  responsavelTecnico: "Equipe Técnica Navarro Engenharia",
} as const;

const PROPOSTA_DESCRICAO_PARAGRAFOS: readonly string[] = [
  "Valor abaixo equivalente a realização e elaboração dos laudos, disponibilização dos arquivos em PDF para a empresa e gestão dos eventos de saúde e segurança do trabalho S-2210; S-2220; S-2240 dentro da plataforma E-social durante toda vigência do contrato (12 meses). Incluindo o Laudo de Riscos Psicossociais conforme a nova NR-01.",
  "(Laudos obrigatórios por lei sujeito a multa do Ministério do trabalho MTE)",
] as const;

const DESCRICAO_CARD_PADDING_X = 5;

const PACOTE_COMPLETO_INCLUSOS_OBSERVACOES: readonly string[] = [
  "Se necessário, a realização de Exames Complementares será cobrada à parte.",
  "ASOs adicionais serão cobrados à parte.",
] as const;

function normalizeServicoNome(nome: string): string {
  return nome
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isPacoteCompletoNome(nome: string | null | undefined): boolean {
  return (
    normalizeServicoNome(nome ?? "") ===
    normalizeServicoNome(PACOTE_COMPLETO_SST_NOME)
  );
}

function buildPacoteCompletoInclusosItens(
  orcamento: OrcamentoComItens
): string[] {
  const itens = [
    "Todos os Laudos e Serviços listados acima.",
    "Gestão completa e envio ao eSocial.",
  ];

  const quantidadeColaboradores = resolveQuantidadeColaboradoresOrcamento(
    orcamento
  );
  if (quantidadeColaboradores > 0) {
    itens.push(`Exames Clínicos: ${quantidadeColaboradores}`);
  }

  itens.push("CAT - Cortesia.");
  return itens;
}

function formatQuantidadeOrcamento(quantidade: number): string {
  if (!Number.isFinite(quantidade)) return "—";
  if (Number.isInteger(quantidade)) return String(quantidade);
  return String(quantidade).replace(".", ",");
}

function resolveNumeroColaboradoresOrcamento(
  orcamento: OrcamentoComItens
): string {
  const quantidade = resolveQuantidadeColaboradoresOrcamento(orcamento);
  return quantidade > 0 ? formatQuantidadeOrcamento(quantidade) : "—";
}

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

function tintSymbolImageDataGold(imageData: ImageData): void {
  const { data } = imageData;
  const [gr, gg, gb] = GOLD;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 16 || (r > 242 && g > 242 && b > 242)) {
      data[i + 3] = 0;
      continue;
    }

    data[i] = gr;
    data[i + 1] = gg;
    data[i + 2] = gb;
  }
}

async function loadNavarroSymbolWatermark(): Promise<LogoAsset | null> {
  if (typeof document === "undefined") return null;

  try {
    const response = await fetch(NAVARRO_SYMBOL_URL);
    if (!response.ok) return null;

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("symbol load failed"));
      image.src = objectUrl;
    });

    const dims = { w: img.naturalWidth, h: img.naturalHeight };
    const canvas = document.createElement("canvas");
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return null;
    }

    ctx.drawImage(img, 0, 0, dims.w, dims.h);
    URL.revokeObjectURL(objectUrl);

    const imageData = ctx.getImageData(0, 0, dims.w, dims.h);
    tintSymbolImageDataGold(imageData);
    ctx.putImageData(imageData, 0, 0);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: dims.w,
      height: dims.h,
    };
  } catch {
    return null;
  }
}

export function calcOrcamentoWatermarkLayout(
  contentWidth: number,
  pageWidth: number,
  yTop: number,
  yBottom: number,
  symbolWidth: number,
  symbolHeight: number
): { x: number; y: number; w: number; h: number } {
  const w = contentWidth * ORCAMENTO_WATERMARK_WIDTH_RATIO;
  const h = (symbolHeight / symbolWidth) * w;
  const x = (pageWidth - w) / 2;
  const span = Math.max(yBottom - yTop, 20);
  const y = yTop + (span - h) / 2;
  return { x, y, w, h };
}

function measureDescricaoSectionHeight(
  doc: JsPDF,
  paragrafos: readonly string[]
): number {
  if (paragrafos.length === 0) return 0;
  return 7 + measureDescricaoPropostaHeight(doc, paragrafos) + 6;
}

function calcOrcamentoWatermarkRegion(
  doc: JsPDF,
  contentStartY: number,
  paragrafos: readonly string[]
): { yTop: number; yBottom: number } {
  const descricaoSectionH = measureDescricaoSectionHeight(doc, paragrafos);
  const yTop = contentStartY + Math.max(0, descricaoSectionH - 10);
  const yBottom = contentStartY + descricaoSectionH + 7 + 34;
  return { yTop, yBottom };
}

function drawNavarroWatermark(
  doc: JsPDF,
  symbol: LogoAsset,
  yTop: number,
  yBottom: number,
  GStateCtor: new (opts: { opacity: number }) => object
): void {
  const { x, y, w, h } = calcOrcamentoWatermarkLayout(
    CONTENT_W,
    PAGE_W,
    yTop,
    yBottom,
    symbol.width,
    symbol.height
  );

  doc.saveGraphicsState();
  doc.setGState(new GStateCtor({ opacity: ORCAMENTO_WATERMARK_OPACITY }));
  doc.addImage(symbol.dataUrl, "PNG", x, y, w, h, undefined, "FAST");
  doc.restoreGraphicsState();
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
    const nome = servico?.nome ?? item.servico_nome;
    if (isPacoteCompletoSst(nome) || isPacoteCompletoNome(nome)) continue;

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
    const nome = servico?.nome ?? item.servico_nome;
    return isPacoteCompletoSst(nome) || isPacoteCompletoNome(nome);
  });
}

function drawPremiumCardShell(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  options?: { bodyFill?: RGB }
): number {
  const bodyFill = options?.bodyFill ?? WHITE;

  doc.setFillColor(...bodyFill);
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, PREMIUM_CARD_RADIUS, PREMIUM_CARD_RADIUS, "FD");

  doc.setFillColor(...NAVY);
  doc.roundedRect(
    x,
    y,
    w,
    PREMIUM_CARD_HEADER_H,
    PREMIUM_CARD_RADIUS,
    PREMIUM_CARD_RADIUS,
    "F"
  );

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.55);
  doc.line(
    x + 4,
    y + PREMIUM_CARD_HEADER_H - 0.6,
    x + w - 4,
    y + PREMIUM_CARD_HEADER_H - 0.6
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(title.toUpperCase(), x + PREMIUM_CARD_PADDING, y + 6.2);

  return y + PREMIUM_CARD_HEADER_H + PREMIUM_CARD_PADDING;
}

function drawChecklistItem(
  doc: JsPDF,
  x: number,
  y: number,
  textWidth: number,
  item: string
): number {
  doc.setTextColor(...CHECK_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("✓", x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_700);
  const lines = doc.splitTextToSize(item, textWidth);
  doc.text(lines, x + 4.5, y);
  return y + lines.length * 3.6 + CHECKLIST_ITEM_GAP;
}

function measureResumoFinanceiroCardHeight(): number {
  return (
    PREMIUM_CARD_HEADER_H +
    PREMIUM_CARD_PADDING +
    14 +
    2 +
    5 +
    12 +
    2 +
    5 +
    12 +
    PREMIUM_CARD_PADDING
  );
}

function drawResumoFinanceiroCard(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  orcamento: OrcamentoComItens
): void {
  const contentY = drawPremiumCardShell(
    doc,
    x,
    y,
    w,
    h,
    "Resumo Financeiro",
    { bodyFill: WHITE }
  );

  const innerX = x + PREMIUM_CARD_PADDING;
  const innerW = w - PREMIUM_CARD_PADDING * 2;
  const valorTotal = Number(orcamento.valor_total);
  const pagamento = calcCondicoesPagamentoProposta(valorTotal);
  let lineY = contentY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_500);
  doc.text("Valor Total", innerX, lineY);
  lineY += 4.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  doc.text(formatCurrency(valorTotal), innerX, lineY);
  lineY += 7;

  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.2);
  doc.line(innerX, lineY, innerX + innerW, lineY);
  lineY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...SLATE_500);
  doc.text("Pagamento parcelado", innerX, lineY);
  lineY += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_700);
  doc.text(pagamento.textoParcelado, innerX, lineY);
  lineY += 7;

  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.2);
  doc.line(innerX, lineY, innerX + innerW, lineY);
  lineY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...SLATE_500);
  doc.text("Valor à vista", innerX, lineY);
  lineY += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_700);
  doc.text(pagamento.textoAVista, innerX, lineY);
}

function measurePacoteCompletoInclusosBlockHeight(
  doc: JsPDF,
  width: number,
  itens: string[]
): number {
  const textWidth = width - PREMIUM_CARD_PADDING * 2 - 5;
  let h = PREMIUM_CARD_HEADER_H + PREMIUM_CARD_PADDING;

  doc.setFontSize(7.5);
  itens.forEach((item) => {
    const lines = doc.splitTextToSize(item, textWidth);
    h += lines.length * 3.6 + CHECKLIST_ITEM_GAP;
  });

  h += 3;
  h += 4;
  h += 5;
  doc.setFontSize(7);
  PACOTE_COMPLETO_INCLUSOS_OBSERVACOES.forEach((paragrafo) => {
    const lines = wrapParagraphLines(doc, paragrafo, textWidth);
    h += lines.length * 3.5 + 2;
  });
  h += 5;
  h += PREMIUM_CARD_PADDING;

  return h;
}

function drawPacoteCompletoInclusosBlock(
  doc: JsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  itens: string[]
): void {
  const contentY = drawPremiumCardShell(
    doc,
    x,
    y,
    width,
    height,
    "O que está incluso?",
    { bodyFill: WHITE }
  );

  const textX = x + PREMIUM_CARD_PADDING;
  const textWidth = width - PREMIUM_CARD_PADDING * 2 - 5;
  let itemY = contentY;

  itens.forEach((item) => {
    itemY = drawChecklistItem(doc, textX, itemY, textWidth, item);
  });

  const obsPadding = 3;
  const obsLabelH = 5;
  doc.setFontSize(7);
  let obsContentH = obsLabelH;
  PACOTE_COMPLETO_INCLUSOS_OBSERVACOES.forEach((paragrafo) => {
    const lines = wrapParagraphLines(doc, paragrafo, textWidth);
    obsContentH += lines.length * 3.5 + 2;
  });
  const obsBlockH = obsContentH + obsPadding * 2;
  const obsY = y + height - PREMIUM_CARD_PADDING - obsBlockH;

  doc.setFillColor(...SLATE_50);
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.2);
  doc.roundedRect(
    textX - 1,
    obsY,
    width - PREMIUM_CARD_PADDING * 2 + 2,
    obsBlockH,
    2,
    2,
    "FD"
  );

  let obsTextY = obsY + obsPadding + 3.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_700);
  doc.text("Observações:", textX, obsTextY);
  obsTextY += obsLabelH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_700);
  PACOTE_COMPLETO_INCLUSOS_OBSERVACOES.forEach((paragrafo) => {
    const lines = wrapParagraphLines(doc, paragrafo, textWidth);
    doc.text(lines, textX, obsTextY);
    obsTextY += lines.length * 3.5 + 2;
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

function wrapDescricaoPropostaLines(
  doc: JsPDF,
  text: string,
  maxWidth: number
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return doc.splitTextToSize(normalized, maxWidth);
}

function measureGenericInclusosCardHeight(
  doc: JsPDF,
  width: number,
  inclusos: string[]
): number {
  const colW = (width - PREMIUM_CARD_PADDING * 2 - 4) / 2;
  const itemsPerCol = Math.ceil(inclusos.length / 2);
  doc.setFontSize(7.5);
  const measureCol = (items: string[]) =>
    items.reduce((sum, item) => {
      const lines = doc.splitTextToSize(item, colW - 5);
      return sum + lines.length * 3.6 + CHECKLIST_ITEM_GAP;
    }, 0);
  const colH = Math.max(
    measureCol(inclusos.slice(0, itemsPerCol)),
    measureCol(inclusos.slice(itemsPerCol))
  );
  return PREMIUM_CARD_HEADER_H + PREMIUM_CARD_PADDING + colH + PREMIUM_CARD_PADDING;
}

function drawGenericInclusosCard(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  inclusos: string[]
): void {
  const contentY = drawPremiumCardShell(
    doc,
    x,
    y,
    w,
    h,
    "O que está incluso?",
    { bodyFill: WHITE }
  );

  const colW = (w - PREMIUM_CARD_PADDING * 2 - 4) / 2;
  const itemsPerCol = Math.ceil(inclusos.length / 2);
  const leftItems = inclusos.slice(0, itemsPerCol);
  const rightItems = inclusos.slice(itemsPerCol);

  let leftY = contentY;
  leftItems.forEach((item) => {
    leftY = drawChecklistItem(
      doc,
      x + PREMIUM_CARD_PADDING,
      leftY,
      colW - 5,
      item
    );
  });

  let rightY = contentY;
  rightItems.forEach((item) => {
    rightY = drawChecklistItem(
      doc,
      x + PREMIUM_CARD_PADDING + colW + 4,
      rightY,
      colW - 5,
      item
    );
  });
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

  const rowSpacing = 6;
  const cardPaddingTop = 5.5;
  const cardH = cardPaddingTop + rowSpacing * 3 + 4;
  drawCard(doc, MARGIN, y, CONTENT_W, cardH, {
    fill: WHITE,
    stroke: SLATE_200,
  });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN, y + cardH);

  const col1X = MARGIN + 6;
  const col2X = MARGIN + CONTENT_W / 2 + 2;
  const rowY = y + cardPaddingTop;

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
    ["Número de Colaboradores", resolveNumeroColaboradoresOrcamento(orcamento)],
  ];

  doc.setFontSize(7);

  fieldsLeft.forEach(([label, value], index) => {
    const lineY = rowY + index * rowSpacing;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_500);
    doc.text(label, col1X, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_900);
    doc.text(String(value).slice(0, 52), col1X + 22, lineY);
  });

  fieldsRight.forEach(([label, value], index) => {
    const lineY = rowY + index * rowSpacing;
    const valueOffset = label === "Número de Colaboradores" ? 38 : 28;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...SLATE_500);
    doc.text(label, col2X, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_900);
    doc.text(String(value).slice(0, 52), col2X + valueOffset, lineY);
  });

  return y + cardH + 6;
}

/* ── Descrição da proposta ─────────────────────────────────────── */
function measureDescricaoPropostaHeight(
  doc: JsPDF,
  paragrafos: readonly string[]
): number {
  if (paragrafos.length === 0) return 0;

  const cardPadding = 5;
  const textWidth = CONTENT_W - DESCRICAO_CARD_PADDING_X * 2;
  let h = cardPadding;

  paragrafos.forEach((paragrafo, index) => {
    const isNotaLegal = index === paragrafos.length - 1 && paragrafos.length > 1;
    doc.setFont("helvetica", isNotaLegal ? "italic" : "normal");
    doc.setFontSize(isNotaLegal ? 7 : 7.5);
    const lines = wrapDescricaoPropostaLines(doc, paragrafo, textWidth);
    h += lines.length * 3.8;
    if (index < paragrafos.length - 1) h += 2;
  });

  return h + cardPadding;
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

  let textY = y + 5;
  const textX = MARGIN + DESCRICAO_CARD_PADDING_X;
  const textWidth = CONTENT_W - DESCRICAO_CARD_PADDING_X * 2;

  paragrafos.forEach((paragrafo, index) => {
    const isNotaLegal = index === paragrafos.length - 1 && paragrafos.length > 1;
    doc.setFont("helvetica", isNotaLegal ? "italic" : "normal");
    doc.setFontSize(isNotaLegal ? 7 : 7.5);
    doc.setTextColor(...(isNotaLegal ? SLATE_500 : SLATE_700));

    const lines = wrapDescricaoPropostaLines(doc, paragrafo, textWidth);
    doc.text(lines, textX, textY);
    textY += lines.length * 3.8 + (index < paragrafos.length - 1 ? 2 : 0);
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
  const isPacote =
    isPacoteCompletoSst(servico?.nome ?? item.servico_nome) ||
    isPacoteCompletoNome(servico?.nome ?? item.servico_nome);

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

  const colWidths = [98, 44, 40];
  const colStarts = [
    MARGIN,
    MARGIN + colWidths[0],
    MARGIN + colWidths[0] + colWidths[1],
  ];
  const headers = ["Serviço", "Quantidade de Colaboradores", "Valor"];
  const tableHeadH = 12;
  const tableHeadFont = 7;

  const drawTableHead = (startY: number) => {
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, startY, CONTENT_W, tableHeadH, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.setFontSize(tableHeadFont);
    headers.forEach((header, index) => {
      const colW = colWidths[index] ?? 0;
      const headerY = startY + tableHeadH / 2 + 1;

      if (index === 1) {
        const centerX = colStarts[index] + colW / 2;
        const lines = doc.splitTextToSize(header, colW - 6);
        const lineHeight = 3.2;
        const blockH = lines.length * lineHeight;
        const textY = startY + (tableHeadH - blockH) / 2 + 2.5;
        lines.forEach((line: string, lineIndex: number) => {
          doc.text(line, centerX, textY + lineIndex * lineHeight, {
            align: "center",
          });
        });
        return;
      }

      const x =
        index === 0 ? colStarts[index] + 3 : colStarts[index] + colW - 2;
      const align = index === 0 ? "left" : "right";
      doc.text(header, x, headerY, { align });
    });
    return startY + tableHeadH;
  };

  y = drawTableHead(y);

  itens.forEach((item, index) => {
    const servico = resolveCatalogoServico(item, catalogo);
    const inclusos = resolveItensInclusosServico(servico, item.servico_nome);
    const isPacote =
      isPacoteCompletoSst(servico?.nome ?? item.servico_nome) ||
      isPacoteCompletoNome(servico?.nome ?? item.servico_nome);
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
    doc.text(
      String(Math.round(Number(item.quantidade))),
      colStarts[1] + colWidths[1] / 2,
      valueY,
      { align: "center" }
    );
    doc.setFont("helvetica", "bold");
    doc.text(
      formatCurrency(resolveItemValorServico(item)),
      colStarts[2] + colWidths[2] - 2,
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

  return y + 11;
}

/* ── Resumo financeiro + checklist (lado a lado) ─────────────────── */
function drawFinancialAndInclusosRow(
  doc: JsPDF,
  y: number,
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[],
  inclusos: string[]
): number {
  const hasPacote = orcamentoHasPacoteCompleto(orcamento, catalogo);
  const boxW = 88;
  const gap = 5;
  const checklistW = CONTENT_W - boxW - gap;
  const boxX = MARGIN + CONTENT_W - boxW;

  const pacoteInclusosItens = hasPacote
    ? buildPacoteCompletoInclusosItens(orcamento)
    : [];

  const financeiroH = measureResumoFinanceiroCardHeight();
  let inclusosH = 0;

  if (hasPacote) {
    inclusosH = measurePacoteCompletoInclusosBlockHeight(
      doc,
      checklistW,
      pacoteInclusosItens
    );
  } else if (inclusos.length > 0) {
    inclusosH = measureGenericInclusosCardHeight(doc, checklistW, inclusos);
  }

  const hasInclusosCard = hasPacote || inclusos.length > 0;
  const cardH = hasInclusosCard
    ? Math.max(inclusosH, financeiroH)
    : financeiroH;

  y = ensureSpace(doc, y, cardH + 6);
  const cardY = y;

  if (hasPacote) {
    drawPacoteCompletoInclusosBlock(
      doc,
      MARGIN,
      cardY,
      checklistW,
      cardH,
      pacoteInclusosItens
    );
  } else if (inclusos.length > 0) {
    drawGenericInclusosCard(doc, MARGIN, cardY, checklistW, cardH, inclusos);
  }

  drawResumoFinanceiroCard(doc, boxX, cardY, boxW, cardH, orcamento);

  return cardY + cardH + 6;
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
  const { jsPDF, GState } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const [logo, symbolWatermark, catalogo, clienteInfo] = await Promise.all([
    loadLogoAsset(),
    loadNavarroSymbolWatermark(),
    listarServicosSst(),
    resolveClientePdfInfo(orcamento),
  ]);

  const inclusos = collectAllInclusos(orcamento, catalogo);

  let y = drawHeader(doc, logo, orcamento);
  y = drawClientCard(doc, y, orcamento, clienteInfo);

  const contentStartY = y;
  const watermarkRegion = calcOrcamentoWatermarkRegion(
    doc,
    contentStartY,
    PROPOSTA_DESCRICAO_PARAGRAFOS
  );
  if (symbolWatermark) {
    drawNavarroWatermark(
      doc,
      symbolWatermark,
      watermarkRegion.yTop,
      watermarkRegion.yBottom,
      GState
    );
  }

  y = drawDescricaoProposta(doc, contentStartY, PROPOSTA_DESCRICAO_PARAGRAFOS);
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
