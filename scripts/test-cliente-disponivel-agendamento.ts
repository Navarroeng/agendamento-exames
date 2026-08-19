import assert from "node:assert/strict";
import {
  CLIENTE_DISPONIVEL_AGENDAMENTO_MSG,
  filterClientesParaNovoAgendamento,
  formToDisponivelAgendamento,
  isClienteDisponivelAgendamento,
  matchesClienteAgendamentoFilter,
} from "../lib/cliente-disponivel-agendamento";

function cliente(
  partial: Partial<{
    id: string;
    nome: string;
    cnpj: string;
    disponivel_agendamento: boolean;
  }> = {}
) {
  return {
    id: partial.id ?? "1",
    nome: partial.nome ?? "EMPRESA A",
    cnpj: partial.cnpj ?? "33.476.248/0001-82",
    procuracao: "ativa" as const,
    disponivel_agendamento: partial.disponivel_agendamento ?? true,
  };
}

assert.equal(isClienteDisponivelAgendamento(true), true);
assert.equal(isClienteDisponivelAgendamento(false), false);
assert.equal(isClienteDisponivelAgendamento(undefined), false);
assert.equal(isClienteDisponivelAgendamento(null), false);

assert.equal(formToDisponivelAgendamento("Sim"), true);
assert.equal(formToDisponivelAgendamento("Não"), false);

const liberado = cliente({ id: "1", nome: "MATRIZ", disponivel_agendamento: true });
const bloqueado = cliente({ id: "2", nome: "FILIAL X", disponivel_agendamento: false });

assert.deepEqual(
  filterClientesParaNovoAgendamento([liberado, bloqueado]),
  [liberado]
);

assert.deepEqual(
  filterClientesParaNovoAgendamento([liberado, bloqueado], {
    editingId: "ag-1",
    clienteNomeAtual: "FILIAL X",
  }),
  [liberado, bloqueado]
);

assert.equal(
  matchesClienteAgendamentoFilter(bloqueado, "bloqueado"),
  true
);
assert.equal(
  matchesClienteAgendamentoFilter(bloqueado, "liberado"),
  false
);

assert.equal(
  CLIENTE_DISPONIVEL_AGENDAMENTO_MSG,
  "Este cliente não está autorizado para novos agendamentos."
);

console.log("test-cliente-disponivel-agendamento: OK");
