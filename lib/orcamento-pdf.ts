import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCNPJ } from "@/lib/cnpj";
import { formatCurrency } from "@/lib/money";
import {
  NAVARRO_ORC_PDF,
  ORC_PDF_COLORS,
  ORC_PDF_DESCRICAO_NOTA,
  ORC_PDF_DESCRICAO_PADRAO,
  ORC_PDF_FONT,
  ORC_PDF_INCLUSO_ITENS,
  ORC_PDF_INCLUSO_OBS,
  ORC_PDF_LAYOUT,
  ORC_PDF_PAGE,
  orcPdfContentWidth,
} from "@/lib/orcamento-pdf-theme";
import type {
  OrcamentoComItens,
  OrcamentoItemRecord,
  ServicoSstRecord,
} from "@/lib/orcamento-types";
import { resolveItensInclusosServico } from "@/lib/servico-sst-pacote";
import { buscarClientePorId } from "@/services/cliente.service";
import { listarServicosSst } from "@/services/servico-sst.service";

type JsPDF = import("jspdf").jsPDF;
type RGB = [number, number, number];

const C = ORC_PDF_COLORS;
const L = ORC_PDF_LAYOUT;
const F = ORC_PDF_FONT;
const ML = ORC_PDF_PAGE.marginLeft;
const CW = orcPdfContentWidth();
const PAGE_H = ORC_PDF_PAGE.height;
const FOOTER_Y = PAGE_H - ORC_PDF_PAGE.marginBottom - L.footerHeight;

interface LogoAsset {
  dataUrl: string;
  width: number;
  height: number;
}

interface TableRow {
  nome: string;
  quantidade: number;
}

interface ClientePdfInfo {
  cnpj: string;
}

function setColor(doc: JsPDF, color: RGB) {
  doc.setTextColor(...color);
}

function setFill(doc: JsPDF, color: RGB) {
  doc.setFillColor(...color);
}

function setDraw(doc: JsPDF, color: RGB) {
  doc.setDrawColor(...color);
}

function fontBold(doc: JsPDF) {
  doc.setFont(F.family, "bold");
}

function fontNormal(doc: JsPDF) {
  doc.setFont(F.family, "normal");
}

function drawGoldLine(
  doc: JsPDF,
  y: number,
  x: number = ML,
  width: number = CW
) {
  setDraw(doc, C.gold);
  doc.setLineWidth(L.goldLineWidth);
  doc.line(x, y, x + width, y);
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
      img.onerror = () => resolve({ w: 200, h: 200 });
      img.src = dataUrl;
    });

    const max = L.logoMax;
    const ratio = dims.w / dims.h;
    let width = max;
    let height = width / ratio;
    if (height > max) {
      height = max;
      width = height * ratio;
    }

    return { dataUrl, width, height };
  } catch {
    return null;
  }
}

async function resolveClienteInfo(
  orcamento: OrcamentoComItens
): Promise<ClientePdfInfo> {
  if (orcamento.cliente_id) {
    try {
      const cliente = await buscarClientePorId(orcamento.cliente_id);
      if (cliente?.cnpj) {
        return { cnpj: formatCNPJ(cliente.cnpj) };
      }
    } catch {
      /* fallback */
    }
  }
  return { cnpj: "—" };
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

function shortServicoNome(text: string): string {
  const trimmed = text.trim();
  const dash = trimmed.indexOf(" - ");
  return dash > 0 ? trimmed.slice(0, dash).trim() : trimmed;
}

function buildTableRows(
  orcamento: OrcamentoComItens,
  catalogo: ServicoSstRecord[]
): TableRow[] {
  const itens = [...(orcamento.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );
  const rows: TableRow[] = [];

  itens.forEach((item) => {
    const servico = resolveCatalogoServico(item, catalogo);
    const inclusos = resolveItensInclusosServico(servico, item.servico_nome);
    const qtd = Number(item.quantidade) || 0;

    if (inclusos.length > 0) {
      inclusos.forEach((inc) => {
        rows.push({ nome: shortServicoNome(inc), quantidade: qtd });
      });
      return;
    }

    rows.push({ nome: item.servico_nome, quantidade: qtd });
  });

  return rows;
}

function drawHeader(doc: JsPDF, logo: LogoAsset | null, y: number): number {
  const headerBottom = y + L.headerHeight;
  const col2X = ML + CW * 0.42;
  const col2LineX = col2X - 2;

  if (logo) {
    const logoY = y + (L.headerHeight - logo.height) / 2;
    doc.addImage(logo.dataUrl, "PNG", ML, logoY, logo.width, logo.height);
  }

  const textX = ML + L.logoMax + 3;
  let ty = y + 5;

  fontBold(doc);
  doc.setFontSize(F.logo);
  setColor(doc, C.navy);
  doc.text(NAVARRO_ORC_PDF.razaoSocial, textX, ty);
  ty += 4.5;

  fontNormal(doc);
  doc.setFontSize(F.small);
  setColor(doc, C.textSecondary);
  doc.text(NAVARRO_ORC_PDF.subtituloLinha1, textX, ty);
  ty += 3.2;
  doc.text(NAVARRO_ORC_PDF.subtituloLinha2, textX, ty);
  ty += 3.8;

  doc.setFontSize(F.small);
  setColor(doc, C.textPrimary);
  doc.text(`CNPJ: ${NAVARRO_ORC_PDF.cnpj}`, textX, ty);

  setDraw(doc, C.gold);
  doc.setLineWidth(L.goldLineWidth);
  doc.line(col2LineX, y + 2, col2LineX, headerBottom - 2);

  let cy = y + 6;
  fontBold(doc);
  doc.setFontSize(F.subtitle);
  setColor(doc, C.navy);
  doc.text(NAVARRO_ORC_PDF.responsavel.toUpperCase(), col2X, cy);
  cy += 4.5;

  fontNormal(doc);
  doc.setFontSize(F.small);
  setColor(doc, C.textSecondary);
  doc.text(NAVARRO_ORC_PDF.cargo, col2X, cy);
  cy += 3.5;
  doc.text(NAVARRO_ORC_PDF.crea, col2X, cy);

  const rightX = ML + CW;
  const contacts = [
    NAVARRO_ORC_PDF.celular,
    NAVARRO_ORC_PDF.telefone,
    NAVARRO_ORC_PDF.email,
    NAVARRO_ORC_PDF.site,
  ];
  let ry = y + 6;
  fontNormal(doc);
  doc.setFontSize(F.small);
  setColor(doc, C.textPrimary);
  contacts.forEach((line) => {
    doc.text(line, rightX, ry, { align: "right" });
    ry += 3.8;
  });

  drawGoldLine(doc, headerBottom + 1);
  return headerBottom + L.spaceAfterHeader;
}

function drawTitle(doc: JsPDF, y: number): number {
  fontBold(doc);
  doc.setFontSize(F.title);
  setColor(doc, C.navy);
  doc.text("PROPOSTA COMERCIAL", ML + CW / 2, y, { align: "center" });
  return y + L.spaceAfterTitle;
}

function drawClienteBlock(
  doc: JsPDF,
  y: number,
  orcamento: OrcamentoComItens,
  clienteInfo: ClientePdfInfo
): number {
  const leftX = ML;
  const rightX = ML + CW;
  let ly = y;

  const leftFields: [string, string][] = [
    ["Cliente:", orcamento.cliente_nome],
    ["CNPJ:", clienteInfo.cnpj],
    ["Setor:", "—"],
    ["End:", "—"],
    ["E-mail:", orcamento.email?.trim() || "—"],
  ];

  fontNormal(doc);
  doc.setFontSize(F.body);
  leftFields.forEach(([label, value]) => {
    fontBold(doc);
    setColor(doc, C.gold);
    doc.text(label, leftX, ly);
    fontNormal(doc);
    setColor(doc, C.textPrimary);
    doc.text(value, leftX + 18, ly);
    ly += 4.8;
  });

  const dataLabel = `Data: ${formatDateIsoToBR(orcamento.data_proposta)}`;
  fontNormal(doc);
  setColor(doc, C.textPrimary);
  doc.text(dataLabel, rightX, y, { align: "right" });

  fontBold(doc);
  doc.setFontSize(F.subtitle);
  setColor(doc, C.gold);
  doc.text(`#${orcamento.numero.replace(/^ORC-?/i, "")}`, rightX, y + 6, {
    align: "right",
  });

  const blockBottom = ly + 2;
  drawGoldLine(doc, blockBottom);
  return blockBottom + 4;
}

function drawDescricao(doc: JsPDF, y: number, orcamento: OrcamentoComItens): number {
  y += L.spaceDescTop;

  fontBold(doc);
  doc.setFontSize(F.subtitle);
  setColor(doc, C.navy);
  doc.text("DESCRIÇÃO", ML, y);
  y += 5;

  const texto = ORC_PDF_DESCRICAO_PADRAO;

  fontNormal(doc);
  doc.setFontSize(F.body);
  setColor(doc, C.textPrimary);
  const lines = doc.splitTextToSize(texto, CW);
  doc.text(lines, ML, y, { align: "justify", maxWidth: CW });
  y += lines.length * 3.8 + 2;

  doc.setFontSize(F.small);
  setColor(doc, C.textSecondary);
  doc.text(ORC_PDF_DESCRICAO_NOTA, ML, y);
  y += L.spaceDescBottom + 4;

  return y;
}

function drawServiceIcon(doc: JsPDF, x: number, y: number) {
  const size = 4.2;
  setFill(doc, C.gold);
  doc.rect(x, y - 3.2, size, size, "F");
  setFill(doc, C.white);
  doc.rect(x + 0.8, y - 2.4, size - 1.6, size - 1.6, "F");
}

function measureTableRowHeight(doc: JsPDF, nome: string, colWidth: number): number {
  fontNormal(doc);
  doc.setFontSize(F.table);
  const lines = doc.splitTextToSize(nome, colWidth - 10);
  return Math.max(L.tableRowMinHeight, 4 + lines.length * 3.6);
}

function drawServicesTable(doc: JsPDF, y: number, rows: TableRow[]): number {
  const servicosW = CW * 0.75;
  const colabW = CW * 0.25;
  const tableX = ML;
  let currentY = y;
  let tableStartY = currentY;

  const drawTableHead = () => {
    tableStartY = currentY;
    setFill(doc, C.navy);
    doc.rect(tableX, currentY, CW, L.tableHeadHeight, "F");

    fontBold(doc);
    doc.setFontSize(F.table);
    setColor(doc, C.white);
    doc.text("SERVIÇOS", tableX + 3, currentY + 6.8);
    doc.text("COLABORADORES", tableX + servicosW + colabW / 2, currentY + 6.8, {
      align: "center",
    });

    currentY += L.tableHeadHeight;
  };

  drawTableHead();

  rows.forEach((row, index) => {
    const rowH = measureTableRowHeight(doc, row.nome, servicosW);

    if (currentY + rowH > FOOTER_Y - 55) {
      setDraw(doc, C.navy);
      doc.setLineWidth(0.4);
      doc.rect(tableX, tableStartY, CW, currentY - tableStartY);

      doc.addPage();
      currentY = ORC_PDF_PAGE.marginTop;
      drawTableHead();
    }

    if (index > 0) {
      setDraw(doc, C.grayBorder);
      doc.setLineWidth(0.25);
      doc.line(tableX, currentY, tableX + CW, currentY);
    }

    setDraw(doc, C.grayBorder);
    doc.line(tableX + servicosW, currentY, tableX + servicosW, currentY + rowH);

    drawServiceIcon(doc, tableX + 3, currentY + rowH / 2 + 1);

    fontNormal(doc);
    doc.setFontSize(F.table);
    setColor(doc, C.textPrimary);
    const nameLines = doc.splitTextToSize(row.nome, servicosW - 12);
    doc.text(nameLines, tableX + 9, currentY + 5);

    doc.text(
      String(row.quantidade),
      tableX + servicosW + colabW / 2,
      currentY + rowH / 2 + 1,
      { align: "center" }
    );

    currentY += rowH;
  });

  setDraw(doc, C.navy);
  doc.setLineWidth(0.4);
  doc.rect(tableX, tableStartY, CW, currentY - tableStartY);

  return currentY + 6;
}

function drawBottomCards(doc: JsPDF, y: number, orcamento: OrcamentoComItens): number {
  const gap = CW * L.cardGapRatio;
  const cardW = CW * L.cardWidthRatio;
  const cardH = 52;
  const leftX = ML;
  const rightX = ML + cardW + gap;

  if (y + cardH + 12 > FOOTER_Y) {
    doc.addPage();
    y = ORC_PDF_PAGE.marginTop;
  }

  [leftX, rightX].forEach((x) => {
    setFill(doc, C.grayBlock);
    doc.rect(x, y, cardW, cardH, "F");
    setDraw(doc, C.grayBorder);
    doc.setLineWidth(0.25);
    doc.rect(x, y, cardW, cardH, "S");
  });

  let ly = y + 6;
  setFill(doc, C.gold);
  doc.circle(leftX + 5, ly - 1.2, 1.8, "F");
  fontBold(doc);
  doc.setFontSize(F.small);
  setColor(doc, C.white);
  doc.text("✓", leftX + 4.3, ly);

  fontBold(doc);
  doc.setFontSize(F.subtitle);
  setColor(doc, C.navy);
  doc.text("O QUE ESTÁ INCLUSO?", leftX + 9, ly);
  ly += 5;

  fontNormal(doc);
  doc.setFontSize(F.table);
  setColor(doc, C.textPrimary);
  ORC_PDF_INCLUSO_ITENS.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, cardW - 8);
    doc.text(lines, leftX + 4, ly);
    ly += lines.length * 3.4;
  });

  ly += 2;
  fontBold(doc);
  doc.setFontSize(F.table);
  setColor(doc, C.navy);
  doc.text("Observações:", leftX + 4, ly);
  ly += 3.5;

  fontNormal(doc);
  setColor(doc, C.textSecondary);
  ORC_PDF_INCLUSO_OBS.forEach((obs) => {
    const lines = doc.splitTextToSize(obs, cardW - 8);
    doc.text(lines, leftX + 4, ly);
    ly += lines.length * 3.2;
  });

  if (orcamento.observacoes?.trim()) {
    ly += 1.5;
    const lines = doc.splitTextToSize(orcamento.observacoes.trim(), cardW - 8);
    doc.text(lines, leftX + 4, ly);
  }

  let ry = y + 6;
  setFill(doc, C.navy);
  doc.circle(rightX + 5, ry - 1.2, 1.8, "F");
  fontBold(doc);
  doc.setFontSize(F.small);
  setColor(doc, C.white);
  doc.text("$", rightX + 4.5, ry);

  fontBold(doc);
  doc.setFontSize(F.subtitle);
  setColor(doc, C.navy);
  doc.text("VALOR TOTAL", rightX + 9, ry);
  ry += 4;
  drawGoldLine(doc, ry, rightX + 4, cardW - 8);
  ry += 7;

  fontBold(doc);
  doc.setFontSize(F.totalValue);
  setColor(doc, C.gold);
  const desconto = Number(orcamento.desconto_percentual);
  const valorPrincipal =
    desconto > 0
      ? Number(orcamento.subtotal)
      : Number(orcamento.valor_total);
  doc.text(formatCurrency(valorPrincipal), rightX + cardW / 2, ry, {
    align: "center",
  });
  ry += 8;

  fontNormal(doc);
  doc.setFontSize(F.table);
  setColor(doc, C.textPrimary);
  const pagamento =
    orcamento.forma_pagamento?.trim() ||
    "Conforme condições comerciais acordadas";
  doc.text(`Pagamento: ${pagamento}`, rightX + 4, ry);
  ry += 4.5;

  if (desconto > 0) {
    fontNormal(doc);
    setColor(doc, C.textSecondary);
    doc.text("Valor à vista com desconto:", rightX + 4, ry);
    ry += 4;
    fontBold(doc);
    setColor(doc, C.gold);
    doc.text(formatCurrency(Number(orcamento.valor_total)), rightX + 4, ry);
  }

  return y + cardH + 5;
}

function drawValidityNote(doc: JsPDF, y: number, orcamento: OrcamentoComItens): number {
  const validade = formatDateIsoToBR(orcamento.validade_proposta);
  const texto = validade
    ? `Esta proposta é válida até ${validade}.`
    : "Esta proposta é válida por 30 dias a partir da data de emissão.";

  fontNormal(doc);
  doc.setFontSize(F.small);
  setColor(doc, C.textSecondary);
  doc.text(texto, ML + CW / 2, y, { align: "center" });
  return y + 5;
}

function drawFooter(doc: JsPDF) {
  const y = FOOTER_Y;

  drawGoldLine(doc, y);
  setFill(doc, C.navy);
  doc.rect(ML, y, CW, L.footerHeight, "F");

  fontNormal(doc);
  doc.setFontSize(F.footer);
  setColor(doc, C.white);

  const footerText = [
    NAVARRO_ORC_PDF.telefone,
    NAVARRO_ORC_PDF.site,
    NAVARRO_ORC_PDF.instagram,
  ].join("   |   ");

  doc.text(footerText, ML + CW / 2, y + L.footerHeight / 2 + 1.2, {
    align: "center",
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

export async function gerarPdfOrcamento(
  orcamento: OrcamentoComItens
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [logo, catalogo, clienteInfo] = await Promise.all([
    loadLogoAsset(),
    listarServicosSst(),
    resolveClienteInfo(orcamento),
  ]);

  const tableRows = buildTableRows(orcamento, catalogo);

  let y: number = ORC_PDF_PAGE.marginTop;
  y = drawHeader(doc, logo, y);
  y = drawTitle(doc, y);
  y = drawClienteBlock(doc, y, orcamento, clienteInfo);
  y = drawDescricao(doc, y, orcamento);
  y = drawServicesTable(doc, y, tableRows);
  y = drawBottomCards(doc, y, orcamento);
  drawValidityNote(doc, y, orcamento);
  drawFooter(doc);

  doc.save(buildFilename(orcamento));
}
