/**
 * PDF institucional do Mapa do Questionário COPSOQ II.
 * Fonte de dados: montarMapaQuestionarioCopsoq() — sem mapeamento paralelo.
 * Independente do gerador do relatório psicossocial (window.print).
 */

import { montarMapaQuestionarioCopsoq } from "@/lib/copsoq/mapa-questionario";
import type {
  MapaCategoriaCopsoq,
  MapaPerguntaCopsoq,
} from "@/lib/copsoq/mapa-questionario";
import {
  calcPdfContentBottomY,
  drawNavarroPremiumFooter,
} from "@/lib/pdf-navarro-footer";
import { RELATORIO_RODAPE_NAVARRO } from "@/lib/riscos-relatorio-rodape";

type JsPDF = import("jspdf").jsPDF;

const NAVY: [number, number, number] = [8, 43, 99];
const GOLD: [number, number, number] = [201, 151, 43];
const SLATE_200: [number, number, number] = [226, 232, 240];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_700: [number, number, number] = [51, 65, 85];
const WHITE: [number, number, number] = [255, 255, 255];
const TEAL_BG: [number, number, number] = [238, 246, 244];
const TEAL: [number, number, number] = [15, 118, 110];
const RISCO_BG: [number, number, number] = [241, 245, 249];
const RISCO_FG: [number, number, number] = [71, 85, 105];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_BOTTOM = calcPdfContentBottomY(PAGE_H);
const LOGO_PUBLIC_PATH = "/logo-navarro-relatorio-riscos.png";
const LOGO_FILE = "logo-navarro-relatorio-riscos.png";
const LOGO_MAX_W = 62;
const LOGO_MAX_H = 16;

const NAVARRO_FOOTER = {
  site: "www.navarroeng.com.br",
  email: "contato@navarroeng.com.br",
  telefone: "(11) 3181-7697",
  whatsapp: "(11) 97706-5599",
  agradecimento: RELATORIO_RODAPE_NAVARRO,
} as const;

const INTRO =
  "Este documento apresenta a organização das perguntas do Questionário COPSOQ II conforme as categorias utilizadas na avaliação de riscos psicossociais.";

const NOTA_OFENSIVOS =
  "Indicadores complementares avaliados separadamente das 10 categorias COPSOQ.";

export const NOME_ARQUIVO_MAPA_COPSOQ =
  "Mapa_Questionario_COPSOQ_II_Navarro.pdf";

export type MapaPdfPerguntaLayout = {
  id: string;
  ordem: number;
  numeroVisual: string;
  codigo: string;
  categoriaId: string;
  pagina: number;
};

export type MapaPdfCategoriaLayout = {
  id: string;
  nome: string;
  tipo: "RISCO" | "PROTECAO";
  paginaInicio: number;
  quantidade: number;
};

export type MapaPdfResultado = {
  filename: string;
  pageCount: number;
  blob: Blob;
  arrayBuffer: ArrayBuffer;
  perguntas: MapaPdfPerguntaLayout[];
  categorias: MapaPdfCategoriaLayout[];
  logoUtilizado: string;
};

type LogoAsset = { dataUrl: string; width: number; height: number };

function pngDims(bytes: Uint8Array): { w: number; h: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { w: view.getUint32(16), h: view.getUint32(20) };
}

function pngToDataUrl(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

function fitLogo(w: number, h: number): { width: number; height: number } {
  const ratio = w / h || 1;
  let width = LOGO_MAX_W;
  let height = width / ratio;
  if (height > LOGO_MAX_H) {
    height = LOGO_MAX_H;
    width = height * ratio;
  }
  return { width, height };
}

function logoFromBytes(bytes: Uint8Array): LogoAsset {
  const { w, h } = pngDims(bytes);
  const size = fitLogo(w, h);
  return { dataUrl: pngToDataUrl(bytes), ...size };
}

async function loadLogoAsset(): Promise<LogoAsset | null> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(LOGO_PUBLIC_PATH);
      if (res.ok) {
        return logoFromBytes(new Uint8Array(await res.arrayBuffer()));
      }
    } catch {
      return null;
    }
    return null;
  }

  try {
    const fs = await import(/* webpackIgnore: true */ "node:fs");
    const path = await import(/* webpackIgnore: true */ "node:path");
    const file = path.join(process.cwd(), "public", LOGO_FILE);
    if (!fs.existsSync(file)) return null;
    return logoFromBytes(new Uint8Array(fs.readFileSync(file)));
  } catch {
    return null;
  }
}

function labelQuantidade(n: number): string {
  return n === 1 ? "1 pergunta" : `${n} perguntas`;
}

function labelTipo(tipo: MapaCategoriaCopsoq["tipo"]): string {
  return tipo === "RISCO" ? "RISCO" : "PROTEÇÃO";
}

function linhasPergunta(
  doc: JsPDF,
  pergunta: MapaPerguntaCopsoq,
  textW: number
): string[] {
  return doc.splitTextToSize(pergunta.texto, textW) as string[];
}

function alturaPergunta(doc: JsPDF, pergunta: MapaPerguntaCopsoq): number {
  const badge = 8;
  const textW = CONTENT_W - badge - 3;
  const linhas = linhasPergunta(doc, pergunta, textW);
  const textoH = Math.max(linhas.length, 1) * 4.1;
  return Math.max(badge, 3.2 + textoH) + 4;
}

function alturaCabecalhoCategoria(): number {
  return 12;
}

function alturaBlocoOfensivosIntro(): number {
  return 14;
}

type Cursor = {
  doc: JsPDF;
  y: number;
  page: number;
  logo: LogoAsset | null;
};

function contentBottom(): number {
  return CONTENT_BOTTOM;
}

function novaPagina(cur: Cursor): void {
  cur.doc.addPage();
  cur.page += 1;
  cur.y = desenharCabecalhoContinuacao(cur.doc, cur.logo);
}

function garantirEspaco(cur: Cursor, altura: number): void {
  if (cur.y + altura <= contentBottom()) return;
  novaPagina(cur);
}

function desenharLinhaOuro(doc: JsPDF, y: number): number {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, y + 0.9, MARGIN + CONTENT_W, y + 0.9);
  return y + 3;
}

function desenharLogo(doc: JsPDF, logo: LogoAsset | null, x: number, y: number) {
  if (logo) {
    doc.addImage(logo.dataUrl, "PNG", x, y, logo.width, logo.height, undefined, "FAST");
    return;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("NAVARRO", x, y + 6);
}

function desenharCabecalhoPrimeira(
  doc: JsPDF,
  logo: LogoAsset | null,
  totais: { perguntas: number; categoriasAvaliadas: number; indicadoresOfensivos: number }
): number {
  let y = MARGIN;
  desenharLogo(doc, logo, MARGIN, y);
  y += (logo?.height ?? 8) + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text("Mapa do Questionário COPSOQ II", MARGIN, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_500);
  const sub = doc.splitTextToSize(
    "Relação das perguntas por categoria da avaliação de riscos psicossociais",
    CONTENT_W
  ) as string[];
  doc.text(sub, MARGIN, y);
  y += sub.length * 4 + 2;
  y = desenharLinhaOuro(doc, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_700);
  const intro = doc.splitTextToSize(INTRO, CONTENT_W) as string[];
  doc.text(intro, MARGIN, y);
  y += intro.length * 4.2 + 3.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text(
    `${totais.perguntas} perguntas  ·  ${totais.categoriasAvaliadas} categorias avaliadas  ·  ${totais.indicadoresOfensivos} indicadores complementares de comportamentos ofensivos`,
    MARGIN,
    y
  );
  return y + 7;
}

function desenharCabecalhoContinuacao(doc: JsPDF, logo: LogoAsset | null): number {
  let y = MARGIN;
  const logoH = logo ? Math.min(logo.height, 10) : 8;
  const logoW = logo ? (logo.width / logo.height) * logoH : 28;
  if (logo) {
    doc.addImage(logo.dataUrl, "PNG", MARGIN, y, logoW, logoH, undefined, "FAST");
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text("NAVARRO", MARGIN, y + 6);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text("Mapa do Questionário COPSOQ II", PAGE_W - MARGIN, y + logoH - 2, {
    align: "right",
  });
  y += logoH + 3;
  return desenharLinhaOuro(doc, y);
}

function desenharCabecalhoCategoria(
  cur: Cursor,
  categoria: MapaCategoriaCopsoq
): void {
  const { doc, y } = cur;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(categoria.nome.toUpperCase(), MARGIN, y + 4);

  const tipo = labelTipo(categoria.tipo);
  const qtd = labelQuantidade(categoria.perguntas.length);
  const badgeW = doc.getTextWidth(tipo) + 4;
  const badgeY = y + 6.2;
  const isRisco = categoria.tipo === "RISCO";
  doc.setFillColor(...(isRisco ? RISCO_BG : TEAL_BG));
  doc.roundedRect(MARGIN, badgeY, badgeW, 4.4, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...(isRisco ? RISCO_FG : TEAL));
  doc.text(tipo, MARGIN + 2, badgeY + 3.1);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_500);
  doc.text(`·  ${qtd}`, MARGIN + badgeW + 2, badgeY + 3.1);

  cur.y = y + alturaCabecalhoCategoria();
}

function desenharPergunta(cur: Cursor, pergunta: MapaPerguntaCopsoq): void {
  const { doc } = cur;
  const h = alturaPergunta(doc, pergunta);
  garantirEspaco(cur, h);

  const y = cur.y;
  const badge = 8;
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y, badge, badge, 1.2, 1.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(pergunta.numeroVisual, MARGIN + badge / 2, y + 5.3, {
    align: "center",
  });

  const tx = MARGIN + badge + 3;
  const textW = CONTENT_W - badge - 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_500);
  doc.text(`Código COPSOQ ${pergunta.codigo}`, tx, y + 3.1);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_700);
  const linhas = linhasPergunta(doc, pergunta, textW);
  doc.text(linhas, tx, y + 7.4);

  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + h - 1.2, MARGIN + CONTENT_W, y + h - 1.2);

  cur.y = y + h;
}

function desenharCategoria(
  cur: Cursor,
  categoria: MapaCategoriaCopsoq,
  extras: { beforeHeader?: number } ,
  layoutCategorias: MapaPdfCategoriaLayout[],
  layoutPerguntas: MapaPdfPerguntaLayout[]
): void {
  const primeira = categoria.perguntas[0];
  const extra = extras.beforeHeader ?? 0;
  const keep =
    extra +
    alturaCabecalhoCategoria() +
    (primeira ? alturaPergunta(cur.doc, primeira) : 0);
  garantirEspaco(cur, keep);

  if (extra > 0) {
    cur.doc.setFont("helvetica", "bold");
    cur.doc.setFontSize(7.5);
    cur.doc.setTextColor(...SLATE_500);
    cur.doc.text("INDICADORES COMPLEMENTARES", MARGIN, cur.y + 3);
    cur.doc.setFont("helvetica", "normal");
    cur.doc.setFontSize(8);
    cur.doc.setTextColor(...SLATE_700);
    const nota = cur.doc.splitTextToSize(NOTA_OFENSIVOS, CONTENT_W) as string[];
    cur.doc.text(nota, MARGIN, cur.y + 7.5);
    cur.y += extra;
  }

  layoutCategorias.push({
    id: categoria.id,
    nome: categoria.nome,
    tipo: categoria.tipo,
    paginaInicio: cur.page,
    quantidade: categoria.perguntas.length,
  });

  desenharCabecalhoCategoria(cur, categoria);

  for (const pergunta of categoria.perguntas) {
    desenharPergunta(cur, pergunta);
    layoutPerguntas.push({
      id: pergunta.id,
      ordem: pergunta.ordem,
      numeroVisual: pergunta.numeroVisual,
      codigo: pergunta.codigo,
      categoriaId: categoria.id,
      pagina: cur.page,
    });
  }

  cur.y += 3.5;
}

function desenharRodapes(doc: JsPDF, totalPages: number): void {
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    drawNavarroPremiumFooter(doc, {
      pageNumber: i,
      totalPages,
      pageWidth: PAGE_W,
      pageHeight: PAGE_H,
      margin: MARGIN,
      contentWidth: CONTENT_W,
      navarro: NAVARRO_FOOTER,
    });
  }
}

export async function gerarPdfMapaQuestionarioCopsoq(): Promise<MapaPdfResultado> {
  const { jsPDF } = await import("jspdf");
  const mapa = montarMapaQuestionarioCopsoq();
  const logo = await loadLogoAsset();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setProperties({
    title: "Mapa do Questionário COPSOQ II",
    author: RELATORIO_RODAPE_NAVARRO,
    subject: "Perguntas por categoria da avaliação de riscos psicossociais",
  });

  const cur: Cursor = {
    doc,
    y: desenharCabecalhoPrimeira(doc, logo, mapa.totais),
    page: 1,
    logo,
  };

  const layoutCategorias: MapaPdfCategoriaLayout[] = [];
  const layoutPerguntas: MapaPdfPerguntaLayout[] = [];

  for (const categoria of mapa.categoriasAvaliadas) {
    desenharCategoria(cur, categoria, {}, layoutCategorias, layoutPerguntas);
  }

  if (mapa.comportamentosOfensivos) {
    cur.y += 2;
    desenharCategoria(
      cur,
      mapa.comportamentosOfensivos,
      { beforeHeader: alturaBlocoOfensivosIntro() },
      layoutCategorias,
      layoutPerguntas
    );
  }

  const pageCount = doc.getNumberOfPages();
  desenharRodapes(doc, pageCount);

  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  return {
    filename: NOME_ARQUIVO_MAPA_COPSOQ,
    pageCount,
    blob,
    arrayBuffer,
    perguntas: layoutPerguntas,
    categorias: layoutCategorias,
    logoUtilizado: logo ? LOGO_PUBLIC_PATH : "(fallback texto NAVARRO)",
  };
}

export async function exportarPdfMapaQuestionarioCopsoq(): Promise<
  Pick<MapaPdfResultado, "filename" | "pageCount">
> {
  const out = await gerarPdfMapaQuestionarioCopsoq();
  if (typeof window !== "undefined") {
    const url = URL.createObjectURL(out.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = out.filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  return { filename: out.filename, pageCount: out.pageCount };
}
