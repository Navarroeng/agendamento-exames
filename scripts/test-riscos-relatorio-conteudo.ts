/**
 * Conteúdo executivo automático do relatório (sem alterar classificação COPSOQ).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  RiscosRelatorioDimensaoSnapshot,
  RiscosRelatorioRecord,
} from "../lib/riscos-relatorio";
import {
  analisarDimensao,
  analisarDimensaoRelatorio,
  gerarConteudoExecutivo,
  recomendacoesDimensao,
  textoPossiveisImpactos,
  textoResultadoEncontrado,
} from "../lib/riscos-relatorio-conteudo";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function dim(
  partial: Partial<RiscosRelatorioDimensaoSnapshot> &
    Pick<
      RiscosRelatorioDimensaoSnapshot,
      "id" | "nome" | "tipo" | "media" | "classificacaoId" | "classificacaoLabel"
    >
): RiscosRelatorioDimensaoSnapshot {
  return {
    entraNoCalculo: true,
    classificacaoInterpretacao: "",
    cor: "#000",
    respondentesValidos: 12,
    descricao: "",
    ...partial,
  };
}

const favoravel = dim({
  id: "lideranca",
  nome: "Liderança",
  tipo: "PROTECAO",
  media: 3.8,
  classificacaoId: "situacao_favoravel",
  classificacaoLabel: "Situação Favorável",
});

const intermediario = dim({
  id: "demandas-trabalho",
  nome: "Demandas de Trabalho",
  tipo: "RISCO",
  media: 2.5,
  classificacaoId: "risco_intermediario",
  classificacaoLabel: "Situação Moderada",
});

const critico = dim({
  id: "burnout-estresse",
  nome: "Burnout e Estresse",
  tipo: "RISCO",
  media: 3.9,
  classificacaoId: "risco_para_saude",
  classificacaoLabel: "Situação Desfavorável",
});

run("análise de dimensão cobre os 4 blocos técnicos", () => {
  const a = analisarDimensao(critico);
  assert.ok(a.oQueAvalia.includes("esgotamento"));
  assert.ok(a.resultadoEncontrado.includes("Situação Desfavorável"));
  assert.ok(a.possiveisImpactos.length > 40);
  assert.ok(a.recomendacoes.length >= 3);
});

run("texto com pontuação da dimensão na escala impressa", () => {
  const iface = dim({
    id: "interface-trabalho-individuo",
    nome: "Interface trabalho-indivíduo",
    tipo: "PROTECAO",
    media: 3,
    mediaBruta: 3,
    maxEscalaBruta: 3,
    maxEscalaPadronizada: 3,
    classificacaoId: "situacao_favoravel",
    classificacaoLabel: "Situação Favorável",
  });
  const t = textoResultadoEncontrado(iface);
  assert.match(t, /pontuação da categoria 3,00 \/ 3/i);
  assert.match(t, /Situação Favorável/);
});

run("resultado favorável vs crítico diverge na narrativa", () => {
  const f = textoResultadoEncontrado(favoravel);
  const c = textoResultadoEncontrado(critico);
  assert.ok(f.toLowerCase().includes("proteção") || f.toLowerCase().includes("positivas"));
  assert.ok(c.toLowerCase().includes("elevada") || c.toLowerCase().includes("requer atenção"));
  assert.match(c, /Situação Desfavorável/);
  assert.doesNotMatch(c, /intervenção|imediata|prioritár/i);
  assert.notEqual(f, c);
});

run("impactos intermediários mencionam prevenção", () => {
  const t = textoPossiveisImpactos(intermediario);
  assert.match(t, /Moderada|prevenção|janela/i);
});

run("recomendações de Situação Desfavorável são orientativas, sem urgência", () => {
  const fav = recomendacoesDimensao(favoravel);
  const cri = recomendacoesDimensao(critico);
  assert.ok(cri.length >= fav.length);
  assert.ok(
    cri.some((r) =>
      /avaliar os processos e a distribuição de responsabilidades/i.test(r)
    )
  );
  assert.ok(
    !cri.some((r) =>
      /intervenção imediata|priorizar intervenção|em até 30 dias|urgente/i.test(r)
    )
  );
});

run("conteúdo executivo é específico aos resultados da campanha", () => {
  const relatorio = {
    id: "r1",
    campanha_id: "c1",
    cliente_id: null,
    codigo_publico: "ABC123",
    empresa_nome: "Empresa Alpha",
    gerado_em: new Date().toISOString(),
    gerado_por: "Analista",
    gerado_por_user_id: null,
    participantes: 20,
    respondentes: 18,
    pendentes: 2,
    taxa_participacao: 90,
    status: "gerado",
    pdf_url: null,
    resultado_json: {
      versao: 2,
      capa: {
        empresaNome: "Empresa Alpha",
        codigoPublico: "ABC123",
        dataInicio: "2026-01-01",
        dataEncerramento: "2026-01-31",
        participantes: 20,
        respondentes: 18,
        pendentes: 2,
        taxaParticipacao: 90,
      },
      resumoExecutivo: {
        participacaoPercentual: 90,
        statusGeralMensagem: "x",
        quantidadeDimensoes: 3,
        dimensoesCriticas: [
          {
            id: critico.id,
            nome: critico.nome,
            classificacaoLabel: critico.classificacaoLabel,
          },
        ],
      },
      dimensoes: [favoravel, intermediario, critico],
      comportamentosOfensivos: {
        titulo: "",
        respondentesComAlgumaResposta: 0,
        media: null,
        classificacao: null,
        itens: [],
      },
      conclusao: null,
      recomendacoes: null,
    },
  } as RiscosRelatorioRecord;

  const out = gerarConteudoExecutivo(relatorio);
  assert.ok(out.resumoNarrativo.some((p) => p.includes("Empresa Alpha")));
  assert.ok(out.resumoNarrativo.some((p) => p.includes("ABC123")));
  assert.ok(out.resumoNarrativo.some((p) => /COPSOQ II-Br/i.test(p)));
  assert.ok(out.resumoNarrativo.some((p) => /finalidade subsidiar/i.test(p)));
  assert.ok(out.conclusaoTecnica.some((p) => /Situação Desfavorável/i.test(p)));
  assert.ok(
    out.conclusaoTecnica.some((p) =>
      /necessidade de atenção à categoria/i.test(p)
    )
  );
  assert.ok(
    out.recomendacoesGerais.some((p) =>
      /Situação Desfavorável/i.test(p)
    )
  );
  assert.ok(
    out.recomendacoesGerais.some((p) =>
      /envolvendo SST, RH e lideranças/i.test(p)
    )
  );
  assert.ok(
    !out.conclusaoTecnica.some((p) =>
      /intervenção prioritária|foco imediato|em até 30 dias/i.test(p)
    )
  );
  assert.ok(
    !out.recomendacoesGerais.some((p) =>
      /em até 30 dias|intervenção imediata|tratar, em até/i.test(p)
    )
  );

  const favoravelOnly = {
    ...relatorio,
    resultado_json: {
      ...relatorio.resultado_json,
      dimensoes: [favoravel],
      resumoExecutivo: {
        ...relatorio.resultado_json.resumoExecutivo,
        dimensoesCriticas: [],
      },
    },
  } as RiscosRelatorioRecord;
  const outOk = gerarConteudoExecutivo(favoravelOnly);
  assert.ok(outOk.resumoNarrativo.some((p) => /categorias/i.test(p)));
  assert.ok(
    outOk.recomendacoesGerais.some((p) => /manter as boas práticas/i.test(p))
  );
  assert.notEqual(
    out.conclusaoTecnica.join(" "),
    outOk.conclusaoTecnica.join(" ")
  );

  const intermediarioOnly = {
    ...relatorio,
    resultado_json: {
      ...relatorio.resultado_json,
      dimensoes: [favoravel, intermediario],
      resumoExecutivo: {
        ...relatorio.resultado_json.resumoExecutivo,
        dimensoesCriticas: [],
      },
    },
  } as RiscosRelatorioRecord;
  const outModerada = gerarConteudoExecutivo(intermediarioOnly);
  assert.equal(outModerada.recomendacoesGerais.length, 3);
  assert.match(
    outModerada.recomendacoesGerais[0],
    /Monitorar trimestralmente as categorias em Situação Moderada/
  );
  assert.match(
    outModerada.recomendacoesGerais[1],
    /Fortalecer comunicação interna, desenvolvimento de lideranças e clareza de papéis/
  );
  assert.match(
    outModerada.recomendacoesGerais[2],
    /Compartilhar este relatório com a direção e os responsáveis por SST\/RH/
  );
  assert.ok(
    !outModerada.recomendacoesGerais.some((p) => /PGR\/GRO|plano preventivo no sistema de gestão/i.test(p))
  );
  assert.ok(
    !out.recomendacoesGerais.some((p) => /PGR\/GRO|plano preventivo no sistema de gestão/i.test(p))
  );
  assert.ok(
    !outOk.recomendacoesGerais.some((p) => /PGR\/GRO|plano preventivo no sistema de gestão/i.test(p))
  );

  const helperSrc = readFileSync(
    join(process.cwd(), "lib/riscos-relatorio-conteudo.ts"),
    "utf8"
  );
  assert.doesNotMatch(
    helperSrc,
    /Registrar o plano preventivo no sistema de gestão/
  );
});

const ALARMISTA_RELATORIO =
  /interven[çc][aã]o\s+(imediat[ao]|priorit[áa]ri[ao])|foco imediato|priorizar interven|a[çc][aã]o imediat[ao]|em car[áa]ter de urg[êe]ncia|em at[eé] 30 dias|\burgente\b|\burg[êe]ncia\b|interven[çc][aã]o priorit[áa]ria|prioridade de interven/i;

function relatorioBase(
  dimensoes: RiscosRelatorioDimensaoSnapshot[]
): RiscosRelatorioRecord {
  return {
    id: "r1",
    campanha_id: "c1",
    cliente_id: null,
    codigo_publico: "ABC123",
    empresa_nome: "Empresa Alpha",
    gerado_em: new Date().toISOString(),
    gerado_por: "Analista",
    gerado_por_user_id: null,
    participantes: 20,
    respondentes: 18,
    pendentes: 2,
    taxa_participacao: 90,
    status: "gerado",
    pdf_url: null,
    resultado_json: {
      versao: 2,
      capa: {
        empresaNome: "Empresa Alpha",
        codigoPublico: "ABC123",
        dataInicio: "2026-01-01",
        dataEncerramento: "2026-01-31",
        participantes: 20,
        respondentes: 18,
        pendentes: 2,
        taxaParticipacao: 90,
      },
      resumoExecutivo: {
        participacaoPercentual: 90,
        statusGeralMensagem: "x",
        quantidadeDimensoes: dimensoes.length,
        dimensoesCriticas: dimensoes
          .filter(
            (d) =>
              d.classificacaoId === "risco_para_saude" ||
              d.classificacaoId === "risco_intermediario"
          )
          .map((d) => ({
            id: d.id,
            nome: d.nome,
            classificacaoLabel: d.classificacaoLabel,
          })),
      },
      dimensoes,
      comportamentosOfensivos: {
        titulo: "",
        respondentesComAlgumaResposta: 0,
        media: null,
        classificacao: null,
        itens: [],
      },
      conclusao: null,
      recomendacoes: null,
    },
  } as RiscosRelatorioRecord;
}

function textosGerados(
  dimensoes: RiscosRelatorioDimensaoSnapshot[]
): string {
  const exec = gerarConteudoExecutivo(relatorioBase(dimensoes));
  const blocos = dimensoes.flatMap((d) => {
    const full = analisarDimensao(d);
    const compacto = analisarDimensaoRelatorio(d);
    return [
      full.oQueAvalia,
      full.resultadoEncontrado,
      full.possiveisImpactos,
      ...full.recomendacoes,
      compacto.oQueAvalia,
      compacto.resultadoEncontrado,
      compacto.possiveisImpactos,
      ...compacto.recomendacoes,
    ];
  });
  return [
    ...exec.resumoNarrativo,
    ...exec.conclusaoTecnica,
    ...exec.recomendacoesGerais,
    ...blocos,
  ].join("\n");
}

run("relatório sem categoria desfavorável não usa linguagem alarmista", () => {
  const t = textosGerados([favoravel, intermediario]);
  assert.doesNotMatch(t, ALARMISTA_RELATORIO);
  assert.match(t, /Situação Moderada/);
  assert.doesNotMatch(
    gerarConteudoExecutivo(relatorioBase([favoravel, intermediario]))
      .conclusaoTecnica.join(" "),
    /Situação Desfavorável, recomendando/
  );
});

run("relatório com 1 categoria desfavorável usa tom orientativo", () => {
  const out = gerarConteudoExecutivo(relatorioBase([favoravel, critico]));
  const conclusao = out.conclusaoTecnica.join(" ");
  const recs = out.recomendacoesGerais.join(" ");
  assert.match(conclusao, /necessidade de atenção à categoria “Burnout e Estresse”/);
  assert.match(conclusao, /conforme a realidade da organização/);
  assert.match(recs, /Avaliar a categoria classificada como Situação Desfavorável/);
  assert.match(recs, /SST, RH e lideranças/);
  assert.doesNotMatch(conclusao, ALARMISTA_RELATORIO);
  assert.doesNotMatch(recs, ALARMISTA_RELATORIO);
  const card = analisarDimensaoRelatorio(critico);
  assert.match(card.resultadoEncontrado, /Situação Desfavorável/);
  assert.match(card.resultadoEncontrado, /requer atenção/);
  assert.match(
    card.recomendacoes[0],
    /Avaliar os processos e a distribuição de responsabilidades/
  );
  assert.doesNotMatch(card.resultadoEncontrado, ALARMISTA_RELATORIO);
  assert.ok(!card.recomendacoes.some((r) => ALARMISTA_RELATORIO.test(r)));
});

run("relatório com várias categorias desfavoráveis lista as categorias", () => {
  const liderancaCritica = dim({
    id: "lideranca",
    nome: "Liderança",
    tipo: "PROTECAO",
    media: 1.1,
    classificacaoId: "risco_para_saude",
    classificacaoLabel: "Situação Desfavorável",
  });
  const demandasCritica = dim({
    id: "demandas-trabalho",
    nome: "Demandas de Trabalho",
    tipo: "RISCO",
    media: 3.5,
    classificacaoId: "risco_para_saude",
    classificacaoLabel: "Situação Desfavorável",
  });
  const out = gerarConteudoExecutivo(
    relatorioBase([demandasCritica, liderancaCritica, critico])
  );
  const conclusao = out.conclusaoTecnica.join(" ");
  const recs = out.recomendacoesGerais.join(" ");
  assert.match(conclusao, /necessidade de atenção às categorias/);
  assert.match(conclusao, /Demandas de Trabalho/);
  assert.match(conclusao, /Liderança/);
  assert.match(conclusao, /Burnout e Estresse/);
  assert.match(recs, /Avaliar as categorias classificadas como Situação Desfavorável/);
  assert.doesNotMatch(conclusao, ALARMISTA_RELATORIO);
  assert.doesNotMatch(recs, ALARMISTA_RELATORIO);
  const protecao = analisarDimensaoRelatorio(liderancaCritica);
  assert.match(protecao.resultadoEncontrado, /Situação Desfavorável/);
  assert.match(protecao.resultadoEncontrado, /requer atenção/);
  assert.match(protecao.resultadoEncontrado, /reforço deste fator de proteção/);
});

run("helpers do relatório não geram as expressões alarmistas vetadas", () => {
  const t = textosGerados([favoravel, intermediario, critico]);
  assert.doesNotMatch(t, ALARMISTA_RELATORIO);
  const helperSrc = readFileSync(
    join(process.cwd(), "lib/riscos-relatorio-conteudo.ts"),
    "utf8"
  );
  assert.doesNotMatch(helperSrc, /intervenção imediata|foco imediato|em até 30 dias/i);
  const viewSrc = readFileSync(
    join(process.cwd(), "lib/riscos-relatorio-view.ts"),
    "utf8"
  );
  assert.doesNotMatch(viewSrc, /Atenção prioritária|intervenção prioritária/);
});

console.log("\nTodos os testes de conteúdo executivo passaram.");
