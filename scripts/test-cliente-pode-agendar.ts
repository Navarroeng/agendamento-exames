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
};

const orcamentoPago = {
  orcamento_id: "o1",
  boleto_pago: true,
  liberado_para_agendamento: true,
};

const manualLiberado = {
  orcamento_id: null,
  boleto_pago: false,
  liberado_para_agendamento: true,
};

assert.equal(contratoLiberaAgendamento(orcamentoNaoPago), false);
assert.equal(contratoLiberaAgendamento(orcamentoPago), true);
assert.equal(contratoLiberaAgendamento(manualLiberado), true);

assert.equal(
  clientePodeAgendar({ disponivel_agendamento: true }, [orcamentoNaoPago]),
  false
);
assert.equal(
  clientePodeAgendar({ disponivel_agendamento: false }, [orcamentoPago]),
  true
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

console.log("test-cliente-pode-agendar: OK");
