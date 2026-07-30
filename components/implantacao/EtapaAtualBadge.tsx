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
  className?: string;
}

/**
 * Badge único da coluna “Etapa atual” na Implantação de Clientes.
 * Sempre renderiza pill arredondado com fundo/texto/borda da família da etapa.
 */
export function EtapaAtualBadge({
  etapa,
  observacao,
  className = "",
}: EtapaAtualBadgeProps) {
  const label = IMPLANTACAO_ETAPA_LABELS[etapa] ?? etapa;
  const tone =
    IMPLANTACAO_ETAPA_BADGE[etapa] ?? IMPLANTACAO_ETAPA_BADGE.contrato;

  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${className}`.trim()}>
      <span
        className={`${IMPLANTACAO_ETAPA_BADGE_BASE} ${tone.className}`}
        title={label}
      >
        {label}
      </span>
      {observacao ? (
        <span className="text-[10px] font-medium leading-tight text-[#64748b]">
          {observacao}
        </span>
      ) : null}
    </div>
  );
}
