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
  const logoBox =
    variante === "sst"
      ? "h-[4.75rem] w-[5.5rem] sm:h-[5.5rem] sm:w-[6.75rem]"
      : "h-14 w-[4.25rem] sm:h-16 sm:w-[5rem]";

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e8edf5] bg-white p-2 ${logoBox}`}
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
            <span className="text-sm font-semibold tracking-wide text-white sm:text-base">
              {iniciais}
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h1
          className={`font-semibold leading-tight tracking-tight text-[#0b1f4d] ${
            variante === "sst"
              ? "text-[22px] sm:text-[26px]"
              : "text-[20px] sm:text-[22px]"
          }`}
        >
          {nome}
        </h1>
        {variante === "sst" ? (
          <>
            <p className="mt-1 text-[13px] font-semibold tracking-wide text-[#334155]">
              Portal SST
            </p>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[#64748b]">
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
