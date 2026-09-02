"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RelatorioDocumento } from "@/components/riscos-psicossociais/relatorio/RelatorioDocumento";
import { RelatorioDocumentoShell } from "@/components/riscos-psicossociais/relatorio/RelatorioDocumentoShell";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import { RISCOS_RELATORIO_PRINTING_CLASS } from "@/lib/riscos-relatorio-pdf";

export function RelatorioPrintPageClient({
  relatorio,
  logoUrl,
  empresaCnpj,
  campanhaStatus,
}: {
  relatorio: RiscosRelatorioRecord;
  logoUrl?: string | null;
  empresaCnpj?: string | null;
  campanhaStatus?: string | null;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add(RISCOS_RELATORIO_PRINTING_CLASS);
    window.dispatchEvent(new Event("resize"));
    return () => {
      document.body.classList.remove(RISCOS_RELATORIO_PRINTING_CLASS);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="riscos-relatorio-print-shell fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-[#e5e9ef]">
      <RelatorioDocumentoShell>
        <RelatorioDocumento
          relatorio={relatorio}
          logoUrl={logoUrl}
          empresaCnpj={empresaCnpj}
          campanhaStatus={campanhaStatus}
        />
      </RelatorioDocumentoShell>
    </div>,
    document.body
  );
}
