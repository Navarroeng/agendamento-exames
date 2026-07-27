type JsPDF = import("jspdf").jsPDF;

const NAVY: [number, number, number] = [8, 43, 99];
const GOLD: [number, number, number] = [201, 151, 43];
const WHITE: [number, number, number] = [255, 255, 255];

export const PDF_FOOTER_H = 13;
export const PDF_FOOTER_BOTTOM_MARGIN = 8;

export interface NavarroPdfFooterInfo {
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  agradecimento: string;
}

export function calcPdfFooterTopY(pageHeight: number): number {
  return pageHeight - PDF_FOOTER_BOTTOM_MARGIN - PDF_FOOTER_H;
}

/** Limite superior do conteúdo útil acima do rodapé premium. */
export function calcPdfContentBottomY(pageHeight: number, buffer = 2): number {
  return calcPdfFooterTopY(pageHeight) - buffer;
}

/** Rodapé premium compartilhado (Faturas, Propostas e demais PDFs Navarro). */
export function drawNavarroPremiumFooter(
  doc: JsPDF,
  options: {
    pageNumber: number;
    totalPages: number;
    pageWidth: number;
    pageHeight: number;
    margin: number;
    contentWidth: number;
    navarro: NavarroPdfFooterInfo;
  }
): void {
  const {
    pageNumber,
    totalPages,
    pageWidth,
    pageHeight,
    margin,
    contentWidth,
    navarro,
  } = options;

  const y = calcPdfFooterTopY(pageHeight);
  const h = PDF_FOOTER_H;
  const pageLabel = `Página ${pageNumber} de ${totalPages}`;

  doc.setFillColor(...NAVY);
  doc.rect(0, y, pageWidth, h, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(200, 210, 225);
  doc.text(pageLabel, pageWidth - margin, y + 3.8, { align: "right" });

  const items = [
    navarro.telefone,
    `WhatsApp ${navarro.whatsapp}`,
    navarro.email,
    navarro.site,
  ];

  doc.setFontSize(8);
  doc.setTextColor(...WHITE);

  const widths = items.map((item) => doc.getTextWidth(item));
  const sepW = 6;
  const totalW =
    widths.reduce((sum, w) => sum + w, 0) + sepW * (items.length - 1);
  let cx = (pageWidth - totalW) / 2;

  items.forEach((item, i) => {
    doc.text(item, cx, y + 4.5);
    cx += widths[i] ?? 0;

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
  doc.text(navarro.agradecimento, pageWidth / 2, y + 9.5, {
    align: "center",
    maxWidth: contentWidth,
  });
}
