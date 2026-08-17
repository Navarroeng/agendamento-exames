"use client";

import { iniciaisEmpresa } from "@/lib/riscos-relatorio-view";

const NAVARRO_LOGO_RELATORIO = "/logo-navarro-relatorio-riscos.png";

/**
 * Cabeçalho institucional das páginas internas (não da capa).
 * Mesmo DOM no modal A4 e no PDF.
 */
export function RelatorioCabecalhoInterno({
  logoUrl,
  empresaNome,
}: {
  logoUrl?: string | null;
  empresaNome: string;
}) {
  const iniciais = iniciaisEmpresa(empresaNome);

  return (
    <header className="relatorio-cabecalho-interno">
      <div className="relatorio-cabecalho-interno-logos">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={NAVARRO_LOGO_RELATORIO}
          alt="Navarro Engenharia"
          className="relatorio-cabecalho-logo relatorio-cabecalho-logo-navarro"
        />
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`Logo ${empresaNome}`}
            className="relatorio-cabecalho-logo relatorio-cabecalho-logo-cliente"
          />
        ) : (
          <div
            className="relatorio-cabecalho-logo-fallback"
            aria-label={empresaNome}
          >
            {iniciais}
          </div>
        )}
      </div>
      <div className="relatorio-cabecalho-interno-linha" aria-hidden>
        <span className="relatorio-cabecalho-interno-linha-ouro" />
      </div>
    </header>
  );
}
