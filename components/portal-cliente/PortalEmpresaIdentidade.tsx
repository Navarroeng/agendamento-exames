"use client";

import { iniciaisEmpresa } from "@/lib/riscos-relatorio-view";

export function PortalEmpresaIdentidade({
  nome,
  logoUrl,
  variante,
  children,
}: {
  nome: string;
  logoUrl: string | null;
  variante: "sst" | "avaliacao";
  children?: React.ReactNode;
}) {
  const iniciais = iniciaisEmpresa(nome || "Empresa");

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div
        className="flex h-16 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e8edf5] bg-white p-1.5 sm:h-[4.5rem] sm:w-[5.25rem]"
        aria-hidden={!logoUrl}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`Logo ${nome}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-xl bg-[#0b1f4d]"
            aria-label={nome}
          >
            <span className="text-sm font-semibold tracking-wide text-white">
              {iniciais}
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-[#0b1f4d] sm:text-[26px]">
          {nome}
        </h1>
        {variante === "sst" ? (
          <>
            <p className="mt-1 text-sm font-medium text-[#334155]">
              Portal SST da sua empresa
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#64748b]">
              Acompanhe os serviços, avaliações e documentos de Saúde e
              Segurança do Trabalho da sua empresa.
            </p>
          </>
        ) : (
          children
        )}
      </div>
    </header>
  );
}
