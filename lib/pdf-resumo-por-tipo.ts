import type { ResumoPorTipoExame } from "@/lib/fatura-mappers";
import { formatCurrency } from "@/lib/money";

type JsPDF = import("jspdf").jsPDF;
type RGB = [number, number, number];

const NAVY: RGB = [8, 43, 99];
const GOLD: RGB = [201, 151, 43];
const WHITE: RGB = [255, 255, 255];
const ROW_BORDER: RGB = [231, 234, 240];
const ROW_ZEBRA: RGB = [248, 250, 252];
const TOTAL_ROW_BG: RGB = [240, 244, 255];

export interface PdfResumoPorTipoLayout {
  margin: number;
  contentW: number;
}

function drawGoldLineH(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h = 0.35
) {
  doc.setFillColor(...GOLD);
  doc.rect(x, y, w, h, "F");
}

function drawSectionTitle(doc: JsPDF, x: number, y: number, lineW: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("RESUMO POR TIPO DE EXAME", x, y);
  drawGoldLineH(doc, x, y + 2, lineW);
}

/** Altura estimada (mm) para reservar espaço na última página. */
export function estimateResumoPorTipoHeight(resumoRowCount: number): number {
  const titleH = 8;
  const tableHeadH = 9;
  const rowH = 6;
  return titleH + tableHeadH + (resumoRowCount + 1) * rowH + 6;
}

export function drawResumoPorTipoExamePdf(
  doc: JsPDF,
  y: number,
  resumo: ResumoPorTipoExame[],
  totalExames: number,
  totalValor: string,
  totalColumnLabel: string,
  layout: PdfResumoPorTipoLayout,
  autoTable: typeof import("jspdf-autotable").default
): number {
  drawSectionTitle(doc, layout.margin, y + 4, 72);

  const body = resumo.map((r) => [
    r.tipo,
    String(r.qtd),
    formatCurrency(r.total),
  ]);
  body.push(["TOTAL GERAL", String(totalExames), totalValor]);

  autoTable(doc, {
    startY: y + 8,
    head: [["TIPO DE EXAME", "QTD. DE EXAMES", totalColumnLabel]],
    body,
    margin: { left: layout.margin, right: layout.margin },
    tableWidth: layout.contentW,
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      textColor: NAVY,
      lineColor: ROW_BORDER,
      lineWidth: 0.15,
      valign: "middle" as const,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold" as const,
      fontSize: 8,
    },
    bodyStyles: { fillColor: WHITE },
    alternateRowStyles: { fillColor: ROW_ZEBRA },
    columnStyles: {
      0: { cellWidth: layout.contentW * 0.5 },
      1: { cellWidth: layout.contentW * 0.22, halign: "center" as const },
      2: {
        cellWidth: layout.contentW * 0.28,
        halign: "right" as const,
        fontStyle: "bold" as const,
      },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = TOTAL_ROW_BG;
      }
    },
  });

  return (
    (doc as JsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 8
  );
}
