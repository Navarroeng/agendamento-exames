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
      ? "h-[5.25rem] w-[6.25rem] sm:h-[6rem] sm:w-[7.25rem]"
      : "h-14 w-[4.25rem] sm:h-16 sm:w-[5rem]";

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e8edf5] bg-white p-2.5 ${logoBox}`}
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
        {variante === "sst" ? (
          <>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-[#0b1f4d] sm:text-[26px]">
              {nome}
            </h1>
            <p className="mt-1 text-[13px] font-semibold tracking-wide text-[#334155]">
              Portal SST
            </p>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#64748b]">
              Estamos aqui para apoiar a gestão de SST da sua empresa.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[20px] font-semibold leading-tight tracking-tight text-[#0b1f4d] sm:text-[22px]">
              {nome}
            </h1>
            {children}
          </>
        )}
      </div>
    </header>
  );
}
