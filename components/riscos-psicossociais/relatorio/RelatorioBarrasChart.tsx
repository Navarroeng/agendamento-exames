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
  /** Negativo (poucas barras) mais baixo; positivo mantém área útil maior. */
  const compacto = tipo === "RISCO" || itens.length <= 4;
  const areaH = compacto ? "h-28" : "h-40";

  return (
    <section className="relatorio-colunas-bloco riscos-relatorio-print-card">
      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Comparativo
        </p>
        <h3 className="mt-1 text-[13px] font-extrabold uppercase tracking-wide text-navy sm:text-sm">
          {titulo}
        </h3>
        <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-app-muted">
          {subtitulo}
        </p>
      </div>

      <div className="rounded-xl border border-[#e8edf5] bg-white px-2.5 py-2.5 sm:px-3.5 sm:py-3">
        <div className="relatorio-colunas-area flex gap-1.5 sm:gap-2">
          <div
            className={`relative flex w-6 shrink-0 flex-col justify-between sm:w-7 ${areaH}`}
          >
            {[...ticks].reverse().map((t) => (
              <span
                key={t}
                className="text-right text-[9px] font-semibold tabular-nums text-[#94a3b8]"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
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

            <div
              className={`relative flex items-end justify-around gap-1 px-0.5 sm:gap-1.5 sm:px-1 ${areaH}`}
            >
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

        <ul
          className={`relatorio-colunas-legenda mt-2.5 grid grid-cols-1 gap-x-5 border-t border-[#eef2f7] pt-2 sm:grid-cols-2 ${
            compacto ? "gap-y-1.5" : "gap-y-2"
          }`}
        >
          {itens.map((item) => (
            <li key={item.id} className="min-w-0">
              <p className="text-[11px] font-extrabold leading-snug text-navy">
                {item.nome}
              </p>
              <div
                className="relatorio-coluna-legenda-linha mt-0.5 h-1 w-full max-w-[9rem] rounded-full"
                style={{ backgroundColor: item.cor }}
                aria-hidden
              />
              <p className="mt-0.5 text-[12px] font-extrabold tabular-nums text-navy">
                {formatPontuacaoComMaximo(item.media, item.maxEscala)}
                <span className="ml-1.5 text-[10px] font-semibold text-[#64748b]">
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
      <p className="mb-1 max-w-full px-0.5 text-center text-[10px] font-extrabold tabular-nums leading-none text-navy">
        {pontuacao}
      </p>
      <div className="flex w-full flex-1 items-end justify-center">
        <div
          className="relatorio-coluna-fill w-[72%] max-w-[3rem] min-h-[4px] rounded-t-md sm:w-[68%] sm:max-w-[3.25rem]"
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
    <div className="relatorio-graficos-comparativos flex flex-col gap-[10mm]">
      <GraficoColunasGrupo
        titulo="Gráfico de pontuações para categorias positivas"
        subtitulo="Somente categorias de PROTEÇÃO. Altura da coluna = pontuação técnica na escala impressa. Cores identificam a categoria."
        tipo="PROTECAO"
        dimensoes={dimensoes}
      />
      <GraficoColunasGrupo
        titulo="Gráfico de pontuações para categorias negativas"
        subtitulo="Somente categorias de RISCO. Altura da coluna = pontuação técnica na escala impressa. Cores identificam a categoria."
        tipo="RISCO"
        dimensoes={dimensoes}
      />
    </div>
  );
}
