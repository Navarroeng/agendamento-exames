/** Smoke test: contratoLiberaAgendamento + clientePodeAgendar (regra central). */

import assert from "node:assert/strict";
import {
  clientePodeAgendar,
  contratoLiberaAgendamento,
} from "../lib/cliente-pode-agendar";
import { labelAgendamentoContrato } from "../lib/cliente-contrato-mappers";

const orcamentoNaoPago = {
  id: "c0",
  orcamento_id: "o1",
  boleto_pago: false,
  liberado_para_agendamento: true,
  status: "ativo" as const,
  data_inicio: "2026-01-01",
  data_fim: "2026-12-31",
  encerrado_em: null,
};

const orcamentoPago = {
  id: "c1",
  orcamento_id: "o1",
  boleto_pago: true,
  liberado_para_agendamento: true,
  status: "ativo" as const,
  data_inicio: "2026-01-01",
  data_fim: "2026-12-31",
  encerrado_em: null,
};

const orcamentoPagoEncerrado = {
  id: "c2",
  orcamento_id: "o1",
  boleto_pago: true,
  liberado_para_agendamento: true,
  status: "encerrado" as const,
  data_inicio: "2026-01-01",
  data_fim: "2026-12-31",
  encerrado_em: "2026-08-01T00:00:00.000Z",
};

const manualLiberado = {
  id: "c3",
  orcamento_id: null,
  boleto_pago: false,
  liberado_para_agendamento: true,
  status: "ativo" as const,
  data_inicio: "2026-01-01",
  data_fim: "2026-12-31",
  encerrado_em: null,
};

const hoje = "2026-08-11";

assert.equal(contratoLiberaAgendamento(orcamentoNaoPago), false);
assert.equal(contratoLiberaAgendamento(orcamentoPago), true);
assert.equal(contratoLiberaAgendamento(orcamentoPagoEncerrado), false);
assert.equal(contratoLiberaAgendamento(manualLiberado), true);

assert.equal(
  clientePodeAgendar({ disponivel_agendamento: true }, [orcamentoNaoPago], hoje),
  false
);
assert.equal(
  clientePodeAgendar({ disponivel_agendamento: false }, [orcamentoPago], hoje),
  true,
  "contrato vigente libera mesmo com flag cache desatualizado"
);
assert.equal(
  clientePodeAgendar(
    { disponivel_agendamento: false, agendamento_bloqueio_manual: true },
    [orcamentoPago],
    hoje
  ),
  false,
  "bloqueio manual tem prioridade"
);
assert.equal(
  clientePodeAgendar({ disponivel_agendamento: true }, [manualLiberado], hoje),
  true
);
assert.equal(
  clientePodeAgendar({ disponivel_agendamento: true }, [], hoje),
  false,
  "sem contrato vigente → bloqueado"
);
assert.equal(
  clientePodeAgendar({ disponivel_agendamento: true }, [orcamentoPagoEncerrado], hoje),
  false,
  "encerrado → bloqueado"
);

assert.equal(labelAgendamentoContrato(orcamentoNaoPago), "Bloqueado");
assert.equal(labelAgendamentoContrato(orcamentoPago), "Liberado");
assert.equal(labelAgendamentoContrato(orcamentoPagoEncerrado), "Bloqueado");

console.log("test-cliente-pode-agendar: OK");
