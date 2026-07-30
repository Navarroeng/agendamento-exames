/** Smoke test: andamento documental x financeiro. */

import assert from "node:assert/strict";
import {
  ORCAMENTO_FINANCEIRO_ANDAMENTO_LABELS,
  resolveContratoDocumentalAndamento,
  resolveFinanceiroAndamento,
} from "../lib/orcamento-aprovacao";
import {
  labelAgendamentoContrato,
  labelFinanceiroContrato,
} from "../lib/cliente-contrato-mappers";

assert.equal(
  resolveContratoDocumentalAndamento({
    contrato_enviado: false,
    contrato_assinado: false,
  }),
  "nao_enviado"
);
assert.equal(
  resolveContratoDocumentalAndamento({
    contrato_enviado: true,
    contrato_assinado: true,
  }),
  "assinado"
);

assert.equal(
  resolveFinanceiroAndamento({
    boleto_vencimento: null,
    boleto_pago: false,
  }),
  "aguardando_vencimento"
);
assert.equal(
  resolveFinanceiroAndamento({
    boleto_vencimento: "2026-08-01",
    boleto_pago: false,
  }),
  "aguardando_pagamento"
);
assert.equal(
  resolveFinanceiroAndamento({
    boleto_vencimento: "2026-08-01",
    boleto_pago: true,
  }),
  "pago"
);
assert.equal(
  ORCAMENTO_FINANCEIRO_ANDAMENTO_LABELS.aguardando_pagamento,
  "Aguardando pagamento"
);

assert.equal(
  labelFinanceiroContrato({
    status: "assinado",
    boleto_pago: false,
    boleto_vencimento: null,
  }),
  "Aguardando vencimento"
);
assert.equal(
  labelAgendamentoContrato({
    orcamento_id: "o1",
    boleto_pago: false,
    liberado_para_agendamento: false,
    status: "assinado",
  }),
  "Bloqueado"
);
assert.equal(
  labelAgendamentoContrato({
    orcamento_id: "o1",
    boleto_pago: true,
    liberado_para_agendamento: true,
    status: "ativo",
  }),
  "Liberado"
);
assert.equal(
  labelAgendamentoContrato({
    orcamento_id: "o1",
    boleto_pago: true,
    liberado_para_agendamento: true,
    status: "encerrado",
  }),
  "Bloqueado"
);
assert.equal(
  labelFinanceiroContrato({
    status: "ativo",
    boleto_pago: true,
    boleto_vencimento: "2026-08-01",
  }),
  "Pago"
);

console.log("test-orcamento-financeiro-abas: OK");
