import assert from "node:assert/strict";
import {
  buildContratoAgendamentoContagem,
  colaboradorContagemKey,
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
  isAgendamentoValidoParaContrato(
    { status: "agendado", contrato_id: contratoB },
    contratoA
  ),
  false
);

const realizados = countColaboradoresUnicos(
  [
    {
      status: "agendado",
      contrato_id: contratoA,
      colaborador: "MARIA",
      colaborador_cpf: "123.456.789-09",
    },
    {
      status: "agendado",
      contrato_id: contratoA,
      colaborador: "MARIA DA SILVA",
      colaborador_cpf: "12345678909",
    },
    {
      status: "cancelado",
      contrato_id: contratoA,
      colaborador: "JOAO",
      colaborador_cpf: "98765432100",
    },
    {
      status: "agendado",
      contrato_id: contratoB,
      colaborador: "PEDRO",
      colaborador_cpf: "11122233344",
    },
    {
      status: "agendado",
      contrato_id: contratoA,
      colaborador: "ANA",
      colaborador_cpf: "55566677788",
    },
  ],
  contratoA
);
assert.equal(realizados, 2, "deve contar colaboradores únicos por CPF");

assert.equal(
  colaboradorContagemKey({
    colaborador: "X",
    colaborador_cpf: "123.456.789-09",
  }),
  "cpf:12345678909"
);

const c0 = buildContratoAgendamentoContagem(5, 0);
assert.equal(c0.pendentes, 5);
assert.equal(c0.adicionais, 0);
assert.equal(c0.concluido, false);
assert.match(c0.mensagem, /Faltam 5/);

const c4 = buildContratoAgendamentoContagem(5, 4);
assert.equal(c4.pendentes, 1);
assert.match(c4.mensagem, /Falta 1/);

const c5 = buildContratoAgendamentoContagem(5, 5);
assert.equal(c5.pendentes, 0);
assert.equal(c5.concluido, true);
assert.match(c5.mensagem, /foi atingida/);

const c6 = buildContratoAgendamentoContagem(5, 6);
assert.equal(c6.pendentes, 0);
assert.equal(c6.adicionais, 1);
assert.equal(c6.concluido, true);
assert.match(c6.mensagem, /1 agendamento adicional/);

console.log("ok: contrato-agendamentos");
