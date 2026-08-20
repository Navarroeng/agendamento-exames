import assert from "node:assert/strict";
import {
  agendamentoConsomeSaldoContrato,
  agendamentoEVinculadoAoContrato,
  agendamentoPertenceAoClienteContrato,
  agendamentoVisivelNaAbaContrato,
  buildContratoAgendamentoContagem,
  idsAgendamentoDasVagas,
  isAgendamentoSelecionavel,
  isDataNaVigencia,
  mesclarAgendamentosPorId,
  resolveClassificacaoAgendamento,
} from "../lib/contrato-agendamentos";
import type { AgendamentoWithExames } from "../lib/types";

assert.equal(isAgendamentoSelecionavel("agendado"), true);
assert.equal(isAgendamentoSelecionavel("rascunho"), true);
assert.equal(isAgendamentoSelecionavel("aso_retido"), true);
assert.equal(isAgendamentoSelecionavel("cancelado"), false);

assert.equal(
  resolveClassificacaoAgendamento({ status: "cancelado", selecionado: true }),
  "cancelado"
);
assert.equal(
  resolveClassificacaoAgendamento({ status: "agendado", selecionado: true }),
  "contrato"
);
assert.equal(
  resolveClassificacaoAgendamento({ status: "agendado", selecionado: false }),
  "adicional"
);

assert.equal(isDataNaVigencia("2026-03-15", "2026-01-01", "2026-12-31"), true);
assert.equal(isDataNaVigencia("2025-12-31", "2026-01-01", "2026-12-31"), false);
assert.equal(isDataNaVigencia("2027-01-01", "2026-01-01", "2026-12-31"), false);

const grecchi = {
  id: "cliente-grecchi",
  nome: "GRECCHI SOUZA SERVICOS MEDICOS LTDA",
};
const gibas = { id: "cliente-gibas", nome: "GIBAS BAR" };

assert.equal(
  agendamentoPertenceAoClienteContrato(
    {
      cliente_id: "cliente-gibas",
      cliente_nome: "GIBAS BAR",
    },
    grecchi
  ),
  false,
  "ELIETE/GIBAS BAR não entra na implantação GRECCHI"
);
assert.equal(
  agendamentoPertenceAoClienteContrato(
    {
      cliente_id: "cliente-gibas",
      cliente_nome: "GIBAS BAR",
    },
    gibas
  ),
  true
);
assert.equal(
  agendamentoPertenceAoClienteContrato(
    {
      cliente_id: "cliente-grecchi",
      cliente_nome: "GRECCHI SOUZA SERVICOS MEDICOS LTDA",
    },
    grecchi
  ),
  true
);
assert.equal(
  agendamentoPertenceAoClienteContrato(
    {
      cliente_id: "cliente-grecchi",
      cliente_nome: "GIBAS BAR",
    },
    grecchi
  ),
  false,
  "UUID da GRECCHI com nome GIBAS BAR não entra na implantação GRECCHI"
);
assert.equal(
  agendamentoPertenceAoClienteContrato(
    {
      cliente_id: "cliente-grecchi",
      cliente_nome: "GIBAS BAR",
    },
    grecchi,
    [grecchi, gibas]
  ),
  false,
  "catálogo confirma que GIBAS BAR é outro cliente"
);
assert.equal(
  agendamentoPertenceAoClienteContrato(
    {
      cliente_id: "cliente-grecchi",
      cliente_nome: null,
    },
    grecchi
  ),
  true,
  "UUID deste cliente sem nome no agendamento ainda entra"
);
assert.equal(
  agendamentoPertenceAoClienteContrato(
    {
      cliente_id: "cliente-gibas",
      cliente_nome: "GRECCHI SOUZA SERVICOS MEDICOS LTDA",
    },
    grecchi
  ),
  false,
  "outro cliente_id é ignorado mesmo se o nome coincidir"
);
assert.equal(
  agendamentoPertenceAoClienteContrato(
    { cliente_id: null, cliente_nome: "GIBAS BAR" },
    grecchi
  ),
  false
);
assert.equal(
  agendamentoPertenceAoClienteContrato(
    {
      cliente_id: null,
      cliente_nome: "GRECCHI SOUZA SERVICOS MEDICOS LTDA",
    },
    grecchi
  ),
  true,
  "legado sem UUID ainda casa pelo nome exato deste cliente"
);

const extrasGrecchi = buildContratoAgendamentoContagem(3, 3, 0);
assert.equal(extrasGrecchi.adicionais, 0);

assert.equal(
  agendamentoConsomeSaldoContrato({
    status: "agendado",
    contrato_id: "ctr-a",
    consome_saldo_contrato: null,
  }),
  true
);
assert.equal(
  agendamentoConsomeSaldoContrato({
    status: "cancelado",
    contrato_id: "ctr-a",
    consome_saldo_contrato: true,
  }),
  false
);

// Exemplo da especificação: 3 previstos, 3 selecionados, 2 adicionais válidos
const c = buildContratoAgendamentoContagem(3, 3, 2);
assert.equal(c.previstos, 3);
assert.equal(c.utilizados, 3);
assert.equal(c.disponiveis, 0);
assert.equal(c.adicionais, 2);
assert.equal(c.percentual, 100);
assert.equal(c.concluido, true);

const parcial = buildContratoAgendamentoContagem(3, 2, 3);
assert.equal(parcial.disponiveis, 1);
assert.equal(parcial.concluido, false);
assert.equal(parcial.percentual < 100, true);

const zero = buildContratoAgendamentoContagem(0, 0, 0);
assert.equal(zero.concluido, false);
assert.equal(zero.dispensado, false);

const dispensado = buildContratoAgendamentoContagem(2, 0, 3, {
  dispensado: true,
});
assert.equal(dispensado.previstos, 2);
assert.equal(dispensado.utilizados, 0);
assert.equal(dispensado.disponiveis, 0);
assert.equal(dispensado.adicionais, 3);
assert.equal(dispensado.concluido, true);
assert.equal(dispensado.dispensado, true);
assert.equal(dispensado.progressoLabel, "Concluído por dispensa");
assert.equal(dispensado.situacaoLabel, "Dispensados pelo cliente");

assert.equal(
  resolveClassificacaoAgendamento({
    status: "agendado",
    selecionado: true,
    dispensado: true,
  }),
  "adicional"
);

const nataliaAg = {
  id: "ag-natalia",
  data_agendamento: "2026-08-24",
  horario: "08:00",
  contrato_id: "ctr-13",
  cliente_id: "cli-anto",
  cliente_nome: "ANTÔ CAFE E BAR LTDA",
  status: "agendado",
  aso: "Admissional",
} as AgendamentoWithExames;

assert.deepEqual(idsAgendamentoDasVagas([
  { agendamento_id: "ag-natalia" },
  { agendamento_id: null },
  { agendamento_id: "ag-natalia" },
]), ["ag-natalia"]);

const mesclados = mesclarAgendamentosPorId([
  [],
  [nataliaAg],
]);
assert.equal(mesclados.length, 1);
assert.equal(mesclados[0].id, "ag-natalia");
assert.equal(mesclados[0].aso, "Admissional");

assert.equal(
  agendamentoEVinculadoAoContrato({
    agendamento: nataliaAg,
    contratoId: "ctr-13",
    idsAgendamentoDasVagas: [],
  }),
  true
);
assert.equal(
  agendamentoEVinculadoAoContrato({
    agendamento: { id: "ag-natalia", contrato_id: null },
    contratoId: "ctr-13",
    idsAgendamentoDasVagas: ["ag-natalia"],
  }),
  true
);
assert.equal(
  agendamentoVisivelNaAbaContrato({
    agendamento: nataliaAg,
    contratoId: "ctr-13",
    idsAgendamentoDasVagas: ["ag-natalia"],
    cliente: { id: "cli-anto", nome: "Nome diferente no orçamento" },
  }),
  true,
  "vaga vinculada permanece visível mesmo se o nome do orçamento divergir"
);
assert.equal(
  agendamentoPertenceAoClienteContrato(
    {
      cliente_id: "cli-anto",
      cliente_nome: "ANTÔ CAFE E BAR LTDA",
    },
    { id: "cli-anto", nome: "Nome diferente no orçamento" }
  ),
  false,
  "o filtro antigo de nome isolado excluiria a Natália"
);

console.log("ok: contrato-agendamentos");
