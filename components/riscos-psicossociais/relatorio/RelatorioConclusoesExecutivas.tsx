"use client";

import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import {
  gerarConteudoExecutivo,
  type ItemPlanoAcao,
} from "@/lib/riscos-relatorio-conteudo";

function prioridadeClass(p: ItemPlanoAcao["prioridade"]): string {
  if (p === "Alta") return "bg-[#fee2e2] text-[#b91c1c]";
  if (p === "Média") return "bg-[#fef9c3] text-[#a16207]";
  return "bg-[#dcfce7] text-[#15803d]";
}

export function RelatorioConclusoesExecutivas({
  relatorio,
}: {
  relatorio: RiscosRelatorioRecord;
}) {
  const {
    conclusaoTecnica,
    recomendacoesGerais,
    planoAcao,
  } = gerarConteudoExecutivo(relatorio);

  return (
    <section className="space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Síntese técnica
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
          Conclusão, recomendações e plano de ação
        </h3>
        <p className="mt-1 text-xs text-app-muted sm:text-sm">
          Textos gerados automaticamente a partir do snapshot persistido desta
          campanha — específicos para os resultados encontrados.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#e8edf5] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h4 className="text-sm font-extrabold text-navy">Conclusão Técnica</h4>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-navy sm:text-sm">
            {conclusaoTecnica.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#e8edf5] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h4 className="text-sm font-extrabold text-navy">
            Recomendações Gerais
          </h4>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-navy sm:text-sm">
            {recomendacoesGerais.map((r) => (
              <li key={r.slice(0, 48)} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-extrabold text-navy">Plano de Ação</h4>
        <p className="mt-1 text-xs text-app-muted">
          Plano inicial sugerido para a organização. Prioridade e prazos
          variam conforme a severidade da classificação COPSOQ.
        </p>

        <div className="mt-3 overflow-x-auto rounded-3xl border border-[#e8edf5] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              <tr>
                <th className="px-3 py-3">Prioridade</th>
                <th className="px-3 py-3">Dimensão</th>
                <th className="px-3 py-3">Ação recomendada</th>
                <th className="px-3 py-3">Objetivo</th>
                <th className="px-3 py-3">Responsável sugerido</th>
                <th className="px-3 py-3">Prazo</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f7]">
              {planoAcao.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-app-muted"
                  >
                    Sem itens de plano para as dimensões disponíveis.
                  </td>
                </tr>
              ) : (
                planoAcao.map((item) => (
                  <tr key={`${item.dimensaoId}-${item.acao.slice(0, 24)}`}>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${prioridadeClass(item.prioridade)}`}
                      >
                        {item.prioridade}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-navy">
                      {item.dimensaoNome}
                    </td>
                    <td className="max-w-[220px] px-3 py-3 text-navy">
                      {item.acao}
                    </td>
                    <td className="max-w-[200px] px-3 py-3 text-app-muted">
                      {item.objetivo}
                    </td>
                    <td className="px-3 py-3 text-navy">
                      {item.responsavelSugerido}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-navy">
                      {item.prazoSugerido}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#64748b]">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
