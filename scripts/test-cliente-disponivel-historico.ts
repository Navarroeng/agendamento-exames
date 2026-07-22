/** Testes: clientes inativos permanecem visíveis em consultas históricas. */

import assert from "node:assert/strict";
import {
  buildClienteFilterOptionsHistorico,
} from "../lib/cliente-display";
import {
  filterClientesParaNovoAgendamento,
  isClienteDisponivelAgendamento,
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

const ativo = cliente({ id: "1", nome: "MATRIZ", disponivel_agendamento: true });
const inativo = cliente({
  id: "2",
  nome: "FILIAL X",
  disponivel_agendamento: false,
});

assert.deepEqual(
  filterClientesParaNovoAgendamento([ativo, inativo]),
  [ativo],
  "novo agendamento lista só ativos"
);

assert.deepEqual(
  filterClientesParaNovoAgendamento([ativo, inativo], {
    editingId: "ag-1",
    clienteNomeAtual: "FILIAL X",
  }),
  [ativo, inativo],
  "edição mantém cliente inativo vinculado"
);

assert.deepEqual(
  filterClientesParaNovoAgendamento([ativo, inativo], {
    editingId: "ag-1",
    clienteNomeAtual: " filial x ",
  }),
  [ativo, inativo],
  "edição ignora diferença de caixa/espaços no nome"
);

const historico = buildClienteFilterOptionsHistorico(
  [ativo],
  ["FILIAL X", "EMPRESA LEGADA"]
);

assert.equal(historico.length, 3, "histórico inclui inativos e nomes de agendamentos");
assert.ok(
  historico.some((item) => item.value === "FILIAL X"),
  "nome inativo aparece no filtro histórico"
);
assert.ok(
  historico.some((item) => item.value === "EMPRESA LEGADA"),
  "nome legado de agendamento aparece no filtro"
);

assert.equal(isClienteDisponivelAgendamento(false), false);

console.log("test-cliente-disponivel-historico: OK");
