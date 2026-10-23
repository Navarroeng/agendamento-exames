"use client";

import {
  eixoQuantidadeVencimentos,
  rotuloColunaVencimento,
  type ColunaVencimentoMes,
} from "@/lib/cliente-contrato-vencimentos";

const ABREVIACAO_MES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

const ALTURA_PLOT = 96;

interface ClienteContratoVencimentosChartProps {
  ano: number;
  colunas: ColunaVencimentoMes[];
  onSelecionarMes: (mes: number) => void;
}

export function ClienteContratoVencimentosChart({
  ano,
  colunas,
  onSelecionarMes,
}: ClienteContratoVencimentosChartProps) {
  const maximo = Math.max(0, ...colunas.map((coluna) => coluna.quantidade));
  const eixo = eixoQuantidadeVencimentos(maximo);

  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-extrabold text-navy">
        Vencimentos por mês — {ano}
      </h3>
      <div className="overflow-x-auto">
        <div
          className="flex min-w-[560px] gap-2"
          role="group"
          aria-label={`Vencimentos por mês — ${ano}`}
        >
          <div className="grid w-7 shrink-0 grid-rows-[16px_96px_16px_6px]" aria-hidden>
            <span />
            <div className="relative">
              {eixo.map((valor) => (
                <span
                  key={valor}
                  className="absolute right-0 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-[#94a3b8]"
                  style={{
                    bottom: maximo === 0 ? "0%" : `${(valor / maximo) * 100}%`,
                  }}
                >
                  {valor}
                </span>
              ))}
            </div>
            <span />
            <span />
          </div>
          <div className="grid flex-1 grid-cols-12 gap-1">
            {colunas.map((coluna) => {
              const rotulo = rotuloColunaVencimento(
                ano,
                coluna.mes,
                coluna.quantidade
              );
              const altura =
                maximo === 0 || coluna.quantidade === 0
                  ? 2
                  : (coluna.quantidade / maximo) * ALTURA_PLOT;
              const descricao = coluna.maior
                ? `${rotulo}. Maior quantidade do ano.`
                : rotulo;
              return (
                <button
                  key={coluna.mes}
                  type="button"
                  className="grid min-w-0 grid-rows-[16px_96px_16px_6px] items-center rounded-md hover:bg-[#f4f6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
                  aria-pressed={coluna.selecionado}
                  aria-label={descricao}
                  title={descricao}
                  onClick={() => onSelecionarMes(coluna.mes)}
                >
                  <span
                    className={`text-center text-[10px] font-bold tabular-nums leading-4 ${
                      coluna.selecionado ? "text-brand-blue" : "text-[#52617a]"
                    }`}
                  >
                    {coluna.quantidade}
                  </span>
                  <span className="flex h-[96px] items-end">
                    <span
                      className={`block w-full rounded-t-md ${
                        coluna.selecionado ? "bg-brand-blue" : "bg-[#c5ceff]"
                      } ${coluna.maior ? "ring-1 ring-inset ring-[#64748b]/50" : ""}`}
                      style={{ height: altura }}
                    />
                  </span>
                  <span
                    className={`text-center text-[10px] font-semibold leading-4 ${
                      coluna.selecionado ? "text-brand-blue" : "text-[#64748b]"
                    }`}
                  >
                    {ABREVIACAO_MES[coluna.mes - 1]}
                  </span>
                  <span
                    className={`mx-auto h-1.5 w-1.5 rounded-full ${
                      coluna.maior ? "bg-[#64748b]" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
