"use client";

import type { ReactNode } from "react";
import { RISCOS_RELATORIO_PRINT_ROOT_ID } from "@/lib/riscos-relatorio-pdf";

/**
 * Viewer ao redor da folha A4.
 * O stage é só chrome do modal; a folha mantém 210mm × (páginas de 297mm).
 * Impressão usa o mesmo `#riscos-relatorio-print-root` sem scale/zoom.
 */
export function RelatorioDocumentoShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relatorio-viewer-stage flex h-full min-h-0 w-full justify-center overflow-x-auto overflow-y-auto bg-[#e5e9ef] px-3 py-4 sm:px-6 sm:py-5">
      <div
        id={RISCOS_RELATORIO_PRINT_ROOT_ID}
        className="relatorio-a4-folha shrink-0 bg-white text-navy shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
      >
        {children}
      </div>
    </div>
  );
}
