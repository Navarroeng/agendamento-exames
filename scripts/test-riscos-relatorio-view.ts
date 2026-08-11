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
  const barras = montarDadosBarras(amostra);
  assert.equal(barras[0].media >= barras[1].media, true);
  assert.equal(barras.every((b) => b.cor.startsWith("#")), true);
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
