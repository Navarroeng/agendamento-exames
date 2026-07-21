"use client";

import { useEffect, useState } from "react";
import { formatDateTimeBR } from "@/lib/format-datetime";
import { obterUrlAsoRetidoAnexo } from "@/services/agendamento-aso-retido.service";
import type { AgendamentoWithExames } from "@/lib/types";
import { IconDoc, SectionHeading } from "./ViewModalUi";

interface ViewModalAsoRetidoSectionProps {
  agendamento: AgendamentoWithExames;
}

export function ViewModalAsoRetidoSection({
  agendamento,
}: ViewModalAsoRetidoSectionProps) {
  const [anexoUrl, setAnexoUrl] = useState<string | null>(null);
  const [anexoLoading, setAnexoLoading] = useState(false);
  const [anexoError, setAnexoError] = useState<string | null>(null);

  const anexoPath = agendamento.aso_retido_anexo_path?.trim();
  const anexoNome = agendamento.aso_retido_anexo_nome?.trim();

  useEffect(() => {
    if (!anexoPath) {
      setAnexoUrl(null);
      setAnexoError(null);
      return;
    }

    let cancelled = false;
    setAnexoLoading(true);
    setAnexoError(null);

    obterUrlAsoRetidoAnexo(anexoPath)
      .then((url) => {
        if (!cancelled) setAnexoUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setAnexoUrl(null);
          setAnexoError("Não foi possível carregar o anexo.");
        }
      })
      .finally(() => {
        if (!cancelled) setAnexoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [anexoPath]);

  if (agendamento.status !== "aso_retido" && !anexoPath) {
    return null;
  }

  const retencaoEm = agendamento.aso_retido_em
    ? formatDateTimeBR(agendamento.aso_retido_em)
    : "—";
  const retencaoPor = agendamento.aso_retido_por?.trim() || "—";
  const observacao = agendamento.aso_retido_observacao?.trim();

  return (
    <section>
      <SectionHeading
        icon={<IconDoc />}
        iconBg="bg-[#ea580c]"
        title="ASO Retido"
      />
      <div className="rounded-2xl border border-[#fed7aa] bg-gradient-to-br from-[#fff7ed] to-white p-5 shadow-[0_6px_20px_rgba(234,88,12,0.08)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a3412]">
              Data da retenção
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1f2937]">
              {retencaoEm}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a3412]">
              Responsável
            </p>
            <p className="mt-1 text-sm font-semibold text-[#1f2937]">
              {retencaoPor}
            </p>
          </div>
        </div>

        {observacao ? (
          <div className="mt-4 rounded-xl border border-[#fed7aa]/60 bg-white/80 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a3412]">
              Observação
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#475569]">
              {observacao}
            </p>
          </div>
        ) : null}

        {anexoPath ? (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9a3412]">
              Documento anexado
            </p>
            {anexoLoading ? (
              <p className="mt-1 text-sm text-[#64748b]">Carregando anexo…</p>
            ) : anexoError ? (
              <p className="mt-1 text-sm text-brand-red">{anexoError}</p>
            ) : anexoUrl ? (
              <a
                href={anexoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-xl border border-[#fed7aa] bg-white px-4 py-2.5 text-sm font-semibold text-[#ea580c] transition hover:bg-[#fff7ed]"
              >
                <IconDoc />
                {anexoNome || "Visualizar documento"}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
