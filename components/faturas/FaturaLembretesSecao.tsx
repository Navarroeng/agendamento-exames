"use client";

import type { ReactNode } from "react";
import {
  competenciaLembreteExtenso,
  competenciaLembreteTitulo,
  normalizarCompetenciaIso,
} from "@/lib/fatura-lembrete";

export function FaturaLembretesSecao({
  competencia,
  children,
}: {
  competencia: string;
  children: ReactNode;
}) {
  const iso = normalizarCompetenciaIso(competencia);
  const extenso = iso
    ? competenciaLembreteExtenso({ mesReferencia: iso })
    : null;
  const titulo = extenso ? competenciaLembreteTitulo(extenso) : "";

  return (
    <section
      className="panel-card px-3 py-3 sm:px-4"
      aria-label={titulo ? `Lembretes — ${titulo}` : "Lembretes"}
    >
      <h2 className="text-xs font-semibold tracking-[-0.1px] text-[#64748b]">
        {titulo ? `Lembretes — ${titulo}` : "Lembretes"}
      </h2>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-2">
        {children}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-[#94a3b8]">
        Envio manual, com confirmação.
      </p>
    </section>
  );
}
