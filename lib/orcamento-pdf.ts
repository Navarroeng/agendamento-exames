import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { resolveValidadePropostaIso } from "@/lib/orcamento-validade";
import {
  calcPdfContentBottomY,
  drawNavarroPremiumFooter,
} from "@/lib/pdf-navarro-footer";
import { formatCNPJ } from "@/lib/cnpj";
import {
  resolveItemValorServico,
  resolveQuantidadeColaboradoresOrcamento,
} from "@/lib/orcamento-calculo";
import { calcCondicoesPagamentoProposta } from "@/lib/orcamento-pagamento";
import { formatCurrency } from "@/lib/money";
import {
  MENSALIDADE_BENEFICIOS_ITENS,
  MENSALIDADE_BENEFICIOS_OBSERVACOES,
  MENSALIDADE_BENEFICIOS_TITULO,
  buildResumoMensalidadeLinhas,
  formatValorMensalidade,
  isGestaoCompletaSstNome,
  isGestaoMensalSstNome,
  isOrcamentoMensalidade,
  labelItensInclusosServico,
  labelValorColunaOrcamento,
} from "@/lib/orcamento-modalidade";
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
const GRAY_LINE: [number, number, number] = [217, 221, 229];
const GOLD_STRONG: [number, number, number] = [168, 118, 18];

/** Alinhado ao padrão visual dos cards de Fatura (Resumo / Dados Bancários). */
const CARD_RADIUS = 2;
const CARD_HEADER_H = 9;
const CARD_PAD_X = 4;
const CARD_BODY_PAD = 3;
const FINANCIAL_CARD_HEADER_H = 9;
const FINANCIAL_CARD_BODY_PAD = 5.5;
const FINANCIAL_CARD_BODY_PAD_MENSAL = 3.2;
const FINANCIAL_ROW_ICON_W = 4;
const FINANCIAL_ROW_SPACING = 4;
const FINANCIAL_ROW_SPACING_MENSAL = 2.2;
const FINANCIAL_DIVIDER_PAD = 1.5;
const FINANCIAL_DIVIDER_PAD_MENSAL = 1;
/** ~22 px entre o último valor e a observação de validade. */
const FINANCIAL_VALIDADE_GAP = 6;
const FINANCIAL_VALIDADE_GAP_MENSAL = 3.2;
const FINANCIAL_VALIDADE_FONT = 7.5;
const FINANCIAL_VALIDADE_COLOR: [number, number, number] = [107, 114, 128];
const COLON_VALUE_GAP = 1.5;
const CARD_ITEM_GAP = 1.6;
const INCLUSO_LINE_H = 3.3;
const INCLUSOS_ITEMS_TO_OBS_GAP = 1;
const INCLUSOS_OBS_PAD = 2;
const INCLUSOS_OBS_LABEL_H = 3.2;
const INCLUSOS_OBS_PARA_LINE_H = 3;
const INCLUSOS_OBS_PARA_GAP = 0.8;

const CHECKLIST_ITEM_GAP = 1.6;
const CHECKLIST_LINE_HEIGHT = 3.25;
const PREMIUM_CARD_BODY_FILL = GOLD_BG;

/** ~20 px entre o fim de um card e o título da próxima seção. */
const SECTION_AFTER_CARD_GAP = 7;
/** Respiro entre a tabela de serviços e os cards inferiores. */
const CARDS_AFTER_TABLE_GAP = 4;
const CARDS_AFTER_TABLE_GAP_MENSAL = 2.5;

const MARGIN = 12;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Limite inferior da área útil (acima do rodapé + margem de segurança). */
const CONTENT_BOTTOM_Y = calcPdfContentBottomY(PAGE_H);
export const ORCAMENTO_PDF_CONTENT_BOTTOM_Y = CONTENT_BOTTOM_Y;

/** Opacidade da marca d'água sobreposta (4–8%). */
export const ORCAMENTO_WATERMARK_OPACITY = 0.06;
/** Largura da marca d'água em relação à área útil (~2× o tamanho anterior). */
export const ORCAMENTO_WATERMARK_WIDTH_RATIO = 0.8;
const LOGO_BG_RADIUS_PX = 10;
const CLIENT_LABEL_FONT = 8;
const CLIENT_VALUE_FONT = 8.5;
const CLIENT_FIELD_LINE_H = 3.5;
const CLIENT_FIELD_ROW_GAP = 2.5;
const CLIENT_CARD_PAD_X = 6;
const CLIENT_CARD_PAD_TOP = 5;
const CLIENT_CARD_PAD_BOTTOM = 4;
const CLIENT_LEFT_LABEL_W = 24;
const CLIENT_RIGHT_LABEL_W = 40;
const TABLE_HEAD_FONT = 8.5;
const TABLE_SERVICE_FONT = 9.5;
const TABLE_DETAIL_FONT = 8;
const TABLE_CELL_FONT = 8.5;
const TABLE_DETAIL_LINE_H = 3;
const TABLE_ROW_BOTTOM_PAD = 5;
/** ~4–6 px entre nome do serviço, rótulo Inclui: e itens da lista. */
const TABLE_NAME_INCLUI_GAP = 1.5;
const TABLE_INCLUI_LIST_GAP = 1.5;
const TABLE_INCLUSO_ITEM_GAP = 1.5;
const TABLE_ROW_TOP = 4.5;
const TABLE_SERVICE_LINE_H = 3.5;
const TABLE_INCLUI_LABEL_H = 3;
const NAVARRO_SYMBOL_URL = "/apple-touch-icon.png";

const NAVARRO = {
  site: "www.navarroeng.com.br",
  email: "contato@navarroeng.com.br",
  telefone: "(11) 3181-7697",
  whatsapp: "(11) 97706-5599",
  agradecimento:
    "Agradecemos a confiança em nossos serviços! Estamos à disposição para quaisquer esclarecimentos.",
  razaoSocial: "Navarro Engenharia de Segurança do Trabalho e Medicina Ocupacional",
  responsavelTecnico: "Equipe Técnica Navarro Engenharia",
} as const;

const PROPOSTA_DESCRICAO_NOTA_LEGAL =
  "(Laudos obrigatórios por lei sujeito a multa do Ministério do trabalho MTE)";

const PROPOSTA_DESCRICAO_PARAGRAFOS: readonly string[] = [
  "Valor abaixo equivalente a realização e elaboração dos laudos, disponibilização dos arquivos em PDF para a empresa e gestão dos eventos de saúde e segurança do trabalho S-2210; S-2220; S-2240 dentro da plataforma E-social durante toda vigência do contrato (12 meses). Incluindo o Laudo de Riscos Psicossociais conforme a nova NR-01.",
  PROPOSTA_DESCRICAO_NOTA_LEGAL,
] as const;

const PROPOSTA_DESCRICAO_PARAGRAFOS_MENSALIDADE: readonly string[] = [
  "A presente proposta contempla a Gestão Completa de Saúde e Segurança do Trabalho (SST) durante a vigência contratual de 12 meses, incluindo elaboração e gestão dos documentos PGR, LTCAT e PCMSO, realização dos ASOs previstos no contrato, Avaliação de Riscos Psicossociais e gestão dos eventos de SST no eSocial (S-2210, S-2220 e S-2240).",
  "Durante a vigência, a empresa contará com acompanhamento contínuo da Navarro Engenharia, gestão das obrigações contratadas e disponibilização dos documentos em formato digital.",
  PROPOSTA_DESCRICAO_NOTA_LEGAL,
] as const;

function resolveDescricaoPropostaParagrafos(
  modalidade: string | null | undefined
): readonly string[] {
  return isOrcamentoMensalidade(modalidade)
    ? PROPOSTA_DESCRICAO_PARAGRAFOS_MENSALIDADE
    : PROPOSTA_DESCRICAO_PARAGRAFOS;
}

const DESCRICAO_CARD_PADDING_X = 5;

const PACOTE_COMPLETO_INCLUSOS_OBSERVACOES: readonly string[] = [
  "Se necessário, a realização de Exames Complementares serão cobrados à parte.",
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

function servicoListaInclusosNaTabela(
  nome: string | null | undefined
): boolean {
  return (
    isPacoteCompletoSst(nome) ||
    isPacoteCompletoNome(nome) ||
    isGestaoCompletaSstNome(nome)
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
  setor: string;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function applyLogoRoundedBackground(
  img: HTMLImageElement,
  radiusPx: number
): Promise<string> {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;

  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, 0, 0, w, h, radiusPx);
  ctx.fill();

  ctx.save();
  roundRectPath(ctx, 0, 0, w, h, radiusPx);
  ctx.clip();
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();

  return canvas.toDataURL("image/png");
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

    const loaded = await new Promise<{
      w: number;
      h: number;
      img: HTMLImageElement;
    }>((resolve, reject) => {
      const img = new Image();
      img.onload = () =>
        resolve({ w: img.naturalWidth, h: img.naturalHeight, img });
      img.onerror = () => reject(new Error("logo load failed"));
      img.src = dataUrl;
    });

    let finalDataUrl = dataUrl;
    if (typeof document !== "undefined") {
      finalDataUrl = await applyLogoRoundedBackground(
        loaded.img,
        LOGO_BG_RADIUS_PX
      );
    }

    const maxMm = 31.2;
    const ratio = loaded.w / loaded.h;
    let width = maxMm;
    let height = width / ratio;
    if (height > maxMm) {
      height = maxMm;
      width = height * ratio;
    }

    return { dataUrl: finalDataUrl, width, height };
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
  const span = Math.max(yBottom - yTop, 20);
  let w = contentWidth * ORCAMENTO_WATERMARK_WIDTH_RATIO;
  let h = (symbolHeight / symbolWidth) * w;

  if (h > span * 0.92) {
    h = span * 0.92;
    w = (symbolWidth / symbolHeight) * h;
  }

  const x = (pageWidth - w) / 2;
  const y = yTop + (span - h) / 2;
  return { x, y, w, h };
}

function drawNavarroWatermarkOverlay(
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
  const snapshotCnpj = orcamento.cliente_cnpj?.trim();
  const snapshotEndereco = orcamento.cliente_endereco?.trim();
  const snapshotSetor = orcamento.cliente_setor?.trim();

  let cnpj = snapshotCnpj ? formatCNPJ(snapshotCnpj) : null;
  let endereco = snapshotEndereco || null;
  let setor = snapshotSetor || null;

  if ((!cnpj || !endereco || !setor) && orcamento.cliente_id) {
    try {
      const cliente = await buscarClientePorId(orcamento.cliente_id);
      if (cliente) {
        cnpj = cnpj ?? formatCNPJ(cliente.cnpj);
        endereco = endereco ?? displayValue(cliente.endereco);
        setor = setor ?? displayValue(cliente.setor);
      }
    } catch {
      // mantém snapshots ou fallback abaixo
    }
  }

  return {
    cnpj: cnpj ?? "—",
    endereco: endereco ?? "—",
    setor: setor ?? "—",
  };
}

function displayValue(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export type OrcamentoPdfLayout = {
  logo: LogoAsset | null;
  orcamento: OrcamentoComItens;
};

export function blockFitsOnPage(y: number, needed: number): boolean {
  return y + needed <= CONTENT_BOTTOM_Y;
}

function addOrcamentoPage(doc: JsPDF, layout: OrcamentoPdfLayout): number {
  doc.addPage();
  return drawHeader(doc, layout.logo, layout.orcamento);
}

/** Garante altura contínua na área útil; se não couber, nova página com cabeçalho. */
export function ensureSpace(
  doc: JsPDF,
  y: number,
  needed: number,
  layout: OrcamentoPdfLayout
): number {
  if (blockFitsOnPage(y, needed)) return y;
  return addOrcamentoPage(doc, layout);
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

function drawCardWithSoftShadow(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { fill?: RGB; stroke?: RGB; radius?: number }
) {
  const radius = options?.radius ?? 2.5;
  doc.setFillColor(220, 226, 235);
  doc.roundedRect(x + 0.35, y + 0.5, w, h, radius, radius, "F");
  drawCard(doc, x, y, w, h, options);
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

  return y + 6;
}

function wrapClientFieldValue(
  doc: JsPDF,
  value: string,
  maxWidth: number
): string[] {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(CLIENT_VALUE_FONT);
  const normalized = String(value).trim() || "—";
  if (maxWidth <= 0) return [normalized];
  return doc.splitTextToSize(normalized, maxWidth);
}

function measureClientColumnHeight(
  doc: JsPDF,
  fields: [string, string][],
  colWidth: number,
  labelWidth: number
): number {
  const valueMaxW = Math.max(colWidth - labelWidth - 1, 8);
  let height = 0;

  fields.forEach(([label, value], index) => {
    const lines = wrapClientFieldValue(doc, value, valueMaxW);
    const rowH = Math.max(
      CLIENT_FIELD_LINE_H,
      lines.length * CLIENT_FIELD_LINE_H
    );
    height += rowH;
    if (index < fields.length - 1) {
      height += CLIENT_FIELD_ROW_GAP;
    }
  });

  return height;
}

function drawClientColumn(
  doc: JsPDF,
  x: number,
  startY: number,
  colWidth: number,
  labelWidth: number,
  fields: [string, string][]
): number {
  const valueMaxW = Math.max(colWidth - labelWidth - 1, 8);
  let y = startY;

  fields.forEach(([label, value], index) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(CLIENT_LABEL_FONT);
    doc.setTextColor(...SLATE_500);
    doc.text(label, x, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(CLIENT_VALUE_FONT);
    doc.setTextColor(...SLATE_900);
    const lines = wrapClientFieldValue(doc, value, valueMaxW);
    const valueX = x + labelWidth;
    lines.forEach((line, lineIndex) => {
      doc.text(line, valueX, y + lineIndex * CLIENT_FIELD_LINE_H);
    });

    const rowH = Math.max(
      CLIENT_FIELD_LINE_H,
      lines.length * CLIENT_FIELD_LINE_H
    );
    y += rowH;
    if (index < fields.length - 1) {
      y += CLIENT_FIELD_ROW_GAP;
    }
  });

  return y;
}

/** Shell visual alinhado aos cards de Fatura (cabeçalho navy + corpo dourado claro). */
function drawFaturaStyleCardShell(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
): number {
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, CARD_RADIUS, CARD_RADIUS, "S");

  doc.setFillColor(...NAVY);
  doc.roundedRect(x, y, w, CARD_HEADER_H, CARD_RADIUS, CARD_RADIUS, "F");
  doc.setFillColor(...NAVY);
  doc.rect(x, y + CARD_HEADER_H - 3, w, 3, "F");

  doc.setFillColor(...PREMIUM_CARD_BODY_FILL);
  doc.rect(x, y + CARD_HEADER_H, w, h - CARD_HEADER_H, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text(title.toUpperCase(), x + w / 2, y + 6, { align: "center" });

  return y + CARD_HEADER_H;
}

/** Cabeçalho premium do Resumo Financeiro (fonte maior, centralizado). */
function drawResumoFinanceiroCardShell(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number
): number {
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, CARD_RADIUS, CARD_RADIUS, "S");

  doc.setFillColor(...NAVY);
  doc.roundedRect(x, y, w, FINANCIAL_CARD_HEADER_H, CARD_RADIUS, CARD_RADIUS, "F");
  doc.setFillColor(...NAVY);
  doc.rect(x, y + FINANCIAL_CARD_HEADER_H - 3, w, 3, "F");

  doc.setFillColor(...PREMIUM_CARD_BODY_FILL);
  doc.rect(x, y + FINANCIAL_CARD_HEADER_H, w, h - FINANCIAL_CARD_HEADER_H, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text("RESUMO FINANCEIRO", x + w / 2, y + 6.1, { align: "center" });

  return y + FINANCIAL_CARD_HEADER_H;
}

function drawFinancialRowDivider(
  doc: JsPDF,
  x: number,
  y: number,
  w: number
): void {
  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.15);
  doc.line(x, y, x + w, y);
}

type FinancialRowIcon = "total" | "parcel" | "avista";

function drawFinancialRowIcon(
  doc: JsPDF,
  kind: FinancialRowIcon,
  x: number,
  y: number,
  color: RGB
): void {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.22);

  if (kind === "total") {
    doc.roundedRect(x, y - 2.4, 3.4, 2.6, 0.35, 0.35, "S");
    doc.line(x + 0.55, y - 3, x + 2.85, y - 3);
    return;
  }

  if (kind === "parcel") {
    doc.roundedRect(x + 0.2, y - 3, 3, 3.8, 0.35, 0.35, "S");
    doc.line(x + 0.7, y - 2, x + 2.7, y - 2);
    doc.line(x + 0.7, y - 1.1, x + 2.7, y - 1.1);
    doc.line(x + 0.7, y - 0.2, x + 2.1, y - 0.2);
    return;
  }

  doc.line(x, y - 2.6, x + 2.4, y - 2.6);
  doc.line(x + 2.4, y - 2.6, x + 3.1, y - 1.35);
  doc.line(x + 3.1, y - 1.35, x, y - 1.35);
  doc.line(x, y - 1.35, x, y - 2.6);
  doc.circle(x + 0.75, y - 1.95, 0.32, "S");
}

function measureFinancialCardContentHeight(isMensalidade = false): number {
  if (isMensalidade) {
    const rowGap =
      FINANCIAL_DIVIDER_PAD_MENSAL + FINANCIAL_ROW_SPACING_MENSAL;
    return (
      FINANCIAL_CARD_BODY_PAD_MENSAL +
      6.5 +
      rowGap +
      4.5 +
      rowGap +
      4.5 +
      rowGap +
      4 +
      FINANCIAL_VALIDADE_GAP_MENSAL +
      3.2 +
      FINANCIAL_CARD_BODY_PAD_MENSAL
    );
  }
  return (
    FINANCIAL_CARD_BODY_PAD +
    6.5 +
    FINANCIAL_DIVIDER_PAD +
    FINANCIAL_ROW_SPACING +
    5.5 +
    FINANCIAL_DIVIDER_PAD +
    FINANCIAL_ROW_SPACING +
    5 +
    FINANCIAL_VALIDADE_GAP +
    1.2 +
    3.5 +
    FINANCIAL_CARD_BODY_PAD
  );
}

function drawFinancialPremiumRow(
  doc: JsPDF,
  x: number,
  w: number,
  y: number,
  icon: FinancialRowIcon,
  label: string,
  value: string,
  options?: {
    labelFont?: number;
    valueFont?: number;
    valueColor?: RGB;
    iconColor?: RGB;
    labelBold?: boolean;
    valueBold?: boolean;
    rowHeight?: number;
  }
): number {
  const labelX = x + CARD_PAD_X;
  const valueX = x + w - CARD_PAD_X;
  const textX = labelX + FINANCIAL_ROW_ICON_W + 1.2;
  const rowHeight = options?.rowHeight ?? 5.5;
  const iconColor = options?.iconColor ?? NAVY;

  drawFinancialRowIcon(doc, icon, labelX, y, iconColor);

  doc.setFont("helvetica", options?.labelBold ? "bold" : "normal");
  doc.setFontSize(options?.labelFont ?? 7.5);
  doc.setTextColor(...SLATE_700);
  doc.text(label, textX, y);

  doc.setFont("helvetica", options?.valueBold === false ? "normal" : "bold");
  doc.setFontSize(options?.valueFont ?? 9);
  doc.setTextColor(...(options?.valueColor ?? NAVY));
  doc.text(value, valueX, y, { align: "right" });

  return y + rowHeight;
}

function drawMensalidadeFinancialRow(
  doc: JsPDF,
  x: number,
  w: number,
  rowTop: number,
  rowH: number,
  icon: FinancialRowIcon,
  label: string,
  value: string,
  options: {
    labelFont: number;
    valueFont: number;
    valueColor?: RGB;
    iconColor?: RGB;
    labelBold?: boolean;
    valueBold?: boolean;
  }
): void {
  const valueFont = options.valueFont;
  const baseline = rowTop + rowH / 2 + valueFont * 0.12;
  drawFinancialPremiumRow(doc, x, w, baseline, icon, label, value, {
    ...options,
    rowHeight: 0,
  });
}

function drawMensalidadeResumoFinanceiroBody(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  bodyY: number,
  orcamento: OrcamentoComItens
): void {
  const linhas = buildResumoMensalidadeLinhas(Number(orcamento.valor_total));
  const innerX = x + CARD_PAD_X;
  const innerW = w - CARD_PAD_X * 2;
  const n = linhas.length;
  const topPad = 3.4;
  const bottomPad = 3.2;
  const validadeBlock = 8.4;
  const dividerGap = 2.15;
  const interRow = dividerGap * 2;

  const rowsTop = bodyY + topPad;
  const rowsBottom = y + h - bottomPad - validadeBlock;
  const rowsArea = Math.max(rowsBottom - rowsTop, n * 5.5);
  const rowH = (rowsArea - interRow * (n - 1)) / n;

  let cursor = rowsTop;
  linhas.forEach((linha, index) => {
    const isValor = index === 0;
    const isRenovacao = index === n - 1;
    drawMensalidadeFinancialRow(
      doc,
      x,
      w,
      cursor,
      rowH,
      isValor ? "total" : "parcel",
      linha.label,
      linha.value,
      isValor
        ? {
            labelFont: 7.5,
            valueFont: 11,
            labelBold: true,
            iconColor: GOLD,
          }
        : isRenovacao
          ? {
              labelFont: 7,
              valueFont: 7,
              labelBold: false,
              valueBold: false,
              valueColor: SLATE_500,
              iconColor: SLATE_500,
            }
          : {
              labelFont: 7.5,
              valueFont: 9,
              labelBold: false,
              iconColor: GOLD,
            }
    );
    cursor += rowH;
    if (index < n - 1) {
      cursor += dividerGap;
      doc.setDrawColor(...SLATE_200);
      doc.setLineWidth(0.12);
      doc.line(innerX, cursor, innerX + innerW, cursor);
      cursor += dividerGap;
    }
  });

  const validadeY = y + h - bottomPad - 1.2;
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.12);
  doc.line(innerX, validadeY - 5.2, innerX + innerW, validadeY - 5.2);

  const validadeIso = resolveValidadePropostaIso(orcamento.data_proposta);
  const validadeLabel = formatDateIsoToBR(validadeIso);
  if (validadeLabel) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(FINANCIAL_VALIDADE_FONT);
    doc.setTextColor(...FINANCIAL_VALIDADE_COLOR);
    doc.text(`Proposta válida até ${validadeLabel}`, x + w / 2, validadeY, {
      align: "center",
    });
  }
}

/** Cards finais nunca encolhem: ou cabem inteiros, ou vão juntos para a próxima página. */
export function resolveCardsBlockPlacement(
  y: number,
  desiredH: number
): { needsNewPage: boolean; cardH: number } {
  return {
    needsNewPage: !blockFitsOnPage(y, desiredH),
    cardH: desiredH,
  };
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
    if (servicoListaInclusosNaTabela(nome)) continue;

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

function orcamentoHasGestaoMensal(
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[]
): boolean {
  return (orcamento.orcamento_itens ?? []).some((item) => {
    const servico = resolveCatalogoServico(item, catalogo);
    const nome = servico?.nome ?? item.servico_nome;
    return isGestaoMensalSstNome(nome);
  });
}

/** Mesmo card estruturado de “O que está incluso?” do Pacote completo - SST. */
function orcamentoUsaCardInclusosEstruturado(
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[]
): boolean {
  if (orcamentoHasPacoteCompleto(orcamento, catalogo)) return true;
  return (
    isOrcamentoMensalidade(orcamento.modalidade) &&
    orcamentoHasGestaoMensal(orcamento, catalogo)
  );
}

function drawPremiumCardShell(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  _options?: { bodyFill?: RGB }
): number {
  return drawFaturaStyleCardShell(doc, x, y, w, h, title);
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
  return y + lines.length * CHECKLIST_LINE_HEIGHT + CHECKLIST_ITEM_GAP;
}

function measureResumoFinanceiroCardHeight(isMensalidade = false): number {
  return FINANCIAL_CARD_HEADER_H + measureFinancialCardContentHeight(isMensalidade);
}

function drawResumoFinanceiroCard(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  orcamento: OrcamentoComItens
): void {
  const bodyY = drawResumoFinanceiroCardShell(doc, x, y, w, h);

  const innerX = x + CARD_PAD_X;
  const innerW = w - CARD_PAD_X * 2;
  const isMensalidade = isOrcamentoMensalidade(orcamento.modalidade);
  const valorTotal = Number(orcamento.valor_total);

  if (isMensalidade) {
    drawMensalidadeResumoFinanceiroBody(doc, x, y, w, h, bodyY, orcamento);
    return;
  }

  let lineY = bodyY + FINANCIAL_CARD_BODY_PAD;

  const drawRow = (
    icon: "total" | "parcel" | "avista",
    label: string,
    value: string,
    options: {
      labelFont?: number;
      valueFont?: number;
      valueColor?: RGB;
      iconColor?: RGB;
      labelBold?: boolean;
      valueBold?: boolean;
      rowHeight?: number;
    },
    withDividerAfter: boolean
  ) => {
    lineY = drawFinancialPremiumRow(doc, x, w, lineY, icon, label, value, options);
    if (!withDividerAfter) return;
    lineY += FINANCIAL_DIVIDER_PAD;
    drawFinancialRowDivider(doc, innerX, lineY, innerW);
    lineY += FINANCIAL_ROW_SPACING;
  };

  const pagamento = calcCondicoesPagamentoProposta(
    valorTotal,
    orcamento.quantidade_parcelas
  );
  drawRow(
    "total",
    "Valor Total",
    formatCurrency(valorTotal),
    {
      labelFont: 8.5,
      valueFont: 12,
      labelBold: true,
      iconColor: GOLD,
      rowHeight: 6.5,
    },
    true
  );
  drawRow(
    "parcel",
    "Pagamento parcelado",
    pagamento.textoParcelado,
    {
      labelFont: 7.5,
      valueFont: 9.5,
      rowHeight: 5.5,
    },
    true
  );
  drawRow(
    "avista",
    "À vista (5% de desconto)",
    pagamento.textoAVista,
    {
      labelFont: 7.5,
      valueFont: 10.5,
      valueColor: GOLD_STRONG,
      iconColor: GOLD_STRONG,
      rowHeight: 5,
    },
    false
  );

  lineY += FINANCIAL_VALIDADE_GAP;
  drawFinancialRowDivider(doc, innerX, lineY, innerW);
  lineY += 3.2;

  const validadeIso = resolveValidadePropostaIso(orcamento.data_proposta);
  const validadeLabel = formatDateIsoToBR(validadeIso);
  if (validadeLabel) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(FINANCIAL_VALIDADE_FONT);
    doc.setTextColor(...FINANCIAL_VALIDADE_COLOR);
    doc.text(
      `Proposta válida até ${validadeLabel}`,
      x + w / 2,
      lineY,
      { align: "center" }
    );
  }
}

function parseInclusoLabelValue(
  text: string
): { label: string; value: string; separator: ": " | " - " } | null {
  const colonSpaceIdx = text.indexOf(": ");
  if (colonSpaceIdx > 0) {
    return {
      label: text.slice(0, colonSpaceIdx),
      value: text.slice(colonSpaceIdx + 2).trimStart(),
      separator: ": ",
    };
  }

  const colonIdx = text.indexOf(":");
  if (colonIdx > 0) {
    return {
      label: text.slice(0, colonIdx),
      value: text.slice(colonIdx + 1).trimStart(),
      separator: ": ",
    };
  }

  const dashIdx = text.indexOf(" - ");
  if (dashIdx > 0) {
    return {
      label: text.slice(0, dashIdx),
      value: text.slice(dashIdx + 3).trimStart(),
      separator: " - ",
    };
  }

  return null;
}

function measureStructuredInclusoItemHeight(
  doc: JsPDF,
  text: string,
  textWidth: number
): number {
  if (parseInclusoLabelValue(text)) {
    return INCLUSO_LINE_H + CARD_ITEM_GAP;
  }

  doc.setFontSize(8);
  const lines = doc.splitTextToSize(text, textWidth);
  return lines.length * INCLUSO_LINE_H + CARD_ITEM_GAP;
}

function drawStructuredInclusoItem(
  doc: JsPDF,
  x: number,
  y: number,
  textWidth: number,
  text: string,
  options?: { emphasis?: boolean }
): number {
  const parsed = parseInclusoLabelValue(text);

  if (parsed) {
    const labelText =
      parsed.separator === ": " ? `${parsed.label}:` : `${parsed.label} -`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text(labelText, x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...SLATE_700);
    doc.text(
      parsed.value,
      x + doc.getTextWidth(labelText) + COLON_VALUE_GAP,
      y
    );
    return y + INCLUSO_LINE_H + CARD_ITEM_GAP;
  }

  doc.setFont("helvetica", options?.emphasis ? "bold" : "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_700);
  const lines = doc.splitTextToSize(text, textWidth);
  doc.text(lines, x, y);
  return y + lines.length * INCLUSO_LINE_H + CARD_ITEM_GAP;
}

function measureObservacoesInclusosBoxHeight(
  doc: JsPDF,
  wrapWidth: number,
  observacoes: readonly string[] = PACOTE_COMPLETO_INCLUSOS_OBSERVACOES
): number {
  let obsContentH = INCLUSOS_OBS_LABEL_H;
  doc.setFontSize(7);
  observacoes.forEach((paragrafo) => {
    const lines = wrapParagraphLines(doc, paragrafo, wrapWidth);
    obsContentH += lines.length * INCLUSOS_OBS_PARA_LINE_H + INCLUSOS_OBS_PARA_GAP;
  });
  return obsContentH + INCLUSOS_OBS_PAD * 2;
}

function drawObservacoesInclusosBox(
  doc: JsPDF,
  textX: number,
  obsY: number,
  textWidth: number,
  obsBlockH: number,
  observacoes: readonly string[]
): void {
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.2);
  doc.roundedRect(textX, obsY, textWidth, obsBlockH, 1.4, 1.4, "FD");

  let obsTextY = obsY + INCLUSOS_OBS_PAD + 2.6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text("Observações", textX + 2.5, obsTextY);
  obsTextY += INCLUSOS_OBS_LABEL_H;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_700);
  observacoes.forEach((paragrafo) => {
    const lines = wrapParagraphLines(doc, paragrafo, textWidth - 5);
    doc.text(lines, textX + 2.5, obsTextY);
    obsTextY += lines.length * INCLUSOS_OBS_PARA_LINE_H + INCLUSOS_OBS_PARA_GAP;
  });
}

function measurePacoteCompletoInclusosBlockHeight(
  doc: JsPDF,
  width: number,
  itens: string[]
): number {
  const textWidth = width - CARD_PAD_X * 2;
  let h = CARD_HEADER_H + CARD_BODY_PAD;

  itens.forEach((item) => {
    h += measureStructuredInclusoItemHeight(doc, item, textWidth);
  });

  h += INCLUSOS_ITEMS_TO_OBS_GAP;
  h += measureObservacoesInclusosBoxHeight(doc, textWidth - 5);
  h += CARD_BODY_PAD;

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
  const bodyY = drawFaturaStyleCardShell(doc, x, y, width, height, "O que está incluso?");

  const textX = x + CARD_PAD_X;
  const textWidth = width - CARD_PAD_X * 2;
  let itemY = bodyY + CARD_BODY_PAD;

  itens.forEach((item, index) => {
    itemY = drawStructuredInclusoItem(doc, textX, itemY, textWidth, item, {
      emphasis: index < 2,
    });
  });

  const obsBlockH = measureObservacoesInclusosBoxHeight(doc, textWidth - 5);
  const obsY = y + height - CARD_BODY_PAD - obsBlockH;
  drawObservacoesInclusosBox(
    doc,
    textX,
    obsY,
    textWidth,
    obsBlockH,
    PACOTE_COMPLETO_INCLUSOS_OBSERVACOES
  );
}

const BENEFICIO_FONT = 7.5;
const BENEFICIO_LINE_H = 2.9;
const BENEFICIO_ITEM_GAP = 0.45;
const BENEFICIO_CHECK_W = 3.4;
const BENEFICIO_BODY_PAD = 2.2;
const BENEFICIO_ITEMS_TO_OBS_GAP = 0.5;
const BENEFICIO_OBS_PAD = 1.35;
const BENEFICIO_OBS_LABEL_H = 2.6;
const BENEFICIO_OBS_PARA_LINE_H = 2.6;
const BENEFICIO_OBS_PARA_GAP = 0.3;

function measureMensalidadeObservacoesBoxHeight(
  doc: JsPDF,
  wrapWidth: number
): number {
  let obsContentH = BENEFICIO_OBS_LABEL_H;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  MENSALIDADE_BENEFICIOS_OBSERVACOES.forEach((paragrafo) => {
    const lines = wrapParagraphLines(doc, paragrafo, wrapWidth);
    obsContentH +=
      lines.length * BENEFICIO_OBS_PARA_LINE_H + BENEFICIO_OBS_PARA_GAP;
  });
  return obsContentH + BENEFICIO_OBS_PAD * 2;
}

function drawMensalidadeObservacoesBox(
  doc: JsPDF,
  textX: number,
  obsY: number,
  textWidth: number,
  obsBlockH: number
): void {
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.2);
  doc.roundedRect(textX, obsY, textWidth, obsBlockH, 1.2, 1.2, "FD");

  let obsTextY = obsY + BENEFICIO_OBS_PAD + 2.1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...NAVY);
  doc.text("Observações", textX + 2.2, obsTextY);
  obsTextY += BENEFICIO_OBS_LABEL_H;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_700);
  MENSALIDADE_BENEFICIOS_OBSERVACOES.forEach((paragrafo) => {
    const lines = wrapParagraphLines(doc, paragrafo, textWidth - 4.4);
    doc.text(lines, textX + 2.2, obsTextY);
    obsTextY +=
      lines.length * BENEFICIO_OBS_PARA_LINE_H + BENEFICIO_OBS_PARA_GAP;
  });
}

function drawBeneficioCheck(doc: JsPDF, x: number, y: number): void {
  doc.setDrawColor(...CHECK_GREEN);
  doc.setLineWidth(0.42);
  doc.line(x, y - 0.55, x + 0.95, y);
  doc.line(x + 0.95, y, x + 2.2, y - 1.95);
}

function measureMensalidadeBeneficiosBlockHeight(
  doc: JsPDF,
  width: number
): number {
  const textWidth = width - CARD_PAD_X * 2;
  const wrapW = textWidth - BENEFICIO_CHECK_W;
  let h = CARD_HEADER_H + BENEFICIO_BODY_PAD;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BENEFICIO_FONT);
  MENSALIDADE_BENEFICIOS_ITENS.forEach((item) => {
    const lines = doc.splitTextToSize(item, wrapW);
    h += lines.length * BENEFICIO_LINE_H + BENEFICIO_ITEM_GAP;
  });
  h += BENEFICIO_ITEMS_TO_OBS_GAP;
  h += measureMensalidadeObservacoesBoxHeight(doc, textWidth - 4.4);
  h += BENEFICIO_BODY_PAD;
  return h;
}

function drawMensalidadeBeneficiosBlock(
  doc: JsPDF,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const bodyY = drawFaturaStyleCardShell(
    doc,
    x,
    y,
    width,
    height,
    MENSALIDADE_BENEFICIOS_TITULO
  );
  const textX = x + CARD_PAD_X;
  const textWidth = width - CARD_PAD_X * 2;
  const wrapW = textWidth - BENEFICIO_CHECK_W;
  let itemY = bodyY + BENEFICIO_BODY_PAD;

  MENSALIDADE_BENEFICIOS_ITENS.forEach((item) => {
    drawBeneficioCheck(doc, textX, itemY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BENEFICIO_FONT);
    doc.setTextColor(...SLATE_700);
    const lines = doc.splitTextToSize(item, wrapW);
    doc.text(lines, textX + BENEFICIO_CHECK_W, itemY);
    itemY += lines.length * BENEFICIO_LINE_H + BENEFICIO_ITEM_GAP;
  });

  const obsBlockH = measureMensalidadeObservacoesBoxHeight(
    doc,
    textWidth - 4.4
  );
  const obsY = y + height - BENEFICIO_BODY_PAD - obsBlockH;
  drawMensalidadeObservacoesBox(doc, textX, obsY, textWidth, obsBlockH);
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
  const colW = (width - CARD_PAD_X * 2 - 4) / 2;
  const itemsPerCol = Math.ceil(inclusos.length / 2);
  doc.setFontSize(7.5);
  const measureCol = (items: string[]) =>
    items.reduce((sum, item) => {
      const lines = doc.splitTextToSize(item, colW - 5);
      return sum + lines.length * CHECKLIST_LINE_HEIGHT + CHECKLIST_ITEM_GAP;
    }, 0);
  const colH = Math.max(
    measureCol(inclusos.slice(0, itemsPerCol)),
    measureCol(inclusos.slice(itemsPerCol))
  );
  return CARD_HEADER_H + CARD_BODY_PAD + colH + CARD_BODY_PAD;
}

function drawGenericInclusosCard(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  inclusos: string[]
): void {
  const bodyY = drawFaturaStyleCardShell(doc, x, y, w, h, "O que está incluso?");

  const colW = (w - CARD_PAD_X * 2 - 4) / 2;
  const itemsPerCol = Math.ceil(inclusos.length / 2);
  const leftItems = inclusos.slice(0, itemsPerCol);
  const rightItems = inclusos.slice(itemsPerCol);
  const contentY = bodyY + CARD_BODY_PAD;

  let leftY = contentY;
  leftItems.forEach((item) => {
    leftY = drawChecklistItem(doc, x + CARD_PAD_X, leftY, colW - 5, item);
  });

  let rightY = contentY;
  rightItems.forEach((item) => {
    rightY = drawChecklistItem(
      doc,
      x + CARD_PAD_X + colW + 4,
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
    `Validade: ${formatDateIsoToBR(resolveValidadePropostaIso(orcamento.data_proposta))}`,
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

  const colGap = 4;
  const colWidth = (CONTENT_W - CLIENT_CARD_PAD_X * 2 - colGap) / 2;
  const col1X = MARGIN + CLIENT_CARD_PAD_X;
  const col2X = col1X + colWidth + colGap;

  const fieldsLeft: [string, string][] = [
    ["Cliente", orcamento.cliente_nome],
    ["CNPJ", clienteInfo.cnpj],
    ["Setor", clienteInfo.setor],
    ["Endereço", clienteInfo.endereco],
  ];

  const fieldsRight: [string, string][] = [
    ["Contato", displayValue(orcamento.contato)],
    ["E-mail", displayValue(orcamento.email)],
    ["Telefone", displayValue(orcamento.telefone)],
    [
      "Número de Colaboradores",
      String(resolveNumeroColaboradoresOrcamento(orcamento)),
    ],
  ];

  const leftH = measureClientColumnHeight(
    doc,
    fieldsLeft,
    colWidth,
    CLIENT_LEFT_LABEL_W
  );
  const rightH = measureClientColumnHeight(
    doc,
    fieldsRight,
    colWidth,
    CLIENT_RIGHT_LABEL_W
  );
  const contentH = Math.max(leftH, rightH);
  const cardH = CLIENT_CARD_PAD_TOP + contentH + CLIENT_CARD_PAD_BOTTOM;

  drawCardWithSoftShadow(doc, MARGIN, y, CONTENT_W, cardH, {
    fill: WHITE,
    stroke: SLATE_200,
  });

  const rowY = y + CLIENT_CARD_PAD_TOP;
  drawClientColumn(doc, col1X, rowY, colWidth, CLIENT_LEFT_LABEL_W, fieldsLeft);
  drawClientColumn(
    doc,
    col2X,
    rowY,
    colWidth,
    CLIENT_RIGHT_LABEL_W,
    fieldsRight
  );

  return y + cardH + SECTION_AFTER_CARD_GAP;
}

function measureDesiredCardsRowHeight(
  doc: JsPDF,
  checklistW: number,
  hasPacote: boolean,
  pacoteItens: string[],
  inclusos: string[],
  isMensalidade = false
): number {
  let inclusosH = 0;
  if (isMensalidade) {
    inclusosH = measureMensalidadeBeneficiosBlockHeight(doc, checklistW);
  } else if (hasPacote) {
    inclusosH = measurePacoteCompletoInclusosBlockHeight(
      doc,
      checklistW,
      pacoteItens
    );
  } else if (inclusos.length > 0) {
    inclusosH = measureGenericInclusosCardHeight(doc, checklistW, inclusos);
  }

  const financeiroH = measureResumoFinanceiroCardHeight(isMensalidade);
  const hasInclusosCard = isMensalidade || hasPacote || inclusos.length > 0;
  return hasInclusosCard ? Math.max(inclusosH, financeiroH) : financeiroH;
}

/* ── Descrição da proposta ─────────────────────────────────────── */
function measureDescricaoPropostaHeight(
  doc: JsPDF,
  paragrafos: readonly string[]
): number {
  if (paragrafos.length === 0) return 0;

  const cardPadding = 4;
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
  paragrafos: readonly string[],
  layout: OrcamentoPdfLayout
): number {
  if (paragrafos.length === 0) return y;

  y = ensureSpace(
    doc,
    y,
    measureDescricaoPropostaHeight(doc, paragrafos) + 10,
    layout
  );
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

  return y + blockH + SECTION_AFTER_CARD_GAP;
}

/* ── Tabela de serviços ────────────────────────────────────────── */
function measureInclusosBlockHeight(
  doc: JsPDF,
  inclusos: string[],
  maxWidth: number
): number {
  if (inclusos.length === 0) return 0;

  let height = TABLE_NAME_INCLUI_GAP + TABLE_INCLUI_LABEL_H + TABLE_INCLUI_LIST_GAP;
  doc.setFontSize(TABLE_DETAIL_FONT);
  inclusos.forEach((line, index) => {
    if (index > 0) height += TABLE_INCLUSO_ITEM_GAP;
    const wrapped = doc.splitTextToSize(`• ${line}`, maxWidth);
    height += wrapped.length * TABLE_DETAIL_LINE_H;
  });
  return height + TABLE_ROW_BOTTOM_PAD;
}

function estimateServiceRowHeight(
  doc: JsPDF,
  item: OrcamentoItemRecord,
  servico: ServicoSstRecord | undefined,
  serviceColWidth: number
): number {
  const inclusos = resolveItensInclusosServico(servico, item.servico_nome);
  const listaInclusos = servicoListaInclusosNaTabela(
    servico?.nome ?? item.servico_nome
  );

  if (listaInclusos && inclusos.length > 0) {
    return (
      TABLE_ROW_TOP +
      TABLE_SERVICE_LINE_H +
      measureInclusosBlockHeight(doc, inclusos, serviceColWidth - 4)
    );
  }

  let h = 7;
  const descricao = servico?.descricao?.trim();
  if (descricao) {
    doc.setFontSize(TABLE_DETAIL_FONT);
    const lines = doc.splitTextToSize(descricao, serviceColWidth - 4);
    h += lines.length * TABLE_DETAIL_LINE_H + 1.5;
  }
  return h + TABLE_ROW_BOTTOM_PAD;
}

function drawServicesTable(
  doc: JsPDF,
  y: number,
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[],
  layout: OrcamentoPdfLayout
): number {
  const itens = [...(orcamento.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );
  if (itens.length === 0) return y;

  const colWidths = [98, 44, 40];
  const colStarts = [
    MARGIN,
    MARGIN + colWidths[0],
    MARGIN + colWidths[0] + colWidths[1],
  ];
  const headers = [
    "Serviço",
    "Quantidade de Colaboradores",
    labelValorColunaOrcamento(orcamento.modalidade),
  ];
  const tableHeadH = 12;

  const drawTableHead = (startY: number) => {
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, startY, CONTENT_W, tableHeadH, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...WHITE);
    doc.setFontSize(TABLE_HEAD_FONT);
    headers.forEach((header, index) => {
      const colW = colWidths[index] ?? 0;
      const headerY = startY + tableHeadH / 2 + 1;

      if (index === 1 || index === 2) {
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

      doc.text(header, colStarts[index] + 3, headerY, { align: "left" });
    });
    return startY + tableHeadH;
  };

  const firstRowH =
    itens.length > 0
      ? estimateServiceRowHeight(
          doc,
          itens[0],
          resolveCatalogoServico(itens[0], catalogo),
          colWidths[0]
        )
      : 0;
  y = ensureSpace(doc, y, tableHeadH + firstRowH + 2, layout);
  y = drawTableHead(y);

  itens.forEach((item, index) => {
    const servico = resolveCatalogoServico(item, catalogo);
    const inclusos = resolveItensInclusosServico(servico, item.servico_nome);
    const listaInclusos = servicoListaInclusosNaTabela(
      servico?.nome ?? item.servico_nome
    );
    const rowH = estimateServiceRowHeight(
      doc,
      item,
      servico,
      colWidths[0]
    );

    const pagesBefore = doc.getNumberOfPages();
    y = ensureSpace(doc, y, rowH + 2, layout);
    if (doc.getNumberOfPages() !== pagesBefore) {
      y = drawTableHead(y);
    }

    if (index % 2 === 0) {
      doc.setFillColor(...SLATE_50);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(TABLE_SERVICE_FONT);
    doc.setTextColor(...SLATE_900);
    doc.text(item.servico_nome, colStarts[0] + 3, y + TABLE_ROW_TOP);

    let detailY = y + TABLE_ROW_TOP + TABLE_SERVICE_LINE_H + TABLE_NAME_INCLUI_GAP;
    if (listaInclusos && inclusos.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(TABLE_DETAIL_FONT);
      doc.setTextColor(...SLATE_500);
      doc.text(
        labelItensInclusosServico(servico?.nome ?? item.servico_nome),
        colStarts[0] + 3,
        detailY
      );
      detailY += TABLE_INCLUI_LABEL_H + TABLE_INCLUI_LIST_GAP;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(TABLE_DETAIL_FONT);
      inclusos.forEach((line, itemIndex) => {
        if (itemIndex > 0) detailY += TABLE_INCLUSO_ITEM_GAP;
        const wrapped = doc.splitTextToSize(`• ${line}`, colWidths[0] - 4);
        doc.text(wrapped, colStarts[0] + 3, detailY);
        detailY += wrapped.length * TABLE_DETAIL_LINE_H;
      });
    } else {
      const descricao = servico?.descricao?.trim();
      if (descricao) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(TABLE_DETAIL_FONT);
        doc.setTextColor(...SLATE_500);
        const lines = doc.splitTextToSize(descricao, colWidths[0] - 4);
        doc.text(lines, colStarts[0] + 3, detailY);
      }
    }

    const valueY = y + 5;
    doc.setFontSize(TABLE_CELL_FONT);
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
      isOrcamentoMensalidade(orcamento.modalidade)
        ? formatValorMensalidade(resolveItemValorServico(item))
        : formatCurrency(resolveItemValorServico(item)),
      colStarts[2] + colWidths[2] / 2,
      valueY,
      { align: "center" }
    );

    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH);
    y += rowH;
  });

  doc.setDrawColor(...SLATE_200);
  doc.roundedRect(MARGIN, y - 0.5, CONTENT_W, 0.5, 0, 0, "S");

  return (
    y +
    (isOrcamentoMensalidade(orcamento.modalidade)
      ? CARDS_AFTER_TABLE_GAP_MENSAL
      : CARDS_AFTER_TABLE_GAP)
  );
}

/* ── Resumo financeiro + checklist (lado a lado) ─────────────────── */
function drawFinancialAndInclusosRow(
  doc: JsPDF,
  y: number,
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[],
  inclusos: string[],
  layout: OrcamentoPdfLayout
): number {
  const isMensalidade = isOrcamentoMensalidade(orcamento.modalidade);
  const usaCardInclusosEstruturado = orcamentoUsaCardInclusosEstruturado(
    orcamento,
    catalogo
  );
  const boxW = 88;
  const gap = 5;
  const checklistW = CONTENT_W - boxW - gap;
  const boxX = MARGIN + CONTENT_W - boxW;

  const pacoteInclusosItens =
    !isMensalidade && usaCardInclusosEstruturado
      ? buildPacoteCompletoInclusosItens(orcamento)
      : [];

  const desiredH = measureDesiredCardsRowHeight(
    doc,
    checklistW,
    usaCardInclusosEstruturado,
    pacoteInclusosItens,
    inclusos,
    isMensalidade
  );
  const { cardH } = resolveCardsBlockPlacement(y, desiredH);
  y = ensureSpace(doc, y, cardH, layout);

  if (isMensalidade) {
    drawMensalidadeBeneficiosBlock(doc, MARGIN, y, checklistW, cardH);
  } else if (usaCardInclusosEstruturado) {
    drawPacoteCompletoInclusosBlock(
      doc,
      MARGIN,
      y,
      checklistW,
      cardH,
      pacoteInclusosItens
    );
  } else if (inclusos.length > 0) {
    drawGenericInclusosCard(doc, MARGIN, y, checklistW, cardH, inclusos);
  }

  drawResumoFinanceiroCard(doc, boxX, y, boxW, cardH, orcamento);

  return y + cardH + SECTION_AFTER_CARD_GAP;
}

/* ── Observações ───────────────────────────────────────────────── */
function drawObservacoesCard(
  doc: JsPDF,
  y: number,
  texto: string,
  layout: OrcamentoPdfLayout
): number {
  const trimmed = texto.trim();
  if (!trimmed) return y;

  doc.setFontSize(7.5);
  const lines = doc.splitTextToSize(trimmed, CONTENT_W - 12);
  const blockH = lines.length * 3.8 + 10;

  y = ensureSpace(doc, y, blockH + 6, layout);
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
  drawNavarroPremiumFooter(doc, {
    pageNumber,
    totalPages,
    pageWidth: PAGE_W,
    pageHeight: PAGE_H,
    margin: MARGIN,
    contentWidth: CONTENT_W,
    navarro: NAVARRO,
  });
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
export function drawOrcamentoPdfDocument(
  doc: JsPDF,
  orcamento: OrcamentoComItens,
  options: {
    catalogo: ServicoSstRecord[];
    clienteInfo?: ClientePdfInfo;
    logo?: LogoAsset | null;
    symbolWatermark?: LogoAsset | null;
    GState?: new (opts: { opacity: number }) => object;
  }
): void {
  const layout: OrcamentoPdfLayout = {
    logo: options.logo ?? null,
    orcamento,
  };
  const clienteInfo = options.clienteInfo ?? {
    cnpj: displayValue(orcamento.cliente_cnpj),
    endereco: displayValue(orcamento.cliente_endereco),
    setor: displayValue(orcamento.cliente_setor),
  };
  const inclusos = collectAllInclusos(orcamento, options.catalogo);
  const startPage = doc.getNumberOfPages();

  let y = drawHeader(doc, layout.logo, orcamento);
  y = drawClientCard(doc, y, orcamento, clienteInfo);

  const watermarkYTop = y;
  y = drawDescricaoProposta(
    doc,
    y,
    resolveDescricaoPropostaParagrafos(orcamento.modalidade),
    layout
  );
  y = drawServicesTable(doc, y, orcamento, options.catalogo, layout);
  const afterTablePage = doc.getNumberOfPages();
  const afterTableY = y;

  y = drawFinancialAndInclusosRow(
    doc,
    y,
    orcamento,
    options.catalogo,
    inclusos,
    layout
  );
  drawObservacoesCard(doc, y, orcamento.observacoes ?? "", layout);

  if (options.symbolWatermark && options.GState) {
    doc.setPage(startPage);
    const watermarkBottom =
      afterTablePage === startPage
        ? Math.min(afterTableY, CONTENT_BOTTOM_Y)
        : CONTENT_BOTTOM_Y;
    drawNavarroWatermarkOverlay(
      doc,
      options.symbolWatermark,
      watermarkYTop,
      watermarkBottom,
      options.GState
    );
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, totalPages);
  }
}

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

  drawOrcamentoPdfDocument(doc, orcamento, {
    catalogo,
    clienteInfo,
    logo,
    symbolWatermark,
    GState,
  });

  doc.save(buildFilename(orcamento));
}
