/** Smoke test: regra única clientePodeAgendar / contratoLiberaAgendamento. */

import assert from "node:assert/strict";
import {
  clientePodeAgendar,
  contratoLiberaAgendamento,
} from "../lib/cliente-pode-agendar";
import { labelAgendamentoContrato } from "../lib/cliente-contrato-mappers";

const orcamentoNaoPago = {
  orcamento_id: "o1",
  boleto_pago: false,
  liberado_para_agendamento: true, // flag errado não deve liberar
  status: "assinado" as const,
};

const orcamentoPago = {
  orcamento_id: "o1",
  boleto_pago: true,
  liberado_para_agendamento: true,
  status: "ativo" as const,
};

const orcamentoPagoEncerrado = {
  orcamento_id: "o1",
  boleto_pago: true,
  liberado_para_agendamento: true,
  status: "encerrado" as const,
};

const manualLiberado = {
  orcamento_id: null,
  boleto_pago: false,
  liberado_para_agendamento: true,
  status: "ativo" as const,
};

assert.equal(contratoLiberaAgendamento(orcamentoNaoPago), false);
assert.equal(contratoLiberaAgendamento(orcamentoPago), true);
assert.equal(contratoLiberaAgendamento(orcamentoPagoEncerrado), false);
assert.equal(contratoLiberaAgendamento(manualLiberado), true);

assert.equal(
  clientePodeAgendar({ disponivel_agendamento: true }, [orcamentoNaoPago]),
  false
);
assert.equal(
  clientePodeAgendar({ disponivel_agendamento: false }, [orcamentoPago]),
  true,
  "sem bloqueio manual, contrato pago ainda libera (legado automático)"
);
assert.equal(
  clientePodeAgendar(
    { disponivel_agendamento: false, agendamento_bloqueio_manual: true },
    [orcamentoPago]
  ),
  false,
  "bloqueio manual tem prioridade sobre contrato pago"
);
assert.equal(
  clientePodeAgendar({ disponivel_agendamento: true }, [
    manualLiberado,
    orcamentoNaoPago,
  ]),
  true
);
assert.equal(
  clientePodeAgendar({ disponivel_agendamento: true }, []),
  true
);
assert.equal(
  clientePodeAgendar({ disponivel_agendamento: false }, []),
  false
);

assert.equal(labelAgendamentoContrato(orcamentoNaoPago), "Bloqueado");
assert.equal(labelAgendamentoContrato(orcamentoPago), "Liberado");
assert.equal(labelAgendamentoContrato(orcamentoPagoEncerrado), "Bloqueado");

console.log("test-cliente-pode-agendar: OK");
