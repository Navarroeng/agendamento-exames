/**
 * Empacotamento A4 do relatório — não altera cálculos COPSOQ.
 */
import assert from "node:assert/strict";
import {
  calcularRodapesSecaoViewer,
  empacotarRelatorioEmFolhas,
  empacotarSecaoRelatorio,
} from "../lib/riscos-relatorio-paginacao";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("seção única que cabe vira uma folha", () => {
  const folhas = empacotarSecaoRelatorio(
    {
      id: "visao",
      cabecalhoAltura: 0,
      itens: [
        { id: "principal", altura: 400 },
        { id: "atencao", altura: 120 },
      ],
      colunas: 1,
      gap: 24,
    },
    700
  );
  assert.equal(folhas.length, 1);
  assert.deepEqual(folhas[0].itemIds, ["principal", "atencao"]);
});

run("item que não cabe no restante vai para a próxima folha da mesma seção", () => {
  const folhas = empacotarSecaoRelatorio(
    {
      id: "visao",
      cabecalhoAltura: 0,
      itens: [
        { id: "principal", altura: 500 },
        { id: "atencao", altura: 200 },
      ],
      colunas: 1,
      gap: 24,
    },
    520
  );
  assert.equal(folhas.length, 2);
  assert.deepEqual(folhas[0].itemIds, ["principal"]);
  assert.deepEqual(folhas[1].itemIds, ["atencao"]);
});

run("seções seguintes nunca ocupam o restante da anterior", () => {
  const folhas = empacotarRelatorioEmFolhas(
    [
      {
        id: "visao",
        cabecalhoAltura: 0,
        itens: [{ id: "principal", altura: 200 }],
        colunas: 1,
        gap: 0,
      },
      {
        id: "panorama",
        cabecalhoAltura: 80,
        itens: [
          { id: "a", altura: 100 },
          { id: "b", altura: 100 },
        ],
        colunas: 2,
        gap: 8,
      },
    ],
    700
  );
  assert.equal(folhas.length, 2);
  assert.equal(folhas[0].secaoId, "visao");
  assert.equal(folhas[1].secaoId, "panorama");
  assert.equal(folhas[1].cabecalho, true);
  assert.deepEqual(folhas[1].itemIds, ["a", "b"]);
});

run("grid 2 colunas empacota por linha e não corta card", () => {
  const folhas = empacotarSecaoRelatorio(
    {
      id: "panorama",
      cabecalhoAltura: 90,
      itens: [
        { id: "1", altura: 120 },
        { id: "2", altura: 110 },
        { id: "3", altura: 130 },
        { id: "4", altura: 125 },
        { id: "5", altura: 140 },
      ],
      colunas: 2,
      gap: 8,
    },
    90 + 120 + 8 + 130
  );
  assert.equal(folhas.length, 2);
  assert.deepEqual(folhas[0].itemIds, ["1", "2", "3", "4"]);
  assert.equal(folhas[0].cabecalho, true);
  assert.deepEqual(folhas[1].itemIds, ["5"]);
  assert.equal(folhas[1].cabecalho, false);
});

run("item maior que a folha ainda é colocado (não gera folha vazia)", () => {
  const folhas = empacotarSecaoRelatorio(
    {
      id: "graficos",
      cabecalhoAltura: 0,
      itens: [{ id: "unico", altura: 900 }],
      colunas: 1,
      gap: 0,
    },
    700
  );
  assert.equal(folhas.length, 1);
  assert.deepEqual(folhas[0].itemIds, ["unico"]);
});

run("título da seção acompanha os primeiros cards", () => {
  const folhas = empacotarSecaoRelatorio(
    {
      id: "detalhamento",
      cabecalhoAltura: 70,
      itens: [
        { id: "c1", altura: 300 },
        { id: "c2", altura: 300 },
        { id: "c3", altura: 300 },
      ],
      colunas: 1,
      gap: 10,
    },
    400
  );
  assert.equal(folhas.length, 3);
  assert.equal(folhas[0].cabecalho, true);
  assert.deepEqual(folhas[0].itemIds, ["c1"]);
  assert.equal(folhas[1].cabecalho, false);
  assert.deepEqual(folhas[1].itemIds, ["c2"]);
  assert.deepEqual(folhas[2].itemIds, ["c3"]);
});

run("indicadores-complementares inicia folha nova após detalhamento", () => {
  const folhas = empacotarRelatorioEmFolhas(
    [
      {
        id: "detalhamento",
        cabecalhoAltura: 70,
        itens: [{ id: "c10", altura: 250 }],
        colunas: 1,
        gap: 10,
      },
      {
        id: "indicadores-complementares",
        cabecalhoAltura: 90,
        itens: [
          { id: "p-20", altura: 40 },
          { id: "p-21", altura: 40 },
          { id: "p-22", altura: 40 },
          { id: "p-23", altura: 40 },
        ],
        colunas: 1,
        gap: 8,
      },
    ],
    700
  );
  assert.equal(folhas.length, 2);
  assert.equal(folhas[0].secaoId, "detalhamento");
  assert.equal(folhas[1].secaoId, "indicadores-complementares");
  assert.equal(folhas[1].cabecalho, true);
  assert.deepEqual(folhas[1].itemIds, ["p-20", "p-21", "p-22", "p-23"]);
});

run("viewer: indicadores-complementares alinha à próxima folha após COPSOQ", () => {
  const pageH = 1000;
  const detEnd = 870;
  const { rodapes, fimVirtual } = calcularRodapesSecaoViewer({
    domY: detEnd,
    altura: 320,
    pageH,
    novaPaginaObrigatoria: true,
    fluxo: true,
    fimAnterior: detEnd,
  });
  assert.equal(rodapes.length, 1);
  assert.equal(rodapes[0], 1000 + 320 - 1);
  assert.equal(fimVirtual, 1320);
});

console.log("\nTodos os testes de paginação A4 do relatório passaram.");
