import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCurrency } from "@/lib/money";
import { formatOrcamentoStatus } from "@/lib/orcamento-filters";
import type {
  OrcamentoComItens,
  OrcamentoItemRecord,
  ServicoSstRecord,
} from "@/lib/orcamento-types";
import { resolveItensInclusosServico } from "@/lib/servico-sst-pacote";
import { listarServicosSst } from "@/services/servico-sst.service";

const NAVY: [number, number, number] = [8, 43, 99];
const GOLD: [number, number, number] = [201, 151, 43];
const GOLD_LIGHT: [number, number, number] = [232, 210, 158];
const WHITE: [number, number, number] = [255, 255, 255];
const MUTED: [number, number, number] = [100, 116, 139];
const ROW_BORDER: [number, number, number] = [231, 234, 240];

const MARGIN = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

const NAVARRO = {
  site: "www.navarroeng.com.br",
  email: "contato@navarroeng.com.br",
  telefone: "(11) 3181-7697",
  whatsapp: "(11) 97706-5599",
} as const;

type JsPDF = import("jspdf").jsPDF;

interface LogoAsset {
  dataUrl: string;
  width: number;
  height: number;
}

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

    const maxMm = 22;
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

function drawHeader(doc: JsPDF, logo: LogoAsset | null, y: number): number {
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CONTENT_W, 42, "F");

  doc.setFillColor(...GOLD);
  doc.triangle(
    MARGIN + CONTENT_W * 0.62,
    y,
    MARGIN + CONTENT_W,
    y,
    MARGIN + CONTENT_W,
    y + 42,
    "F"
  );

  const logoX = MARGIN + 6;
  const logoY = y + 10;
  if (logo) {
    doc.addImage(logo.dataUrl, "PNG", logoX, logoY, logo.width, logo.height);
  } else {
    doc.setTextColor(...WHITE);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("NAVARRO", logoX, logoY + 8);
  }

  doc.setTextColor(...GOLD_LIGHT);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(NAVARRO.site, MARGIN + CONTENT_W - 6, y + 14, { align: "right" });
  doc.text(NAVARRO.email, MARGIN + CONTENT_W - 6, y + 20, { align: "right" });
  doc.text(NAVARRO.telefone, MARGIN + CONTENT_W - 6, y + 26, { align: "right" });

  doc.setTextColor(...WHITE);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PROPOSTA COMERCIAL SST", MARGIN + 6, y + 36);

  return y + 50;
}

function drawInfoBlock(
  doc: JsPDF,
  y: number,
  orcamento: OrcamentoComItens
): number {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 34, 2, 2, "F");
  doc.setDrawColor(...ROW_BORDER);
  doc.roundedRect(MARGIN, y, CONTENT_W, 34, 2, 2, "S");

  const leftX = MARGIN + 6;
  const rightX = MARGIN + CONTENT_W / 2 + 4;
  let rowY = y + 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);

  const fieldsLeft = [
    ["Proposta nº", orcamento.numero],
    ["Data", formatDateIsoToBR(orcamento.data_proposta)],
    ["Cliente", orcamento.cliente_nome],
    ["Contato", orcamento.contato ?? "—"],
  ];

  const fieldsRight = [
    ["E-mail", orcamento.email ?? "—"],
    ["Telefone", orcamento.telefone ?? "—"],
    ["Responsável Navarro", orcamento.responsavel],
    ["Validade", formatDateIsoToBR(orcamento.validade_proposta) || "—"],
  ];

  fieldsLeft.forEach(([label, value], index) => {
    const lineY = rowY + index * 7;
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, leftX, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(String(value).slice(0, 48), leftX + 28, lineY);
    doc.setTextColor(...NAVY);
  });

  fieldsRight.forEach(([label, value], index) => {
    const lineY = rowY + index * 7;
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, rightX, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(String(value).slice(0, 48), rightX + 34, lineY);
    doc.setTextColor(...NAVY);
  });

  return y + 42;
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

function estimatePdfRowHeight(
  doc: JsPDF,
  inclusos: string[],
  serviceColWidth: number
): number {
  const baseHeight = 8;
  if (inclusos.length === 0) return baseHeight;
  return baseHeight + measureInclusosBlockHeight(doc, inclusos, serviceColWidth - 4);
}

function drawItemsTable(
  doc: JsPDF,
  y: number,
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[]
): number {
  const itens = [...(orcamento.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Serviços propostos", MARGIN, y);
  y += 6;

  const colWidths = [78, 22, 32, 32];
  const headers = ["Serviço", "Qtd.", "Valor unit.", "Total"];
  const headY = y;

  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, headY, CONTENT_W, 9, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);

  let colX = MARGIN + 3;
  headers.forEach((header, index) => {
    doc.text(header, colX, headY + 6);
    colX += colWidths[index] ?? 0;
  });

  y = headY + 9;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);

  itens.forEach((item, index) => {
    const servico = resolveCatalogoServico(item, catalogo);
    const inclusos = resolveItensInclusosServico(servico, item.servico_nome);
    const serviceColWidth = colWidths[0] ?? 78;
    const rowH = estimatePdfRowHeight(doc, inclusos, serviceColWidth);

    if (y + rowH > 270) {
      doc.addPage();
      y = MARGIN + 10;
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(item.servico_nome, MARGIN + 3, y + 4.5);

    let detailY = y + 8;
    if (inclusos.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text("Inclui:", MARGIN + 3, detailY);
      detailY += 3.5;

      doc.setFont("helvetica", "normal");
      inclusos.forEach((line) => {
        const wrapped = doc.splitTextToSize(`• ${line}`, serviceColWidth - 4);
        doc.text(wrapped, MARGIN + 3, detailY);
        detailY += wrapped.length * 3.2;
      });
    }

    const valueY = y + 5.5;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);

    let colX = MARGIN + 3 + serviceColWidth;
    doc.text(String(item.quantidade), colX, valueY);
    colX += colWidths[1] ?? 0;
    doc.text(formatCurrency(Number(item.valor_unitario)), colX, valueY);
    colX += colWidths[2] ?? 0;
    doc.text(formatCurrency(Number(item.valor_total)), colX, valueY);

    doc.setDrawColor(...ROW_BORDER);
    doc.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH);
    y += rowH;
  });

  return y + 4;
}

function drawTotals(doc: JsPDF, y: number, orcamento: OrcamentoComItens): number {
  const boxW = 78;
  const boxX = MARGIN + CONTENT_W - boxW;

  doc.setFillColor(252, 246, 232);
  doc.roundedRect(boxX, y, boxW, 28, 2, 2, "F");
  doc.setDrawColor(...GOLD);
  doc.roundedRect(boxX, y, boxW, 28, 2, 2, "S");

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Subtotal", boxX + 4, y + 8);
  doc.text("Desconto", boxX + 4, y + 15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Valor total", boxX + 4, y + 23);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(Number(orcamento.subtotal)), boxX + boxW - 4, y + 8, {
    align: "right",
  });
  doc.text(
    `${Number(orcamento.desconto_percentual).toFixed(2).replace(".", ",")}%`,
    boxX + boxW - 4,
    y + 15,
    { align: "right" }
  );
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(
    formatCurrency(Number(orcamento.valor_total)),
    boxX + boxW - 4,
    y + 23,
    { align: "right" }
  );

  return y + 36;
}

function drawConditions(doc: JsPDF, y: number, orcamento: OrcamentoComItens): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Condições comerciais", MARGIN, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);

  const lines = [
    `Forma de pagamento: ${orcamento.forma_pagamento?.trim() || "A combinar"}`,
    `Validade da proposta: ${formatDateIsoToBR(orcamento.validade_proposta) || "30 dias"}`,
    `Status: ${formatOrcamentoStatus(orcamento.status)}`,
  ];

  lines.forEach((line) => {
    doc.text(line, MARGIN, y);
    y += 5;
  });

  if (orcamento.observacoes?.trim()) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("Observações", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    const obsLines = doc.splitTextToSize(orcamento.observacoes.trim(), CONTENT_W);
    doc.text(obsLines, MARGIN, y);
    y += obsLines.length * 4 + 2;
  }

  return y + 4;
}

function drawFooter(doc: JsPDF) {
  const y = 285;
  doc.setDrawColor(...GOLD);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    "Navarro Engenharia — Soluções em Saúde e Segurança do Trabalho",
    PAGE_W / 2,
    y + 5,
    { align: "center" }
  );
  doc.text(
    `${NAVARRO.site} · ${NAVARRO.email} · ${NAVARRO.telefone}`,
    PAGE_W / 2,
    y + 9,
    { align: "center" }
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

export async function gerarPdfOrcamento(
  orcamento: OrcamentoComItens
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogoAsset();
  const catalogo = await listarServicosSst();

  let y = MARGIN;
  y = drawHeader(doc, logo, y);
  y = drawInfoBlock(doc, y, orcamento);
  y = drawItemsTable(doc, y, orcamento, catalogo);
  y = drawTotals(doc, y, orcamento);
  drawConditions(doc, y, orcamento);
  drawFooter(doc);

  doc.save(buildFilename(orcamento));
}
