"use client";

import { useMemo, useState } from "react";
import {
  PORTAL_CLASSIFICACAO_LABEL,
  PORTAL_HISTORICO_UM_CICLO_MSG,
  categoriasHistoricoUnicas,
  type PortalClassificacao,
  type PortalHistoricoCiclo,
} from "@/lib/portal-cliente";

const SERIES: Array<{
  key: "favoraveis" | "atencao" | "desfavoraveis";
  label: string;
  bar: string;
  text: string;
}> = [
  { key: "favoraveis", label: "Favoráveis", bar: "bg-[#86efac]", text: "text-[#166534]" },
  { key: "atencao", label: "Em atenção", bar: "bg-[#fcd34d]", text: "text-[#854d0e]" },
  { key: "desfavoraveis", label: "Desfavoráveis", bar: "bg-[#fda4af]", text: "text-[#9f1239]" },
];

const CLASSIF_DOT: Record<PortalClassificacao, string> = {
  favoravel: "bg-[#86efac]",
  atencao: "bg-[#fcd34d]",
  desfavoravel: "bg-[#fda4af]",
};

export function PortalEvolucaoRiscos({
  historico,
}: {
  historico: PortalHistoricoCiclo[];
}) {
  const categorias = useMemo(
    () => categoriasHistoricoUnicas(historico),
    [historico]
  );
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const categoriaSel =
    categorias.find((c) => c.id === categoriaId) ?? categorias[0] ?? null;

  if (historico.length === 0) return null;

  const max = Math.max(
    1,
    ...historico.flatMap((c) => [c.favoraveis, c.atencao, c.desfavoraveis])
  );

  return (
    <>
      <section className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-5">
        <h2 className="text-lg font-semibold tracking-tight text-[#0b1f4d]">
          Evolução dos Riscos Psicossociais
        </h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Comparativo consolidado entre ciclos da mesma empresa.
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-[#64748b]">
          {SERIES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${s.bar}`} />
              {s.label}
            </span>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="flex min-w-0 items-end gap-6 sm:gap-10">
            {historico.map((ciclo) => (
              <div
                key={ciclo.campanhaId}
                className="flex min-w-[7.5rem] flex-1 flex-col items-center"
              >
                <div
                  className="flex h-36 w-full items-end justify-center gap-1.5"
                  role="img"
                  aria-label={`${ciclo.label}: ${ciclo.favoraveis} favoráveis, ${ciclo.atencao} em atenção, ${ciclo.desfavoraveis} desfavoráveis`}
                >
                  {SERIES.map((s) => {
                    const valor = ciclo[s.key];
                    const pct = Math.round((valor / max) * 100);
                    return (
                      <div
                        key={s.key}
                        className="flex h-full w-7 flex-col items-center justify-end sm:w-8"
                      >
                        <span className={`mb-1 text-[11px] font-semibold tabular-nums ${s.text}`}>
                          {valor}
                        </span>
                        <div
                          className={`w-full rounded-t-md ${s.bar}`}
                          style={{ height: `${Math.max(valor === 0 ? 2 : pct, 2)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-center text-xs font-semibold text-[#0b1f4d]">
                  {ciclo.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {historico.length === 1 ? (
          <p className="mt-4 text-xs leading-relaxed text-[#94a3b8]">
            {PORTAL_HISTORICO_UM_CICLO_MSG}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-5">
        <h2 className="text-base font-semibold text-[#0b1f4d]">
          Evolução por categoria
        </h2>
        {categoriaSel ? (
          <>
            <label className="mt-3 flex max-w-md flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                Categoria
              </span>
              <select
                className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
                value={categoriaSel.id}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <ul className="mt-4 divide-y divide-[#f1f5f9]">
              {historico.map((ciclo) => {
                const ponto = ciclo.categorias.find(
                  (c) => c.id === categoriaSel.id
                );
                return (
                  <li
                    key={ciclo.campanhaId}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm font-medium text-[#334155]">
                      {ciclo.label}
                    </span>
                    {ponto ? (
                      <span className="inline-flex items-center gap-2 text-sm text-[#1e293b]">
                        <span
                          className={`h-2 w-2 rounded-full ${CLASSIF_DOT[ponto.classificacao]}`}
                        />
                        {ponto.label || PORTAL_CLASSIFICACAO_LABEL[ponto.classificacao]}
                      </span>
                    ) : (
                      <span className="text-sm text-[#94a3b8]">
                        Não avaliada neste ciclo
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-sm text-[#64748b]">
            Nenhuma categoria consolidada nos relatórios disponíveis.
          </p>
        )}
      </section>
    </>
  );
}
