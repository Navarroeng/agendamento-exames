/**
 * Helpers de apresentação do relatório executivo (V2) — sem recalcular COPSOQ.
 */
import assert from "node:assert/strict";
import type { RiscosRelatorioDimensaoSnapshot } from "../lib/riscos-relatorio";
import {
  corPorClassificacaoId,
  dimensoesOrdenadasPorMediaDesc,
  montarDadosBarras,
  montarDadosRadar,
  rankingAtencao,
  rankingMelhores,
  scoreFavorabilidade,
  statusGeralResumo,
  valorVisualBarraDimensao,
} from "../lib/riscos-relatorio-view";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function dim(
  partial: Partial<RiscosRelatorioDimensaoSnapshot> &
    Pick<
      RiscosRelatorioDimensaoSnapshot,
      "id" | "nome" | "tipo" | "media" | "classificacaoId"
    >
): RiscosRelatorioDimensaoSnapshot {
  return {
    entraNoCalculo: true,
    classificacaoLabel: partial.classificacaoId,
    classificacaoInterpretacao: "",
    cor: "#000",
    respondentesValidos: 10,
    descricao: "",
    ...partial,
  };
}

const amostra: RiscosRelatorioDimensaoSnapshot[] = [
  dim({
    id: "a",
    nome: "Demandas de Trabalho",
    tipo: "RISCO",
    media: 3.8,
    classificacaoId: "risco_para_saude",
  }),
  dim({
    id: "b",
    nome: "Liderança",
    tipo: "PROTECAO",
    media: 3.9,
    classificacaoId: "situacao_favoravel",
  }),
  dim({
    id: "c",
    nome: "Burnout e Estresse",
    tipo: "RISCO",
    media: 2.5,
    classificacaoId: "risco_intermediario",
  }),
  dim({
    id: "d",
    nome: "Saúde Geral",
    tipo: "PROTECAO",
    media: 3.5,
    classificacaoId: "situacao_favoravel",
  }),
  dim({
    id: "e",
    nome: "Valores",
    tipo: "PROTECAO",
    media: 2.5,
    classificacaoId: "risco_intermediario",
  }),
  dim({
    id: "f",
    nome: "Ofensivos",
    tipo: "RISCO",
    media: null,
    classificacaoId: "classificacao_nao_definida",
    entraNoCalculo: false,
  }),
];

run("cores padronizadas por classificação oficial", () => {
  assert.equal(corPorClassificacaoId("situacao_favoravel"), "#16a34a");
  assert.equal(corPorClassificacaoId("risco_intermediario"), "#ea580c");
  assert.equal(corPorClassificacaoId("risco_para_saude"), "#dc2626");
});

run("barras ordenadas da maior média para a menor", () => {
  const ordered = dimensoesOrdenadasPorMediaDesc(amostra);
  assert.equal(ordered[0].id, "b");
  assert.equal(ordered[0].media, 3.9);
  assert.equal(ordered[ordered.length - 1].media, 2.5);
});

run("barras: RISCO inverte comprimento visual; PROTEÇÃO preserva média técnica", () => {
  const perfeitoRisco = dim({
    id: "demandas-trabalho",
    nome: "Demandas de Trabalho",
    tipo: "RISCO",
    media: 0,
    classificacaoId: "situacao_favoravel",
    classificacaoLabel: "Situação Favorável",
  });
  const perfeitoProt = dim({
    id: "interface-trabalho-individuo",
    nome: "Interface trabalho-indivíduo",
    tipo: "PROTECAO",
    media: 4,
    classificacaoId: "situacao_favoravel",
    classificacaoLabel: "Situação Favorável",
  });
  const burnout = dim({
    id: "burnout-estresse",
    nome: "Burnout e Estresse",
    tipo: "RISCO",
    media: 0,
    classificacaoId: "situacao_favoravel",
  });
  const conflitos = dim({
    id: "conflitos-familia-trabalho",
    nome: "Conflitos família-trabalho",
    tipo: "RISCO",
    media: 0,
    classificacaoId: "situacao_favoravel",
  });
  const criticoRisco = dim({
    id: "critico",
    nome: "Risco alto",
    tipo: "RISCO",
    media: 4,
    classificacaoId: "risco_para_saude",
  });

  assert.equal(valorVisualBarraDimensao(perfeitoRisco), 4);
  assert.equal(valorVisualBarraDimensao(burnout), 4);
  assert.equal(valorVisualBarraDimensao(conflitos), 4);
  assert.equal(valorVisualBarraDimensao(perfeitoProt), 4);
  assert.equal(valorVisualBarraDimensao(criticoRisco), 0);
  assert.equal(valorVisualBarraDimensao({ media: 1, tipo: "RISCO" }), 3);
  assert.equal(valorVisualBarraDimensao({ media: 3, tipo: "RISCO" }), 1);

  const barras = montarDadosBarras([
    perfeitoRisco,
    perfeitoProt,
    burnout,
    conflitos,
    criticoRisco,
  ]);
  const byId = Object.fromEntries(barras.map((b) => [b.id, b]));
  assert.equal(byId["demandas-trabalho"].media, 0);
  assert.equal(byId["demandas-trabalho"].valorVisual, 4);
  assert.equal(byId["demandas-trabalho"].cor, "#16a34a");
  assert.equal(byId["burnout-estresse"].valorVisual, 4);
  assert.equal(byId["conflitos-familia-trabalho"].valorVisual, 4);
  assert.equal(byId["interface-trabalho-individuo"].media, 4);
  assert.equal(byId["interface-trabalho-individuo"].valorVisual, 4);
  assert.equal(byId["critico"].media, 4);
  assert.equal(byId["critico"].valorVisual, 0);
  assert.equal(byId["critico"].cor, "#dc2626");
  // Ordenação visual: maior favorabilidade primeiro
  assert.equal(barras[0].valorVisual >= barras[barras.length - 1].valorVisual, true);
});

run("radar ignora dimensões fora do cálculo", () => {
  const radar = montarDadosRadar(amostra);
  assert.equal(radar.length, 5);
  assert.equal(
    radar.every((r) => r.fullMark === 4 && typeof r.media === "number"),
    true
  );
});

run("ranking melhores prioriza situação favorável", () => {
  const top = rankingMelhores(amostra, 2);
  assert.equal(top[0].classificacaoId, "situacao_favoravel");
  assert.equal(top.every((d) => d.entraNoCalculo), true);
});

run("ranking atenção prioriza risco para saúde", () => {
  const top = rankingAtencao(amostra, 2);
  assert.equal(top[0].classificacaoId, "risco_para_saude");
});

run("score favorabilidade respeita tipo RISCO vs PROTEÇÃO", () => {
  assert.ok(
    scoreFavorabilidade({ media: 1, tipo: "RISCO" }) >
      scoreFavorabilidade({ media: 3, tipo: "RISCO" })
  );
  assert.ok(
    scoreFavorabilidade({ media: 3.5, tipo: "PROTECAO" }) >
      scoreFavorabilidade({ media: 2, tipo: "PROTECAO" })
  );
});

run("status geral por quantidade de críticas", () => {
  assert.equal(statusGeralResumo({ dimensoesCriticasCount: 0 }).tom, "ok");
  assert.equal(statusGeralResumo({ dimensoesCriticasCount: 1 }).tom, "atencao");
  assert.equal(statusGeralResumo({ dimensoesCriticasCount: 3 }).tom, "critico");
});

console.log("\nTodos os testes de view do relatório passaram.");
