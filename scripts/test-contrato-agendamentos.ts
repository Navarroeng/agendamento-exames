import assert from "node:assert/strict";
import {
  agendamentoConsomeSaldoContrato,
  buildContratoAgendamentoContagem,
  isAgendamentoSelecionavel,
  isDataNaVigencia,
  resolveClassificacaoAgendamento,
} from "../lib/contrato-agendamentos";

assert.equal(isAgendamentoSelecionavel("agendado"), true);
assert.equal(isAgendamentoSelecionavel("rascunho"), true);
assert.equal(isAgendamentoSelecionavel("aso_retido"), true);
assert.equal(isAgendamentoSelecionavel("cancelado"), false);

assert.equal(
  resolveClassificacaoAgendamento({ status: "cancelado", selecionado: true }),
  "cancelado"
);
assert.equal(
  resolveClassificacaoAgendamento({ status: "agendado", selecionado: true }),
  "contrato"
);
assert.equal(
  resolveClassificacaoAgendamento({ status: "agendado", selecionado: false }),
  "adicional"
);

assert.equal(isDataNaVigencia("2026-03-15", "2026-01-01", "2026-12-31"), true);
assert.equal(isDataNaVigencia("2025-12-31", "2026-01-01", "2026-12-31"), false);
assert.equal(isDataNaVigencia("2027-01-01", "2026-01-01", "2026-12-31"), false);

assert.equal(
  agendamentoConsomeSaldoContrato({
    status: "agendado",
    contrato_id: "ctr-a",
    consome_saldo_contrato: null,
  }),
  true
);
assert.equal(
  agendamentoConsomeSaldoContrato({
    status: "cancelado",
    contrato_id: "ctr-a",
    consome_saldo_contrato: true,
  }),
  false
);

// Exemplo da especificação: 3 previstos, 3 selecionados, 2 adicionais válidos
const c = buildContratoAgendamentoContagem(3, 3, 2);
assert.equal(c.previstos, 3);
assert.equal(c.utilizados, 3);
assert.equal(c.disponiveis, 0);
assert.equal(c.adicionais, 2);
assert.equal(c.percentual, 100);
assert.equal(c.concluido, true);

const parcial = buildContratoAgendamentoContagem(3, 2, 3);
assert.equal(parcial.disponiveis, 1);
assert.equal(parcial.concluido, false);
assert.equal(parcial.percentual < 100, true);

const zero = buildContratoAgendamentoContagem(0, 0, 0);
assert.equal(zero.concluido, false);

console.log("ok: contrato-agendamentos");
