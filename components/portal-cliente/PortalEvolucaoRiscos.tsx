"use client";

import {
  PORTAL_HISTORICO_UM_CICLO_MSG,
  historicoResultadosComparaveis,
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

export function PortalEvolucaoRiscos({
  historico,
}: {
  historico: PortalHistoricoCiclo[];
}) {
  if (historico.length === 0) return null;

  if (historico.length === 1) {
    return (
      <section className="rounded-2xl border border-[#e8edf5] bg-white px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
          Evolução
        </h2>
        <p className="mt-2 text-sm font-semibold text-[#0b1f4d]">
          Este é o primeiro ciclo registrado.
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[#64748b]">
          {PORTAL_HISTORICO_UM_CICLO_MSG}
        </p>
      </section>
    );
  }

  const comparavel = historicoResultadosComparaveis(historico);

  if (!comparavel) {
    return (
      <section className="rounded-2xl border border-[#e8edf5] bg-white px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
          Evolução
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
          Os ciclos registrados não compartilham o mesmo conjunto de categorias
          e não devem ser comparados diretamente.
        </p>
      </section>
    );
  }

  const max = Math.max(
    1,
    ...historico.flatMap((c) => [c.favoraveis, c.atencao, c.desfavoraveis])
  );

  return (
    <section className="rounded-2xl border border-[#e8edf5] bg-white px-5 py-4">
      <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
        Evolução dos Riscos Psicossociais
      </h2>
      <p className="mt-0.5 text-sm text-[#64748b]">
        Comparativo consolidado entre ciclos da mesma empresa.
      </p>

      <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-[#64748b]">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${s.bar}`} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <div
          className="flex min-w-full items-end gap-4 sm:gap-6"
          style={
            historico.length > 3
              ? { minWidth: `${historico.length * 7.5}rem` }
              : undefined
          }
        >
          {historico.map((ciclo) => (
            <div
              key={ciclo.campanhaId}
              className="flex min-w-[6.5rem] flex-1 flex-col items-center"
            >
              <div
                className="flex h-40 w-full max-w-[11rem] items-end justify-center gap-2"
                role="img"
                aria-label={`${ciclo.label}: ${ciclo.favoraveis} favoráveis, ${ciclo.atencao} em atenção, ${ciclo.desfavoraveis} desfavoráveis`}
              >
                {SERIES.map((s) => {
                  const valor = ciclo[s.key];
                  const pct = Math.round((valor / max) * 100);
                  return (
                    <div
                      key={s.key}
                      className="flex h-full w-8 flex-col items-center justify-end sm:w-9"
                    >
                      <span
                        className={`mb-1 text-[11px] font-semibold tabular-nums ${s.text}`}
                      >
                        {valor}
                      </span>
                      <div
                        className={`w-full rounded-t-md ${s.bar}`}
                        style={{
                          height: `${Math.max(valor === 0 ? 4 : pct, 4)}%`,
                        }}
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
    </section>
  );
}
