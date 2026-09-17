import { jsPDF } from "jspdf";
import { dataPorExtensoPtBr } from "@/lib/extenso";
import {
  NAVARRO_CONTRATO_INSTITUCIONAL,
  type ContratoClausula,
} from "@/lib/contrato-navarro";
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
const LOGO_MAX_MM = 16;

type JsPDFDoc = InstanceType<typeof jsPDF>;

type LogoAsset = { dataUrl: string; width: number; height: number };

function sanitizarNomeArquivo(value: string): string {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return cleaned || "Cliente";
}

export function nomeArquivoContratoNavarro(
  numero: string,
  clienteNome: string,
  versao?: number
): string {
  const cliente = sanitizarNomeArquivo(clienteNome);
  const v = versao && versao > 1 ? `-v${versao}` : "";
  return `Contrato-${numero}-${cliente}${v}.pdf`;
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
    const canvas = document.createElement("canvas");
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return {
      dataUrl: canvas.toDataURL("image/png"),
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
    const ratio = logo.height / Math.max(logo.width, 1);
    let w = LOGO_MAX_MM;
    let h = w * ratio;
    if (h > 12) {
      h = 12;
      w = h / ratio;
    }
    try {
      doc.addImage(logo.dataUrl, "PNG", MARGIN, 6.5, w, h);
      textX = MARGIN + w + 4;
    } catch {
      textX = MARGIN;
    }
  }

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", textX, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Saúde e Segurança do Trabalho", textX, 16);

  doc.setFontSize(8);
  doc.text(`Proposta nº ${documento.numeroOrcamento}`, PAGE_W - MARGIN, 11, {
    align: "right",
  });
  const [y, m, d] = documento.dataContrato.split("-");
  doc.text(`Data: ${d}/${m}/${y}`, PAGE_W - MARGIN, 16, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(
    documento.modalidade === "mensalidade" ? "Modalidade: Mensalidade" : "Modalidade: Pontual",
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

function clauseBlockHeight(doc: JsPDFDoc, clause: ContratoClausula): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const titleLines = paragraphLines(doc, `CLÁUSULA ${clause.numero} — ${clause.titulo}`);
  let h = titleLines.length * 5 + TITLE_GAP;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  for (const p of clause.paragrafos) {
    const lines = paragraphLines(doc, p);
    h += lines.length * PARA_LINE_H + 2.2;
  }
  return h;
}

function signatureBlockHeight(): number {
  return 78;
}

export function drawContratoPdfDocument(
  doc: JsPDFDoc,
  documento: ContratoNavarroDocumento,
  logo: LogoAsset | null
): void {
  const contentBottom = calcPdfContentBottomY(PAGE_H, 2);

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
  let y = BODY_START;

  for (let i = 0; i < documento.clausulas.length; i += 1) {
    const clause = documento.clausulas[i];
    const isLast = i === documento.clausulas.length - 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const title = `CLÁUSULA ${clause.numero} — ${clause.titulo}`;
    const titleLines = paragraphLines(doc, title);
    const titleH = titleLines.length * 5;
    const minBlock = isLast
      ? clauseBlockHeight(doc, clause) + signatureBlockHeight()
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
    y += CLAUSE_GAP;
  }

  y = ensure(y, signatureBlockHeight());
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("E por estarem justas e contratadas, as partes assinam o presente instrumento.", MARGIN, y, {
    maxWidth: CONTENT_W,
  });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_900);
  doc.text(`São Paulo, ${dataPorExtensoPtBr(documento.dataContrato)}.`, MARGIN, y);
  y += 14;

  const colW = (CONTENT_W - 12) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 12;
  const lineY = y + 12;

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
  const contratadaNome = doc.splitTextToSize(
    NAVARRO_CONTRATO_INSTITUCIONAL.razaoSocial,
    colW
  ) as string[];
  doc.text(contratadaNome, rightX + colW / 2, lineY + 9.5, { align: "center" });
  doc.text(
    `CNPJ ${NAVARRO_CONTRATO_INSTITUCIONAL.cnpj}`,
    rightX + colW / 2,
    lineY + 9.5 + contratadaNome.length * 3.4,
    { align: "center" }
  );

  paintFooters(doc, doc.getNumberOfPages());
}

export async function gerarPdfContratoNavarro(
  documento: ContratoNavarroDocumento,
  versao?: number
): Promise<{
  blob: Blob;
  filename: string;
  pageCount: number;
  arrayBuffer: ArrayBuffer;
}> {
  const logo = await loadLogoAsset();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawContratoPdfDocument(doc, documento, logo);
  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  return {
    blob,
    filename: nomeArquivoContratoNavarro(
      documento.numeroOrcamento,
      documento.contratante.razaoSocial,
      versao
    ),
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
