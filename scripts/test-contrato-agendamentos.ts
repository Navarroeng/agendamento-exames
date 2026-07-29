import assert from "node:assert/strict";
import {
  agendamentoConsomeSaldoContrato,
  buildContratoAgendamentoContagem,
  colaboradorContagemKey,
  colaboradorJaConsomeSaldoNoContrato,
  countAgendamentosAdicionais,
  countColaboradoresUnicos,
  isAgendamentoValidoParaContrato,
} from "../lib/contrato-agendamentos";

const contratoA = "ctr-a";
const contratoB = "ctr-b";

assert.equal(
  isAgendamentoValidoParaContrato(
    { status: "agendado", contrato_id: contratoA },
    contratoA
  ),
  true
);
assert.equal(
  isAgendamentoValidoParaContrato(
    { status: "cancelado", contrato_id: contratoA },
    contratoA
  ),
  false
);

assert.equal(
  colaboradorContagemKey({
    colaborador: "X",
    colaborador_cpf: "123.456.789-09",
  }),
  "cpf:12345678909"
);
assert.equal(
  colaboradorContagemKey({ colaborador: "SEM CPF", colaborador_cpf: "" }),
  null
);

const rows = [
  {
    id: "1",
    status: "agendado" as const,
    contrato_id: contratoA,
    colaborador: "MARIA",
    colaborador_cpf: "123.456.789-09",
    consome_saldo_contrato: true,
  },
  {
    id: "2",
    status: "agendado" as const,
    contrato_id: contratoA,
    colaborador: "MARIA DA SILVA",
    colaborador_cpf: "12345678909",
    consome_saldo_contrato: true,
  },
  {
    id: "3",
    status: "agendado" as const,
    contrato_id: contratoA,
    colaborador: "ANA",
    colaborador_cpf: "55566677788",
    consome_saldo_contrato: false,
  },
  {
    id: "4",
    status: "cancelado" as const,
    contrato_id: contratoA,
    colaborador: "JOAO",
    colaborador_cpf: "98765432100",
    consome_saldo_contrato: true,
  },
  {
    id: "5",
    status: "agendado" as const,
    contrato_id: contratoB,
    colaborador: "PEDRO",
    colaborador_cpf: "11122233344",
    consome_saldo_contrato: true,
  },
];

assert.equal(countColaboradoresUnicos(rows, contratoA), 1);
assert.equal(countAgendamentosAdicionais(rows, contratoA), 1);
assert.equal(
  colaboradorJaConsomeSaldoNoContrato(rows, contratoA, "123.456.789-09"),
  true
);
assert.equal(
  colaboradorJaConsomeSaldoNoContrato(rows, contratoA, "55566677788"),
  false
);
assert.equal(
  agendamentoConsomeSaldoContrato({
    status: "agendado",
    contrato_id: contratoA,
    consome_saldo_contrato: null,
  }),
  true
);

const c0 = buildContratoAgendamentoContagem(5, 0, 0);
assert.equal(c0.disponiveis, 5);
assert.equal(c0.concluido, false);

const c5 = buildContratoAgendamentoContagem(5, 5, 2);
assert.equal(c5.disponiveis, 0);
assert.equal(c5.adicionais, 2);
assert.equal(c5.concluido, true);

console.log("ok: contrato-agendamentos");
