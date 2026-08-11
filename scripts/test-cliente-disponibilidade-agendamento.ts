/**
 * Regra central de disponibilidade para agendamento.
 */
import assert from "node:assert/strict";
import {
  resolveDisponibilidadeAgendamentoCliente,
  BLOQUEIO_MANUAL_AGENDAMENTO_MSG,
} from "../lib/cliente-disponibilidade-agendamento";
import {
  CONTRATO_ENCERRADO_ERROR_MESSAGE,
  CONTRATO_VIGENTE_ERROR_MESSAGE,
} from "../lib/cliente-contrato-vigencia";
import { clientePodeAgendar } from "../lib/cliente-pode-agendar";

function run(name: string, fn: () => void) {
  fn();
  console.log("OK ", name);
}

const vigente = {
  id: "1",
  status: "ativo" as const,
  data_inicio: "2026-01-01",
  data_fim: "2026-12-31",
  orcamento_id: "o1" as string | null,
  boleto_pago: true,
  liberado_para_agendamento: true,
  encerrado_em: null as string | null,
};

const encerrado = {
  ...vigente,
  id: "2",
  status: "encerrado" as const,
  encerrado_em: "2026-08-01T00:00:00.000Z",
  liberado_para_agendamento: false,
};

run("contrato vigente → Agendamento liberado", () => {
  const r = resolveDisponibilidadeAgendamentoCliente({
    cliente: {},
    contratos: [vigente],
    dataReferenciaIso: "2026-08-11",
  });
  assert.equal(r.disponivel, true);
  assert.equal(r.label, "Agendamento liberado");
  assert.equal(r.motivo, null);
});

run("contrato encerrado (J A HIDRAULICA) → bloqueado com motivo", () => {
  const r = resolveDisponibilidadeAgendamentoCliente({
    cliente: { disponivel_agendamento: true },
    contratos: [encerrado],
    dataReferenciaIso: "2026-08-11",
  });
  assert.equal(r.disponivel, false);
  assert.equal(r.label, "Agendamento bloqueado");
  assert.equal(r.motivo, CONTRATO_ENCERRADO_ERROR_MESSAGE);
});

run("flag legado liberado NÃO sobrescreve contrato encerrado", () => {
  assert.equal(
    clientePodeAgendar({ disponivel_agendamento: true }, [encerrado], "2026-08-11"),
    false
  );
});

run("bloqueio manual tem prioridade", () => {
  const r = resolveDisponibilidadeAgendamentoCliente({
    cliente: {
      agendamento_bloqueio_manual: true,
      agendamento_bloqueio_motivo: "Inadimplente",
    },
    contratos: [vigente],
    dataReferenciaIso: "2026-08-11",
  });
  assert.equal(r.disponivel, false);
  assert.equal(r.motivo, "Inadimplente");
});

run("sem contrato → bloqueado", () => {
  const r = resolveDisponibilidadeAgendamentoCliente({
    cliente: { disponivel_agendamento: true },
    contratos: [],
    dataReferenciaIso: "2026-08-11",
  });
  assert.equal(r.disponivel, false);
  assert.equal(r.motivo, CONTRATO_VIGENTE_ERROR_MESSAGE);
});

run("mensagem padrão de bloqueio manual", () => {
  const r = resolveDisponibilidadeAgendamentoCliente({
    cliente: { agendamento_bloqueio_manual: true },
    contratos: [vigente],
  });
  assert.equal(r.motivo, BLOQUEIO_MANUAL_AGENDAMENTO_MSG);
});

console.log("\nTodos os testes de disponibilidade central passaram.");
