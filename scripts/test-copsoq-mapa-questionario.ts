/**
 * Mapa informativo do questionário COPSOQ II (categoria → perguntas).
 * Consome COPSOQ_PERGUNTAS / COPSOQ_DIMENSOES — sem tabela paralela.
 */
import assert from "node:assert/strict";
import { COPSOQ_DIMENSOES } from "../lib/copsoq/dimensoes";
import { COPSOQ_PERGUNTAS } from "../lib/copsoq/perguntas";
import { perguntasCalculoDaDimensao } from "../lib/copsoq-engine/dimensions";
import {
  filtrarMapaQuestionario,
  montarMapaQuestionarioCopsoq,
  todasCategoriasDoMapa,
} from "../lib/copsoq/mapa-questionario";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const mapa = montarMapaQuestionarioCopsoq();
const todas = todasCategoriasDoMapa(mapa);

run("totais do instrumento no mapa", () => {
  assert.equal(COPSOQ_PERGUNTAS.length, 40);
  assert.equal(mapa.totais.perguntas, 40);
  assert.equal(mapa.totais.categoriasAvaliadas, 10);
  assert.equal(mapa.totais.indicadoresOfensivos, 4);
  assert.equal(
    COPSOQ_PERGUNTAS.filter((p) => p.entraNoCalculo).length,
    36
  );
  assert.equal(
    COPSOQ_PERGUNTAS.filter((p) => p.dimensaoId === "comportamentos-ofensivos")
      .length,
    4
  );
});

run("nenhuma pergunta sem dimensaoId e nenhuma duplicada no mapa", () => {
  for (const p of COPSOQ_PERGUNTAS) {
    assert.ok(p.dimensaoId, `sem dimensaoId: ${p.codigo}`);
  }
  const ids = todas.flatMap((c) => c.perguntas.map((p) => p.id));
  assert.equal(ids.length, 40);
  assert.equal(new Set(ids).size, 40);
  const ordens = todas.flatMap((c) => c.perguntas.map((p) => p.ordem));
  assert.equal(new Set(ordens).size, 40);
});

run("10 categorias principais + 1 seção ofensiva", () => {
  assert.equal(mapa.categoriasAvaliadas.length, 10);
  assert.ok(mapa.comportamentosOfensivos);
  assert.equal(mapa.comportamentosOfensivos?.id, "comportamentos-ofensivos");
  assert.equal(mapa.comportamentosOfensivos?.entraNoCalculo, false);
  assert.ok(mapa.categoriasAvaliadas.every((c) => c.entraNoCalculo));
});

run("agrupamento idêntico ao cálculo (dimensaoId)", () => {
  for (const dim of COPSOQ_DIMENSOES.filter((d) => d.entraNoCalculo)) {
    const doMapa = mapa.categoriasAvaliadas.find((c) => c.id === dim.id);
    assert.ok(doMapa, dim.id);
    const doCalculo = perguntasCalculoDaDimensao(dim.id).map((p) => p.id);
    assert.deepEqual(
      doMapa!.perguntas.map((p) => p.id),
      doCalculo
    );
  }
});

run("faixas visuais 01–40 por categoria", () => {
  const porId = Object.fromEntries(todas.map((c) => [c.id, c]));
  const faixa = (id: string) =>
    porId[id]!.perguntas.map((p) => p.numeroVisual);

  assert.deepEqual(faixa("demandas-trabalho"), [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
  ]);
  assert.deepEqual(faixa("influencia-desenvolvimento"), [
    "07",
    "08",
    "09",
    "10",
  ]);
  assert.deepEqual(faixa("significado-comprometimento"), [
    "11",
    "12",
    "13",
    "14",
  ]);
  assert.deepEqual(faixa("relacoes-interpessoais"), [
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
  ]);
  assert.deepEqual(faixa("lideranca"), ["21", "22", "23", "24"]);
  assert.deepEqual(faixa("interface-trabalho-individuo"), ["25"]);
  assert.deepEqual(faixa("conflitos-familia-trabalho"), ["26", "27"]);
  assert.deepEqual(faixa("valores-local-trabalho"), [
    "28",
    "29",
    "30",
    "31",
  ]);
  assert.deepEqual(faixa("saude-geral"), ["32"]);
  assert.deepEqual(faixa("burnout-estresse"), ["33", "34", "35", "36"]);
  assert.deepEqual(faixa("comportamentos-ofensivos"), [
    "37",
    "38",
    "39",
    "40",
  ]);
});

run("códigos oficiais das faixas-chave", () => {
  const ofensivos = mapa.comportamentosOfensivos!.perguntas;
  assert.deepEqual(
    ofensivos.map((p) => p.codigo),
    ["20", "21", "22", "23"]
  );
  assert.equal(
    mapa.categoriasAvaliadas.find((c) => c.id === "lideranca")?.perguntas[2]
      ?.codigo,
    "12A"
  );
});

run("follow-ups não entram no mapa das 40", () => {
  const textos = todas.flatMap((c) => c.perguntas.map((p) => p.texto));
  assert.ok(!textos.some((t) => /se sim, de quem/i.test(t)));
  assert.equal(
    COPSOQ_PERGUNTAS.filter((p) => p.followUp).length,
    4
  );
});

function idsEncontrados(busca: string): string[] {
  const out = filtrarMapaQuestionario(mapa, busca);
  return todasCategoriasDoMapa(out).flatMap((c) =>
    c.perguntas.map((p) => `${p.numeroVisual}:${p.codigo}`)
  );
}

run("busca 01 e 1A localizam a primeira pergunta", () => {
  assert.ok(idsEncontrados("01").some((x) => x.startsWith("01:")));
  assert.ok(idsEncontrados("1A").some((x) => x.endsWith(":1A")));
});

run("busca 23 encontra visual 23 e código 23", () => {
  const ids = idsEncontrados("23");
  assert.ok(ids.includes("23:12A"));
  assert.ok(ids.includes("40:23"));
});

run("busca 11A encontra o código oficial", () => {
  assert.ok(idsEncontrados("11A").some((x) => x.endsWith(":11A")));
});

run("busca 20 encontra visual 20 e código 20", () => {
  const ids = idsEncontrados("20");
  assert.ok(ids.includes("20:10B"));
  assert.ok(ids.includes("37:20"));
});

run("busca liderança mostra a categoria Liderança", () => {
  const out = filtrarMapaQuestionario(mapa, "liderança");
  assert.equal(out.categoriasAvaliadas.length, 1);
  assert.equal(out.categoriasAvaliadas[0]?.id, "lideranca");
  assert.equal(out.categoriasAvaliadas[0]?.perguntas.length, 4);
});

run("busca superior imediato localiza perguntas de liderança", () => {
  const out = filtrarMapaQuestionario(mapa, "superior imediato");
  assert.ok(out.categoriasAvaliadas.some((c) => c.id === "lideranca"));
  const lider = out.categoriasAvaliadas.find((c) => c.id === "lideranca")!;
  assert.ok(
    lider.perguntas.some((p) => /superior imediato/i.test(p.texto))
  );
});

run("busca saúde e burnout localizam as categorias", () => {
  assert.ok(
    filtrarMapaQuestionario(mapa, "saúde").categoriasAvaliadas.some(
      (c) => c.id === "saude-geral"
    )
  );
  assert.ok(
    filtrarMapaQuestionario(mapa, "burnout").categoriasAvaliadas.some(
      (c) => c.id === "burnout-estresse"
    )
  );
});

run("busca bullying localiza comportamentos ofensivos", () => {
  const out = filtrarMapaQuestionario(mapa, "bullying");
  assert.ok(out.comportamentosOfensivos);
  assert.ok(
    out.comportamentosOfensivos?.perguntas.some((p) =>
      /bullying/i.test(p.texto)
    )
  );
});

run("mapa não altera o instrumento", () => {
  assert.equal(COPSOQ_PERGUNTAS.length, 40);
  assert.equal(COPSOQ_DIMENSOES.length, 11);
  assert.equal(
    COPSOQ_DIMENSOES.find((d) => d.id === "comportamentos-ofensivos")
      ?.entraNoCalculo,
    false
  );
});

console.log("\nTodos os testes do mapa do questionário passaram.");
