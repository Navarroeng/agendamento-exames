"use client";

import type { ReactNode } from "react";
import { RISCOS_RELATORIO_PRINT_ROOT_ID } from "@/lib/riscos-relatorio-pdf";

/**
 * Visualizador do documento A4.
 * Área cinza (chrome) + folha branca centralizada (fonte da verdade para PDF).
 */
export function RelatorioDocumentoShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relatorio-viewer-stage -mx-4 -mb-4 -mt-4 flex max-h-[min(78vh,calc(90vh-10.5rem))] justify-center overflow-y-auto overflow-x-auto bg-[#e5e9ef] px-4 py-6 sm:-mx-6 sm:-mb-6 sm:-mt-6 sm:px-8 sm:py-8">
      <div
        id={RISCOS_RELATORIO_PRINT_ROOT_ID}
        className="relatorio-a4-folha w-[210mm] max-w-full shrink-0 bg-white text-navy shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
      >
        {children}
      </div>
    </div>
  );
}
