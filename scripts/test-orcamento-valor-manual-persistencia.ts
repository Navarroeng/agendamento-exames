/**
 * Integração: valor manual do item persiste após save + reload (simulado).
 * Executar: npx tsx scripts/test-orcamento-valor-manual-persistencia.ts
 */
import assert from "node:assert/strict";
import {
  applyPacoteCompletoSstPrecoItensPayload,
  calcSubtotalItens,
  inferValorManualOrcamentoItem,
  normalizeOrcamentoItensParaPersistencia,
  resolveItemValorParaFormulario,
} from "../lib/orcamento-calculo";
import { maskMoneyInput, parseMoney } from "../lib/money";
import type { OrcamentoItemFormItem, OrcamentoItemRecord } from "../lib/orcamento-types";
import { PACOTE_COMPLETO_SST_NOME } from "../lib/servico-sst-pacote";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

/** Espelha buildPayload → service → reload do fluxo real. */
function simularCicloPersistencia(params: {
  valorFormulario: string;
  valorManual: boolean;
  quantidade: number;
}) {
  const formItem: OrcamentoItemFormItem = {
    id: "item-1",
    servico_id: "srv-pacote",
    servico_nome: PACOTE_COMPLETO_SST_NOME,
    quantidade: String(params.quantidade),
    valor_unitario: params.valorFormulario,
    valor_total: params.valorFormulario,
    valor_manual: params.valorManual,
  };

  assert.equal(parseMoney(formItem.valor_unitario), 1650);
  assert.equal(formItem.valor_manual, true);

  const itensRaw = [
    {
      servico_id: formItem.servico_id,
      servico_nome: formItem.servico_nome,
      quantidade: params.quantidade,
      valor_unitario: parseMoney(formItem.valor_unitario),
      valor_total: parseMoney(formItem.valor_unitario),
      ordem: 0,
      valor_manual: formItem.valor_manual,
    },
  ];

  const itensPosForm = applyPacoteCompletoSstPrecoItensPayload(itensRaw).map(
    ({ valor_manual: _m, ...item }) => item
  );

  assert.equal(itensPosForm[0].valor_unitario, 1650);

  const itensPosService = normalizeOrcamentoItensParaPersistencia(itensPosForm);

  assert.equal(
    itensPosService[0].valor_unitario,
    1650,
    "service não deve recolocar tabela automática (1800)"
  );

  const registroDb: OrcamentoItemRecord = {
    id: "db-item-1",
    orcamento_id: "orc-1",
    servico_id: itensPosService[0].servico_id,
    servico_nome: itensPosService[0].servico_nome,
    quantidade: itensPosService[0].quantidade,
    valor_unitario: itensPosService[0].valor_unitario,
    valor_total: itensPosService[0].valor_total,
    ordem: 0,
  };

  const valorReload = resolveItemValorParaFormulario(registroDb);
  assert.equal(valorReload, 1650);

  const valorManualReload = inferValorManualOrcamentoItem(
    registroDb.servico_nome,
    registroDb.quantidade,
    valorReload
  );
  assert.equal(valorManualReload, true);

  const formReload: OrcamentoItemFormItem = {
    id: registroDb.id,
    servico_id: registroDb.servico_id ?? "",
    servico_nome: registroDb.servico_nome,
    quantidade: String(registroDb.quantidade),
    valor_unitario: maskMoneyInput(String(Math.round(valorReload * 100))),
    valor_total: String(valorReload),
    valor_manual: valorManualReload,
  };

  assert.equal(parseMoney(formReload.valor_unitario), 1650);
  assert.equal(calcSubtotalItens([formReload]), 1650);

  const itensSegundoSave = normalizeOrcamentoItensParaPersistencia([
    {
      servico_id: formReload.servico_id,
      servico_nome: formReload.servico_nome,
      quantidade: params.quantidade,
      valor_unitario: parseMoney(formReload.valor_unitario),
      valor_total: parseMoney(formReload.valor_unitario),
      ordem: 0,
    },
  ]);

  assert.equal(itensSegundoSave[0].valor_unitario, 1650);

  return { itensPosService, formReload };
}

run("regressão — service sobrescrevia 1650 → 1800 sem valor_manual", () => {
  const antesFix = applyPacoteCompletoSstPrecoItensPayload([
    {
      servico_nome: PACOTE_COMPLETO_SST_NOME,
      quantidade: 6,
      valor_unitario: 1650,
      valor_total: 1650,
    },
  ]);
  assert.equal(
    antesFix[0].valor_unitario,
    1800,
    "documenta comportamento bugado quando valor_manual ausente no service"
  );
});

run("ciclo completo — 1800 automático → editar 1650 → save → reload = 1650", () => {
  simularCicloPersistencia({
    valorFormulario: "R$ 1.650,00",
    valorManual: true,
    quantidade: 6,
  });
});

run("segundo save sem alterar — continua 1650", () => {
  const { formReload } = simularCicloPersistencia({
    valorFormulario: "R$ 1.650,00",
    valorManual: true,
    quantidade: 6,
  });

  const round2 = normalizeOrcamentoItensParaPersistencia([
    {
      servico_nome: formReload.servico_nome,
      quantidade: 6,
      valor_unitario: parseMoney(formReload.valor_unitario),
      valor_total: parseMoney(formReload.valor_unitario),
    },
  ]);
  assert.equal(round2[0].valor_unitario, 1650);
});

run("automático sem edição manual — persiste 1800", () => {
  const itens = normalizeOrcamentoItensParaPersistencia([
    {
      servico_nome: PACOTE_COMPLETO_SST_NOME,
      quantidade: 6,
      valor_unitario: 1800,
      valor_total: 1800,
    },
  ]);
  assert.equal(itens[0].valor_unitario, 1800);
});

console.log("\nTodos os testes de persistência do valor manual passaram.");
