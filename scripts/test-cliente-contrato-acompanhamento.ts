/** Smoke test: contrato atual e labels de acompanhamento. */

import assert from "node:assert/strict";
import {
  getContratoAtual,
  labelClienteContratoStatus,
  labelPagamentoContrato,
  labelVencimentoBoletoContrato,
} from "../lib/cliente-contrato-mappers";
import type { ClienteContratoRecord } from "../lib/types";

function contrato(
  partial: Partial<ClienteContratoRecord> & Pick<ClienteContratoRecord, "id" | "status">
): ClienteContratoRecord {
  return {
    cliente_id: "c1",
    data_inicio: "2026-07-01",
    data_fim: null,
    quantidade_colaboradores: 10,
    valor_contrato: 1000,
    condicao_pagamento: "à vista",
    tipo_contrato: "anual",
    reajuste_percentual: null,
    observacoes: null,
    numero: "CTR-2026-0001",
    numero_orcamento: "ORC-2026-0002",
    boleto_pago: false,
    boleto_vencimento: null,
    ...partial,
  };
}

assert.equal(labelClienteContratoStatus("aguardando_envio"), "Aguardando envio");
assert.equal(labelClienteContratoStatus("assinado"), "Assinado");
assert.equal(labelPagamentoContrato({ status: "assinado", boleto_pago: false }), "Pendente");
assert.equal(labelPagamentoContrato({ status: "pago", boleto_pago: true }), "Pago");
assert.equal(labelVencimentoBoletoContrato(null), "Não informado");

const atual = getContratoAtual([
  contrato({ id: "1", status: "encerrado" }),
  contrato({ id: "2", status: "aguardando_envio", numero: "CTR-2026-0002" }),
]);
assert.equal(atual?.id, "2");

const prefAtivo = getContratoAtual([
  contrato({ id: "1", status: "aguardando_envio" }),
  contrato({ id: "2", status: "ativo" }),
]);
assert.equal(prefAtivo?.id, "2");

console.log("test-cliente-contrato-acompanhamento: OK");
