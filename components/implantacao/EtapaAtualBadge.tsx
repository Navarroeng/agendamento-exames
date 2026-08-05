"use client";

import {
  IMPLANTACAO_ETAPA_BADGE,
  IMPLANTACAO_ETAPA_BADGE_BASE,
  IMPLANTACAO_ETAPA_LABELS,
  type ImplantacaoEtapaId,
} from "@/lib/implantacao-clientes";

interface EtapaAtualBadgeProps {
  etapa: ImplantacaoEtapaId;
  /** Observação secundária (ex.: dispensa) — não substitui o badge. */
  observacao?: string | null;
  /** Alerta quando concluído com exames programados para o futuro. */
  alertaExamesFuturos?: boolean;
  className?: string;
}

/**
 * Badge único da coluna “Etapa atual” na Implantação de Clientes.
 * Sempre renderiza pill arredondado com fundo/texto/borda da família da etapa.
 */
export function EtapaAtualBadge({
  etapa,
  observacao,
  alertaExamesFuturos = false,
  className = "",
}: EtapaAtualBadgeProps) {
  const label = IMPLANTACAO_ETAPA_LABELS[etapa] ?? etapa;
  const tone =
    IMPLANTACAO_ETAPA_BADGE[etapa] ?? IMPLANTACAO_ETAPA_BADGE.contrato;

  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${className}`.trim()}>
      <span
        className={`${IMPLANTACAO_ETAPA_BADGE_BASE} gap-1 ${tone.className}`}
        title={label}
      >
        <span className="truncate">{label}</span>
        {alertaExamesFuturos ? (
          <span
            className="inline-flex shrink-0"
            title="Implantação concluída com exames programados para realização futura."
            aria-label="Implantação concluída com exames programados para realização futura."
          >
            <svg
              viewBox="0 0 20 20"
              className="h-3 w-3 text-[#b45309]"
              fill="currentColor"
              aria-hidden
            >
              <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.59c.75 1.334-.213 2.986-1.742 2.986H3.48c-1.53 0-2.493-1.652-1.743-2.986L8.257 3.1zM10 7.25a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0V8a.75.75 0 00-.75-.75zm0 7a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
          </span>
        ) : null}
      </span>
      {observacao ? (
        <span className="text-[10px] font-medium leading-tight text-[#64748b]">
          {observacao}
        </span>
      ) : null}
    </div>
  );
}
