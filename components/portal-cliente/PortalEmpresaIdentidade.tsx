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

  if (variante === "sst") {
    return (
      <header className="relative overflow-hidden rounded-2xl border border-[#e8edf5] bg-gradient-to-br from-white via-white to-[#f4f7fb] px-5 py-5 shadow-[0_10px_30px_rgba(11,31,77,0.05)] sm:px-7 sm:py-6">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[#0b1f4d]" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e8edf5] bg-white p-2.5 shadow-[0_4px_14px_rgba(11,31,77,0.06)] ${logoBox}`}
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
              Portal SST
            </p>
            <h1 className="mt-1.5 text-[22px] font-bold leading-tight tracking-tight text-[#0b1f4d] sm:text-[28px]">
              {nome}
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[#64748b] sm:text-[15px]">
              Acompanhe documentos, avaliações, agendamentos e informações de
              Saúde e Segurança do Trabalho da sua empresa.
            </p>
          </div>
        </div>
      </header>
    );
  }

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
        <h1 className="text-[20px] font-semibold leading-tight tracking-tight text-[#0b1f4d] sm:text-[22px]">
          {nome}
        </h1>
        {children}
      </div>
    </header>
  );
}
