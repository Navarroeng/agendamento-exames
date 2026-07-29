import assert from "node:assert/strict";
import {
  calcularFimVigencia,
  toIsoDateOnly,
} from "../lib/cliente-contrato-vigencia-calc";
import {
  buildClienteContratoSyncFromAprovacao,
  resolveStatusContratoFromAprovacao,
} from "../lib/cliente-contrato-orcamento-sync";
import { contratoEstaVigenteNaData } from "../lib/cliente-contrato-vigencia";

assert.equal(calcularFimVigencia("2026-07-28"), "2027-07-28");
assert.equal(calcularFimVigencia("2026-01-31"), "2027-01-31");
assert.equal(toIsoDateOnly("2026-07-28T15:00:00.000Z"), "2026-07-28");

assert.equal(
  resolveStatusContratoFromAprovacao({
    contrato_enviado: true,
    contrato_assinado: true,
    boleto_pago: true,
    boleto_vencimento: "2026-08-01",
  }),
  "ativo"
);

assert.equal(
  resolveStatusContratoFromAprovacao({
    contrato_enviado: true,
    contrato_assinado: true,
    boleto_pago: false,
    boleto_vencimento: "2026-08-01",
  }),
  "aguardando_pagamento"
);

assert.equal(
  resolveStatusContratoFromAprovacao({
    contrato_enviado: true,
    contrato_assinado: false,
    boleto_pago: false,
    boleto_vencimento: null,
  }),
  "enviado"
);

const syncAssinado = buildClienteContratoSyncFromAprovacao({
  aprovacao: {
    contrato_enviado: true,
    contrato_assinado: true,
    contrato_assinado_em: "2026-07-28",
    boleto_pago: false,
    boleto_vencimento: "2026-08-10",
  },
});
assert.equal(syncAssinado.status, "aguardando_pagamento");
assert.equal(syncAssinado.data_inicio, "2026-07-28");
assert.equal(syncAssinado.data_fim, "2027-07-28");
assert.equal(syncAssinado.liberado_para_agendamento, false);

const syncPago = buildClienteContratoSyncFromAprovacao({
  aprovacao: {
    contrato_enviado: true,
    contrato_assinado: true,
    contrato_assinado_em: "2026-07-28",
    boleto_pago: true,
    boleto_vencimento: "2026-08-10",
  },
});
assert.equal(syncPago.status, "ativo");
assert.equal(syncPago.liberado_para_agendamento, true);
assert.notEqual(syncPago.status, "pago");

assert.equal(
  contratoEstaVigenteNaData(
    {
      id: "1",
      status: "ativo",
      data_inicio: "2026-07-28",
      data_fim: "2027-07-28",
      orcamento_id: "o1",
      boleto_pago: true,
      liberado_para_agendamento: true,
    },
    "2026-08-05"
  ),
  true
);

assert.equal(
  contratoEstaVigenteNaData(
    {
      id: "1",
      status: "pago",
      data_inicio: "2026-07-28",
      data_fim: "2027-07-28",
      orcamento_id: "o1",
      boleto_pago: true,
      liberado_para_agendamento: true,
    },
    "2026-08-05"
  ),
  false,
  "status pago legado não conta como vigente — precisa ser ativo"
);

assert.equal(
  contratoEstaVigenteNaData(
    {
      id: "1",
      status: "ativo",
      data_inicio: "2026-07-28",
      data_fim: "2027-07-28",
      orcamento_id: "o1",
      boleto_pago: true,
      liberado_para_agendamento: true,
    },
    "2027-08-01"
  ),
  false
);

console.log("ok: contrato-orcamento-vigencia");
