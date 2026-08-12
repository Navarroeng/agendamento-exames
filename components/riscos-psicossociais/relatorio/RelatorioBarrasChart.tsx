"use client";

import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import {
  eixoMaxColunas,
  formatPontuacaoComMaximo,
  montarDadosColunasPorTipo,
  type ColunaChartDatum,
  type TipoColunaGrafico,
} from "@/lib/riscos-relatorio-view";

function ticksEixo(max: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= max; i++) out.push(i);
  return out;
}

function GraficoColunasGrupo({
  titulo,
  subtitulo,
  tipo,
  dimensoes,
}: {
  titulo: string;
  subtitulo: string;
  tipo: TipoColunaGrafico;
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const itens = montarDadosColunasPorTipo(dimensoes, tipo);
  if (itens.length === 0) return null;

  const eixoMax = eixoMaxColunas(itens);
  const ticks = ticksEixo(eixoMax);

  return (
    <section className="relatorio-colunas-bloco riscos-relatorio-print-card">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Comparativo
        </p>
        <h3 className="mt-1 text-base font-extrabold uppercase tracking-wide text-navy sm:text-lg">
          {titulo}
        </h3>
        <p className="mt-1 max-w-2xl text-xs text-app-muted sm:text-sm">
          {subtitulo}
        </p>
      </div>

      <div className="rounded-3xl border border-[#e8edf5] bg-white px-3 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:px-6 sm:py-6">
        {/* Área do gráfico */}
        <div className="relatorio-colunas-area flex gap-2 sm:gap-3">
          {/* Eixo Y */}
          <div className="relative flex h-52 w-7 shrink-0 flex-col justify-between sm:h-60 sm:w-8">
            {[...ticks].reverse().map((t) => (
              <span
                key={t}
                className="text-right text-[10px] font-semibold tabular-nums text-[#94a3b8]"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {/* Linhas de grade */}
            <div
              className="pointer-events-none absolute inset-0 flex flex-col justify-between border-b border-l border-[#e2e8f0]"
              aria-hidden
            >
              {ticks.map((t) => (
                <div
                  key={t}
                  className="w-full border-t border-[#eef2f7] first:border-t-0"
                />
              ))}
            </div>

            <div className="relative flex h-52 items-end justify-around gap-1 px-1 sm:h-60 sm:gap-2 sm:px-2">
              {itens.map((item) => (
                <ColunaVertical
                  key={item.id}
                  item={item}
                  eixoMax={eixoMax}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <ul className="relatorio-colunas-legenda mt-6 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-[#eef2f7] pt-5 sm:grid-cols-2">
          {itens.map((item) => (
            <li key={item.id} className="min-w-0">
              <p className="text-[13px] font-extrabold leading-snug text-navy">
                {item.nome}
              </p>
              <div
                className="relatorio-coluna-legenda-linha mt-1.5 h-1 w-full max-w-[11rem] rounded-full"
                style={{ backgroundColor: item.cor }}
                aria-hidden
              />
              <p className="mt-1.5 text-sm font-extrabold tabular-nums text-navy">
                {formatPontuacaoComMaximo(item.media, item.maxEscala)}
                <span className="ml-1.5 text-[11px] font-semibold text-[#64748b]">
                  · {item.classificacaoLabel}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ColunaVertical({
  item,
  eixoMax,
}: {
  item: ColunaChartDatum;
  eixoMax: number;
}) {
  const alturaPct =
    eixoMax > 0
      ? Math.max(0, Math.min(100, (item.media / eixoMax) * 100))
      : 0;
  const pontuacao = formatPontuacaoComMaximo(item.media, item.maxEscala);

  return (
    <div className="relatorio-coluna-item flex h-full min-w-0 flex-1 flex-col items-center justify-end">
      <p className="mb-1.5 max-w-full truncate px-0.5 text-center text-[10px] font-extrabold tabular-nums leading-none text-navy sm:text-[11px]">
        {pontuacao}
      </p>
      <div className="flex w-full flex-1 items-end justify-center">
        <div
          className="relatorio-coluna-fill w-[72%] max-w-[3.25rem] min-h-[4px] rounded-t-lg sm:w-[68%] sm:max-w-[3.75rem]"
          style={{
            height: `${alturaPct}%`,
            backgroundColor: item.cor,
          }}
          role="img"
          aria-label={`${item.nome}: ${pontuacao}`}
        />
      </div>
    </div>
  );
}

export function RelatorioBarrasChart({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const positivas = montarDadosColunasPorTipo(dimensoes, "PROTECAO");
  const negativas = montarDadosColunasPorTipo(dimensoes, "RISCO");

  if (positivas.length === 0 && negativas.length === 0) {
    return null;
  }

  return (
    <div className="space-y-10">
      <GraficoColunasGrupo
        titulo="Gráfico de pontuações para categorias positivas"
        subtitulo="Somente categorias de PROTEÇÃO. A altura da coluna reflete a pontuação técnica na escala impressa (0–3 ou 0–4), sem conversão. Cores identificam a categoria; a classificação aparece na legenda."
        tipo="PROTECAO"
        dimensoes={dimensoes}
      />
      <GraficoColunasGrupo
        titulo="Gráfico de pontuações para categorias negativas"
        subtitulo="Somente categorias de RISCO. A altura da coluna reflete a pontuação técnica na escala impressa (0–3 ou 0–4), sem conversão. Cores identificam a categoria; a classificação aparece na legenda."
        tipo="RISCO"
        dimensoes={dimensoes}
      />
    </div>
  );
}
