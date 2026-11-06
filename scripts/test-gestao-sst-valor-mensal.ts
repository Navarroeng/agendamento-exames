/**
 * Valor mensal automático da Gestão SST.
 * Executar: npx tsx scripts/test-gestao-sst-valor-mensal.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyQuantidadeColaboradoresSomenteNoItem,
  applyValorMensalGestaoSstItem,
  calcValorMensalGestaoSst,
  calcValorPacoteCompletoSst,
  gestaoSstReabreComoManual,
  normalizeOrcamentoItensParaPersistencia,
  resolverPersistenciaValorMensalGestaoSst,
  resolveItemValorServico,
} from "../lib/orcamento-calculo";
import { parseMoney } from "../lib/money";
import { GESTAO_SST_MENSAL_NOME } from "../lib/orcamento-modalidade";
import { buildResumoMensalidadeLinhas } from "../lib/orcamento-modalidade";
import { PACOTE_COMPLETO_SST_NOME } from "../lib/servico-sst-pacote";
import type { OrcamentoItemFormItem } from "../lib/orcamento-types";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function itemGestao(
  quantidade: string,
  valor: string,
  valorManual: boolean
): OrcamentoItemFormItem {
  return {
    id: "g1",
    servico_id: "gestao",
    servico_nome: GESTAO_SST_MENSAL_NOME,
    quantidade,
    valor_unitario: valor,
    valor_total: valor,
    valor_manual: valorManual,
  };
}

run("tabela 1, 10, 19, 24 e 50 colaboradores", () => {
  assert.equal(calcValorMensalGestaoSst(1), 130);
  assert.equal(calcValorMensalGestaoSst(10), 220);
  assert.equal(calcValorMensalGestaoSst(19), 310);
  assert.equal(calcValorMensalGestaoSst(24), 360);
  assert.equal(calcValorMensalGestaoSst(50), 620);
  assert.equal(calcValorMensalGestaoSst(51), 630);
});

run("quantidade vazia ou inválida não vira 1", () => {
  assert.equal(calcValorMensalGestaoSst(0), null);
  assert.equal(calcValorMensalGestaoSst(Number.NaN), null);
  assert.equal(
    applyValorMensalGestaoSstItem(itemGestao("", "R$ 200,00", false))
      .valor_unitario,
    "R$ 200,00"
  );
});

run("modo automático preenche e recalcula com a quantidade", () => {
  const preenchido = applyValorMensalGestaoSstItem(
    itemGestao("10", "", false)
  );
  assert.equal(parseMoney(preenchido.valor_unitario), 220);

  const [recalculado] = applyQuantidadeColaboradoresSomenteNoItem(
    [itemGestao("10", preenchido.valor_unitario, false)],
    "g1",
    "24"
  );
  assert.equal(parseMoney(recalculado.valor_unitario), 360);
  assert.equal(recalculado.valor_manual, false);
});

run("edição manual não é sobrescrita quando a quantidade muda", () => {
  const [mantido] = applyQuantidadeColaboradoresSomenteNoItem(
    [itemGestao("10", "R$ 150,00", true)],
    "g1",
    "24"
  );
  assert.equal(parseMoney(mantido.valor_unitario), 150);
  assert.equal(mantido.valor_manual, true);
});

run("usar valor sugerido volta ao cálculo e ao modo automático", () => {
  const adotado = applyValorMensalGestaoSstItem({
    ...itemGestao("19", "R$ 150,00", true),
    valor_manual: false,
  });
  assert.equal(parseMoney(adotado.valor_unitario), 310);
});

run("grava o valor negociado e não promove antigo que coincide com a tabela", () => {
  const manual = resolverPersistenciaValorMensalGestaoSst({
    servico_nome: GESTAO_SST_MENSAL_NOME,
    quantidade: 10,
    valor_unitario: 220,
    valor_manual: true,
  });
  assert.equal(manual.valor, 220);
  assert.equal(manual.valor_automatico, false);
  assert.equal(gestaoSstReabreComoManual(null), true);
  assert.equal(gestaoSstReabreComoManual(undefined), true);
  assert.equal(gestaoSstReabreComoManual(false), true);
  assert.equal(gestaoSstReabreComoManual(true), false);

  const persistido = normalizeOrcamentoItensParaPersistencia([
    {
      servico_nome: GESTAO_SST_MENSAL_NOME,
      quantidade: 10,
      valor_unitario: manual.valor,
      valor_total: manual.valor,
      valor_automatico: manual.valor_automatico,
    },
  ]);
  assert.equal(persistido[0].valor_unitario, 220);
  assert.equal(persistido[0].valor_automatico, false);
});

run("automático grava o cálculo e o flag", () => {
  const auto = resolverPersistenciaValorMensalGestaoSst({
    servico_nome: GESTAO_SST_MENSAL_NOME,
    quantidade: 10,
    valor_unitario: 0,
    valor_manual: false,
  });
  assert.equal(auto.valor, 220);
  assert.equal(auto.valor_automatico, true);
  const persistido = normalizeOrcamentoItensParaPersistencia([
    {
      servico_nome: GESTAO_SST_MENSAL_NOME,
      quantidade: 10,
      valor_unitario: auto.valor,
      valor_total: auto.valor,
      valor_automatico: auto.valor_automatico,
    },
  ]);
  assert.equal(persistido[0].valor_total, 220);
  assert.equal(persistido[0].valor_automatico, true);
});

run("PDF e resumo usam o valor salvo, não a tabela", () => {
  const salvo = resolveItemValorServico({
    servico_nome: GESTAO_SST_MENSAL_NOME,
    quantidade: 10,
    valor_unitario: 200,
    valor_total: 200,
  });
  assert.equal(salvo, 200);
  assert.notEqual(salvo, calcValorMensalGestaoSst(10));
  assert.match(buildResumoMensalidadeLinhas(200)[0].value, /200,00/);
});

run("pacote completo e outros serviços não usam a mensalidade de R$ 10", () => {
  assert.equal(calcValorPacoteCompletoSst(1), 1300);
  assert.equal(calcValorPacoteCompletoSst(10), 2200);
  const outro = resolverPersistenciaValorMensalGestaoSst({
    servico_nome: PACOTE_COMPLETO_SST_NOME,
    quantidade: 10,
    valor_unitario: 2200,
    valor_manual: false,
  });
  assert.equal(outro.valor, 2200);
  assert.equal(outro.valor_automatico, null);
});

const root = join(__dirname, "..");
const formSrc = readFileSync(
  join(root, "hooks/useOrcamentoForm.ts"),
  "utf8"
);
const rowSrc = readFileSync(
  join(root, "components/orcamentos/OrcamentoItemTableRow.tsx"),
  "utf8"
);
const pdfSrc = readFileSync(join(root, "lib/orcamento-pdf.ts"), "utf8");
assert.match(formSrc, /gestaoSstReabreComoManual/);
assert.match(rowSrc, /Usar valor sugerido/);
assert.doesNotMatch(pdfSrc, /calcValorMensalGestaoSst/);

console.log("test-gestao-sst-valor-mensal: OK");
