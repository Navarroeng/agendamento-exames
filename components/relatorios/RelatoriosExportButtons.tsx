"use client";

import { downloadCsv, downloadPdfTable } from "@/lib/relatorios/export";

interface RelatoriosExportButtonsProps {
  title: string;
  filenameBase: string;
  headers: string[];
  rows: string[][];
}

export function RelatoriosExportButtons({
  title,
  filenameBase,
  headers,
  rows,
}: RelatoriosExportButtonsProps) {
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-lg border border-[#dbe4f4] bg-white px-3 py-1.5 text-[11px] font-bold text-brand-blue hover:bg-brand-blue-soft"
        onClick={() => downloadCsv(`${filenameBase}.csv`, headers, rows)}
      >
        Exportar Excel
      </button>
      <button
        type="button"
        className="rounded-lg border border-[#dbe4f4] bg-white px-3 py-1.5 text-[11px] font-bold text-[#52617a] hover:bg-[#f4f6fb]"
        onClick={() =>
          downloadPdfTable(title, `${filenameBase}.pdf`, headers, rows)
        }
      >
        Exportar PDF
      </button>
    </div>
  );
}
