import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CLIENTE_DISPONIVEL_AGENDAMENTO_MSG,
  filterClientesParaNovoAgendamento,
  formToDisponivelAgendamento,
  isClienteAgendamentoLiberadoNaExibicao,
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
    liberadosIds: new Set(["2"]),
  }),
  [bloqueado]
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
  isClienteAgendamentoLiberadoNaExibicao({
    disponivel_agendamento: true,
    disponivel_agendamento_efetivo: false,
  }),
  false
);
assert.equal(
  isClienteAgendamentoLiberadoNaExibicao({
    disponivel_agendamento: true,
  }),
  false
);
assert.equal(
  matchesClienteAgendamentoFilter(
    { disponivel_agendamento: true, disponivel_agendamento_efetivo: false },
    "bloqueado"
  ),
  true
);
assert.equal(
  matchesClienteAgendamentoFilter(
    { disponivel_agendamento: false, disponivel_agendamento_efetivo: true },
    "liberado"
  ),
  true
);

const tabela = readFileSync("components/clientes/ClientesTable.tsx", "utf8");
assert.match(tabela, /isClienteAgendamentoLiberadoNaExibicao/);
assert.doesNotMatch(tabela, /cliente\.disponivel_agendamento/);
const card = readFileSync(
  "components/clientes/ClienteContratoAtualCard.tsx",
  "utf8"
);
assert.match(card, /resolveDisponibilidadeAgendamentoCliente/);
assert.doesNotMatch(card, /labelAgendamentoContrato/);
const historico = readFileSync(
  "components/clientes/ClienteContratosHistoricoTable.tsx",
  "utf8"
);
assert.match(historico, /labelLiberacaoNaVigenciaContrato/);
assert.match(historico, /Liberação na vigência/);
assert.doesNotMatch(historico, /labelAgendamentoContrato/);

assert.equal(
  CLIENTE_DISPONIVEL_AGENDAMENTO_MSG,
  "Este cliente não está autorizado para novos agendamentos."
);

console.log("test-cliente-disponivel-agendamento: OK");
