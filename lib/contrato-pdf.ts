import { jsPDF } from "jspdf";
import { formatCNPJ } from "@/lib/cnpj";
import { dataPorExtensoPtBr } from "@/lib/extenso";
import {
  NAVARRO_CONTRATO_INSTITUCIONAL,
  rotuloClausulaContrato,
  type ContratoClausula,
} from "@/lib/contrato-navarro";
import {
  CONTRATO_AET_FECHO,
  NAVARRO_CONTRATO_AET,
} from "@/lib/contrato-aet";
import type { ContratoNavarroDocumento } from "@/lib/contrato-modelo";
import {
  calcPdfContentBottomY,
  drawNavarroPremiumFooter,
} from "@/lib/pdf-navarro-footer";

const NAVY: [number, number, number] = [8, 43, 99];
const GOLD: [number, number, number] = [201, 151, 43];
const WHITE: [number, number, number] = [255, 255, 255];
const SLATE_700: [number, number, number] = [51, 65, 85];
const SLATE_900: [number, number, number] = [15, 23, 42];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 26;
const BODY_START = MARGIN + HEADER_H + 4;
const TITLE_GAP = 3.2;
const PARA_LINE_H = 4.4;
const CLAUSE_GAP = 4.2;
const LOGO_MAX_MM = 22;
const LOGO_MAX_H_MM = 17;
const LOGO_TITLE_GAP_MM = 4;
const LOGO_CORNER_RADIUS_MM = 1.2;
const OPENING_TITLE_SIZE = 12.5;
const OPENING_TITLE_LINE_H = 6.2;
const OPENING_TITLE_BOTTOM_GAP = 8;
const AET_BULLET_R = 0.55;
const AET_BULLET_GAP = 2.2;
const AET_BULLET_INDENT = AET_BULLET_R * 2 + AET_BULLET_GAP;

function isContratoAet(documento: ContratoNavarroDocumento): boolean {
  return documento.tipoDocumento === "aet";
}

function estiloClausula(documento: ContratoNavarroDocumento): "sst" | "aet" {
  return isContratoAet(documento) ? "aet" : "sst";
}

type JsPDFDoc = InstanceType<typeof jsPDF>;
type LogoAsset = { dataUrl: string; width: number; height: number };

function sanitizarTrechoArquivo(value: string, fallback: string): string {
  const cleaned = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned.slice(0, 80) || fallback;
}

/** Número do orçamento: mantém hífens (ex.: ORC-2026-0007). */
function sanitizarNumeroOrcamentoArquivo(value: string): string {
  const cleaned = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned.slice(0, 40) || "Orcamento";
}

export function nomeArquivoContratoNavarro(
  numero: string,
  clienteNome: string,
  tipoDocumento?: ContratoNavarroDocumento["tipoDocumento"]
): string {
  const cliente = sanitizarTrechoArquivo(clienteNome, "Cliente");
  const orc = sanitizarNumeroOrcamentoArquivo(numero);
  if (tipoDocumento === "aet") {
    return `Contrato_Navarro_AET_${cliente}_${orc}.pdf`;
  }
  return `Contrato_Navarro_${cliente}_${orc}.pdf`;
}

function logoDisplaySize(pixelW: number, pixelH: number): { w: number; h: number } {
  const ratio = pixelH / Math.max(pixelW, 1);
  let w = LOGO_MAX_MM;
  let h = w * ratio;
  if (h > LOGO_MAX_H_MM) {
    h = LOGO_MAX_H_MM;
    w = h / ratio;
  }
  return { w, h };
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

function applyLogoRoundedBackground(
  img: HTMLImageElement,
  radiusPx: number
): string | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

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

async function loadLogoAsset(): Promise<LogoAsset | null> {
  if (typeof fetch !== "function" || typeof document === "undefined") return null;
  try {
    const response = await fetch("/logo-navarro.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("logo load failed"));
      image.src = objectUrl;
    });
    const dims = { w: img.naturalWidth, h: img.naturalHeight };
    URL.revokeObjectURL(objectUrl);
    const display = logoDisplaySize(dims.w, dims.h);
    const radiusPx = (LOGO_CORNER_RADIUS_MM * dims.w) / Math.max(display.w, 0.01);
    const dataUrl = applyLogoRoundedBackground(img, radiusPx);
    if (!dataUrl) return null;
    return {
      dataUrl,
      width: dims.w,
      height: dims.h,
    };
  } catch {
    return null;
  }
}

function drawHeader(
  doc: JsPDFDoc,
  documento: ContratoNavarroDocumento,
  logo: LogoAsset | null
): void {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, HEADER_H, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, HEADER_H, PAGE_W, 0.9, "F");

  let textX = MARGIN;
  if (logo) {
    const { w, h } = logoDisplaySize(logo.width, logo.height);
    const logoY = (HEADER_H - h) / 2;
    try {
      doc.addImage(logo.dataUrl, "PNG", MARGIN, logoY, w, h);
      textX = MARGIN + w + LOGO_TITLE_GAP_MM;
    } catch {
      textX = MARGIN;
    }
  }

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  if (isContratoAet(documento)) {
    doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS", textX, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Análise Ergonômica do Trabalho – AET", textX, 16);
  } else {
    doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", textX, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Saúde e Segurança do Trabalho", textX, 16);
  }

  doc.setFontSize(8);
  doc.text(`Proposta nº ${documento.numeroOrcamento}`, PAGE_W - MARGIN, 11, {
    align: "right",
  });
  const [y, m, d] = documento.dataContrato.split("-");
  doc.text(`Data: ${d}/${m}/${y}`, PAGE_W - MARGIN, 16, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(
    isContratoAet(documento)
      ? "Serviço: Laudo AET"
      : documento.modalidade === "mensalidade"
        ? "Modalidade: Mensalidade"
        : "Modalidade: Pontual",
    PAGE_W - MARGIN,
    21,
    { align: "right" }
  );
}

function paintFooters(doc: JsPDFDoc, totalPages: number): void {
  const navarro = {
    telefone: NAVARRO_CONTRATO_INSTITUCIONAL.telefone,
    whatsapp: NAVARRO_CONTRATO_INSTITUCIONAL.whatsapp,
    email: NAVARRO_CONTRATO_INSTITUCIONAL.email,
    site: NAVARRO_CONTRATO_INSTITUCIONAL.site,
    agradecimento: NAVARRO_CONTRATO_INSTITUCIONAL.agradecimento,
  };
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    drawNavarroPremiumFooter(doc, {
      pageNumber: i,
      totalPages,
      pageWidth: PAGE_W,
      pageHeight: PAGE_H,
      margin: MARGIN,
      contentWidth: CONTENT_W,
      navarro,
    });
  }
}

function paragraphLines(doc: JsPDFDoc, text: string): string[] {
  return doc.splitTextToSize(text, CONTENT_W) as string[];
}

function itemLines(doc: JsPDFDoc, text: string): string[] {
  return doc.splitTextToSize(text, CONTENT_W - AET_BULLET_INDENT) as string[];
}

function clauseBlockHeight(
  doc: JsPDFDoc,
  clause: ContratoClausula,
  estilo: "sst" | "aet" = "sst"
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const titleLines = paragraphLines(
    doc,
    rotuloClausulaContrato(clause, estilo)
  );
  let h = titleLines.length * 5 + TITLE_GAP;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  for (const p of clause.paragrafos) {
    const lines = paragraphLines(doc, p);
    h += lines.length * PARA_LINE_H + 2.2;
  }
  for (const item of clause.itens ?? []) {
    const lines = itemLines(doc, item);
    h += lines.length * PARA_LINE_H + 1.6;
  }
  return h;
}

function qualificacaoBlockHeight(
  doc: JsPDFDoc,
  qualificacao: { titulo: string; paragrafos: string[] }
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  let h = paragraphLines(doc, qualificacao.titulo).length * 5 + TITLE_GAP;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  for (const p of qualificacao.paragrafos) {
    h += paragraphLines(doc, p).length * PARA_LINE_H + 2.2;
  }
  return h + CLAUSE_GAP;
}

function signatureBlockHeight(aet: boolean): number {
  return aet ? 92 : 78;
}

function drawOpeningTitle(
  doc: JsPDFDoc,
  startY: number,
  linhas: string[]
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(OPENING_TITLE_SIZE);
  doc.setTextColor(...NAVY);
  let y = startY;
  const centerX = PAGE_W / 2;
  for (const line of linhas) {
    const wrapped = paragraphLines(doc, line);
    for (const wrappedLine of wrapped) {
      doc.text(wrappedLine, centerX, y, { align: "center" });
      y += OPENING_TITLE_LINE_H;
    }
  }
  return y + OPENING_TITLE_BOTTOM_GAP;
}

function drawAetBullet(doc: JsPDFDoc, x: number, baselineY: number): void {
  doc.setFillColor(...NAVY);
  doc.circle(x + AET_BULLET_R, baselineY - 1.15, AET_BULLET_R, "F");
}

export function drawContratoPdfDocument(
  doc: JsPDFDoc,
  documento: ContratoNavarroDocumento,
  logo: LogoAsset | null
): void {
  const contentBottom = calcPdfContentBottomY(PAGE_H, 2);
  const aet = isContratoAet(documento);
  const estilo = estiloClausula(documento);

  const addPage = (): number => {
    doc.addPage();
    drawHeader(doc, documento, logo);
    return BODY_START;
  };

  const ensure = (y: number, needed: number): number => {
    if (y + needed <= contentBottom) return y;
    return addPage();
  };

  drawHeader(doc, documento, logo);
  let y = drawOpeningTitle(
    doc,
    BODY_START,
    documento.tituloLinhas?.length
      ? documento.tituloLinhas
      : [
          "INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS",
          "DE SAÚDE E SEGURANÇA DO TRABALHO",
        ]
  );

  if (documento.qualificacao) {
    y = ensure(y, qualificacaoBlockHeight(doc, documento.qualificacao));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    const qTitle = paragraphLines(doc, documento.qualificacao.titulo);
    doc.text(qTitle, MARGIN, y);
    y += qTitle.length * 5 + TITLE_GAP;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_700);
    for (const paragrafo of documento.qualificacao.paragrafos) {
      const lines = paragraphLines(doc, paragrafo);
      for (const line of lines) {
        if (y + PARA_LINE_H > contentBottom) y = addPage();
        doc.text(line, MARGIN, y);
        y += PARA_LINE_H;
      }
      y += 2.2;
    }
    y += CLAUSE_GAP;
  }

  for (let i = 0; i < documento.clausulas.length; i += 1) {
    const clause = documento.clausulas[i];
    const isLast = i === documento.clausulas.length - 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const title = rotuloClausulaContrato(clause, estilo);
    const titleLines = paragraphLines(doc, title);
    const titleH = titleLines.length * 5;
    const minBlock = isLast
      ? clauseBlockHeight(doc, clause, estilo) + signatureBlockHeight(aet)
      : titleH + PARA_LINE_H * 3;
    y = ensure(y, minBlock);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(titleLines, MARGIN, y);
    y += titleH + TITLE_GAP;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_700);
    for (const paragrafo of clause.paragrafos) {
      const lines = paragraphLines(doc, paragrafo);
      const remainingInPara = (start: number) =>
        (lines.length - start) * PARA_LINE_H;
      for (let li = 0; li < lines.length; li += 1) {
        const tailH = remainingInPara(li);
        const tailFits = y + tailH <= contentBottom;
        const nearEnd = lines.length - li <= 3;
        if (y + PARA_LINE_H > contentBottom) {
          y = addPage();
        } else if (nearEnd && !tailFits && y > BODY_START + 8) {
          y = addPage();
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...SLATE_700);
        doc.text(lines[li], MARGIN, y);
        y += PARA_LINE_H;
      }
      y += 2.2;
    }

    for (const item of clause.itens ?? []) {
      const lines = itemLines(doc, item);
      if (y + PARA_LINE_H > contentBottom) y = addPage();
      drawAetBullet(doc, MARGIN, y);
      for (let li = 0; li < lines.length; li += 1) {
        if (y + PARA_LINE_H > contentBottom) y = addPage();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...SLATE_700);
        doc.text(lines[li], MARGIN + AET_BULLET_INDENT, y);
        y += PARA_LINE_H;
      }
      y += 1.6;
    }
    y += CLAUSE_GAP;
  }

  y = ensure(y, signatureBlockHeight(aet));
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(
    aet
      ? CONTRATO_AET_FECHO
      : "E por estarem justas e contratadas, as partes assinam o presente instrumento.",
    MARGIN,
    y,
    { maxWidth: CONTENT_W }
  );
  y += aet ? 10 : 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_900);
  doc.text(`São Paulo, ${dataPorExtensoPtBr(documento.dataContrato)}.`, MARGIN, y);
  y += 14;

  const colW = (CONTENT_W - 12) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 12;
  const lineY = y + 12;
  const contratadaRazao = aet
    ? NAVARRO_CONTRATO_AET.razaoSocial
    : NAVARRO_CONTRATO_INSTITUCIONAL.razaoSocial;
  const contratadaCnpj = aet
    ? NAVARRO_CONTRATO_AET.cnpj
    : NAVARRO_CONTRATO_INSTITUCIONAL.cnpj;

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.35);
  doc.line(leftX, lineY, leftX + colW, lineY);
  doc.line(rightX, lineY, rightX + colW, lineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text("CONTRATANTE", leftX + colW / 2, lineY + 5, { align: "center" });
  doc.text("CONTRATADA", rightX + colW / 2, lineY + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_700);
  const contratanteNome = doc.splitTextToSize(
    documento.contratante.razaoSocial,
    colW
  ) as string[];
  doc.text(contratanteNome, leftX + colW / 2, lineY + 9.5, { align: "center" });
  if (aet && documento.contratante.cnpj?.trim()) {
    doc.text(
      `CNPJ: ${formatCNPJ(documento.contratante.cnpj)}`,
      leftX + colW / 2,
      lineY + 9.5 + contratanteNome.length * 3.4,
      { align: "center" }
    );
  }
  const contratadaNome = doc.splitTextToSize(contratadaRazao, colW) as string[];
  doc.text(contratadaNome, rightX + colW / 2, lineY + 9.5, { align: "center" });
  doc.text(
    `CNPJ: ${contratadaCnpj}`,
    rightX + colW / 2,
    lineY + 9.5 + contratadaNome.length * 3.4,
    { align: "center" }
  );

  paintFooters(doc, doc.getNumberOfPages());
}

export async function gerarPdfContratoNavarro(
  documento: ContratoNavarroDocumento
): Promise<{
  blob: Blob;
  filename: string;
  pageCount: number;
  arrayBuffer: ArrayBuffer;
}> {
  const logo = await loadLogoAsset();
  const filename = nomeArquivoContratoNavarro(
    documento.numeroOrcamento,
    documento.contratante.razaoSocial,
    documento.tipoDocumento
  );
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: filename.replace(/\.pdf$/i, "") });
  drawContratoPdfDocument(doc, documento, logo);
  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  return {
    blob,
    filename,
    pageCount: doc.getNumberOfPages(),
    arrayBuffer,
  };
}

/** Usado em testes para estimar se a cláusula cabe na página. */
export function estimateContratoClauseHeight(
  clause: ContratoClausula
): number {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  return clauseBlockHeight(doc, clause);
}
