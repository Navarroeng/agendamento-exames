"use client";

import type { RiscosRelatorioResultadoJson } from "@/lib/riscos-relatorio";

function PlaceholderIa({
  titulo,
  conteudo,
}: {
  titulo: string;
  conteudo: string | null | undefined;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#c7d2fe] bg-gradient-to-br from-[#eef1ff] to-white p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand-blue px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
          IA · em breve
        </span>
        <h4 className="text-sm font-extrabold text-navy">{titulo}</h4>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-app-muted">
        {conteudo?.trim()
          ? conteudo
          : "Espaço reservado. Nesta etapa futura, a inteligência artificial preencherá automaticamente este bloco com base no snapshot persistido das dimensões COPSOQ — sem recalcular resultados."}
      </p>
    </div>
  );
}

export function RelatorioSecoesIa({
  json,
}: {
  json: RiscosRelatorioResultadoJson | null | undefined;
}) {
  return (
    <section>
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Próxima geração
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
          Conclusão, recomendações e plano de ação
        </h3>
        <p className="mt-1 text-xs text-app-muted sm:text-sm">
          Estrutura preparada para conteúdo gerado por IA a partir do relatório
          já persistido.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <PlaceholderIa titulo="Conclusão Técnica" conteudo={json?.conclusao} />
        <PlaceholderIa titulo="Recomendações" conteudo={json?.recomendacoes} />
        <PlaceholderIa titulo="Plano de Ação" conteudo={null} />
      </div>
    </section>
  );
}
