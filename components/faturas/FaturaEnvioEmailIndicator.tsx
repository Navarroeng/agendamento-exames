"use client";

import { formatFaturaEnvioTooltip } from "@/lib/fatura-envio-sugestao";
import type { FaturaRecord } from "@/lib/types";

interface FaturaEnvioEmailIndicatorProps {
  fatura: Pick<
    FaturaRecord,
    "fatura_enviada_em" | "fatura_enviada_email"
  >;
}

export function FaturaEnvioEmailIndicator({
  fatura,
}: FaturaEnvioEmailIndicatorProps) {
  const tooltip = formatFaturaEnvioTooltip(
    fatura.fatura_enviada_em,
    fatura.fatura_enviada_email
  );

  if (!tooltip) return null;

  return (
    <span
      className="group/env relative inline-flex h-[18px] w-[18px] shrink-0 cursor-help items-center justify-center rounded-full bg-brand-blue-soft text-brand-blue"
      aria-label={tooltip}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[11px] w-[11px]"
        aria-hidden
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 hidden min-w-[280px] -translate-x-1/2 rounded-lg bg-navy px-2.5 py-2 text-center text-[10px] font-medium leading-snug text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] group-hover/env:block"
      >
        {tooltip}
        <span
          className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-navy"
          aria-hidden
        />
      </span>
    </span>
  );
}
