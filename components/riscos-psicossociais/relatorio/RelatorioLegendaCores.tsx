"use client";

import { RELATORIO_LEGENDA } from "@/lib/riscos-relatorio-view";

export function RelatorioLegendaCores({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-app-muted ${className}`}
    >
      {RELATORIO_LEGENDA.map((item) => (
        <span key={item.id} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.cor }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
