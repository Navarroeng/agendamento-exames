import assert from "node:assert/strict";
import {
  calcularFimVigencia,
  toIsoDateOnly,
} from "../lib/cliente-contrato-vigencia-calc";
import {
  buildClienteContratoSyncFromAprovacao,
  resolveStatusContratoFromAprovacao,
} from "../lib/cliente-contrato-orcamento-sync";
import {
  contratoEstaVigenteNaData,
  contratoMensalOperacionalNaData,
} from "../lib/cliente-contrato-vigencia";
import { contratoLiberaAgendamento } from "../lib/cliente-pode-agendar";

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

const syncMensal = buildClienteContratoSyncFromAprovacao({
  aprovacao: {
    contrato_enviado: true,
    contrato_assinado: true,
    contrato_assinado_em: "2026-10-14",
    boleto_pago: false,
    boleto_vencimento: "2026-11-10",
  },
  cobrancaMensal: true,
  hojeIso: "2026-10-15",
});
assert.equal(syncMensal.status, "ativo");
assert.equal(syncMensal.boleto_pago, false);
assert.equal(syncMensal.liberado_para_agendamento, true);
assert.equal(syncMensal.tipo_contrato, "mensal");
assert.equal(syncMensal.data_inicio, "2026-10-14");
assert.notEqual(syncMensal.status, "aguardando_pagamento");

const syncMensalFuturo = buildClienteContratoSyncFromAprovacao({
  aprovacao: {
    contrato_enviado: true,
    contrato_assinado: true,
    contrato_assinado_em: "2026-11-01",
    boleto_pago: false,
    boleto_vencimento: "2026-12-10",
  },
  cobrancaMensal: true,
  hojeIso: "2026-10-15",
});
assert.equal(syncMensalFuturo.status, "assinado");
assert.equal(syncMensalFuturo.data_inicio, "2026-11-01");
assert.equal(syncMensalFuturo.boleto_pago, false);
assert.equal(syncMensalFuturo.liberado_para_agendamento, false);

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

const jet = {
  id: "jet",
  status: "aguardando_pagamento" as const,
  data_inicio: "2026-10-14",
  data_fim: "2027-10-14",
  orcamento_id: "orc-jet",
  boleto_pago: false,
  liberado_para_agendamento: false,
  contrato_assinado_em: "2026-10-14",
  modalidadeOrcamento: "mensalidade",
  mensalidadePagamento: "mensal",
};

assert.equal(contratoMensalOperacionalNaData(jet, "2026-10-16"), true);
assert.equal(contratoEstaVigenteNaData(jet, "2026-10-16"), true);
assert.equal(contratoLiberaAgendamento(jet, "2026-10-16"), true);
assert.equal(contratoEstaVigenteNaData(jet, "2026-10-13"), false);
assert.equal(
  contratoEstaVigenteNaData(
    { ...jet, mensalidadePagamento: "avista", status: "ativo" },
    "2026-10-16"
  ),
  false
);
assert.equal(
  contratoEstaVigenteNaData(
    { ...jet, modalidadeOrcamento: "pontual", status: "ativo" },
    "2026-10-16"
  ),
  false
);

console.log("ok: contrato-orcamento-vigencia");
