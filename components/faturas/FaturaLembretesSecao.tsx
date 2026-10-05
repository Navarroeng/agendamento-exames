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
    <section aria-label={titulo ? `Lembretes — ${titulo}` : "Lembretes"}>
      <h2 className="mb-3 text-[15px] font-semibold tracking-[-0.2px] text-navy">
        {titulo ? `Lembretes — ${titulo}` : "Lembretes"}
      </h2>
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
        {children}
      </div>
      <p className="mt-2 text-xs text-[#64748b]">
        Envio manual, com confirmação. Cada empresa recebe sua própria fatura.
      </p>
    </section>
  );
}
