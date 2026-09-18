"use client";

import { PortalEmpresaIdentidade } from "@/components/portal-cliente/PortalEmpresaIdentidade";
import {
  PORTAL_SEM_CAMPANHAS_MSG,
  type PortalCampanhaListaItem,
} from "@/lib/portal-cliente";

export function PortalHistoricoAvaliacoes({
  empresaNome,
  logoUrl,
  campanhas,
  onAbrirCampanha,
}: {
  empresaNome: string;
  logoUrl: string | null;
  campanhas: PortalCampanhaListaItem[];
  onAbrirCampanha: (campanhaId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-[#0b1f4d] sm:text-[26px]">
          Avaliação de Riscos Psicossociais
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#64748b]">
          Acompanhe as avaliações realizadas pela sua empresa e consulte os
          resultados de cada ciclo.
        </p>
      </div>

      <PortalEmpresaIdentidade
        nome={empresaNome}
        logoUrl={logoUrl}
        variante="compacta"
      />

      <section>
        <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
          Avaliações realizadas
        </h2>

        {campanhas.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-[#e8edf5] bg-white px-5 py-10 text-center text-sm text-[#64748b]">
            {PORTAL_SEM_CAMPANHAS_MSG}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {campanhas.map((item) => (
              <li key={item.campanhaId}>
                <CampanhaCard
                  item={item}
                  onAbrir={() => onAbrirCampanha(item.campanhaId)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CampanhaCard({
  item,
  onAbrir,
}: {
  item: PortalCampanhaListaItem;
  onAbrir: () => void;
}) {
  const pct = item.participacaoPercentual;
  return (
    <article className="rounded-2xl border border-[#e8edf5] bg-white px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
            {item.label}
          </h3>
          <p className="mt-0.5 text-sm text-[#64748b]">
            {item.periodo ?? "Período não informado"}
          </p>
        </div>
        <StatusBadge label={item.statusLabel} />
      </div>

      <p className="mt-3 text-sm font-semibold text-[#0b1f4d]">
        {item.respondidos} de {item.cadastrados} colaboradores participaram
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#eef2f7]">
          <div
            className="h-full rounded-full bg-[#0b1f4d]"
            style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[#0b1f4d]">
          {pct == null ? "—" : `${pct}%`}
        </span>
      </div>

      <button
        type="button"
        className="mt-3 text-sm font-semibold text-[#0b1f4d] transition hover:text-[#12316f]"
        onClick={onAbrir}
      >
        Ver detalhes →
      </button>
    </article>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-[#0b1f4d] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
      {label}
    </span>
  );
}
