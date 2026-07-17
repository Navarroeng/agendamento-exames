import assert from "node:assert/strict";
import {
  deriveFaturaClienteStatusExibicao,
  faturaClienteBloqueiaEdicaoAgendamento,
  resolverBloqueioAgendamentoFatura,
} from "../lib/agendamento-fatura-bloqueio";
import type { FaturaVinculoAgendamento } from "../lib/agendamento-fatura-bloqueio";

function fatura(
  status: FaturaVinculoAgendamento["status"],
  overrides: Partial<FaturaVinculoAgendamento> = {}
): FaturaVinculoAgendamento {
  return {
    id: overrides.id ?? "f1",
    numero: overrides.numero ?? "FAT-CLI-2026-00001",
    tipo: overrides.tipo ?? "cliente",
    status,
    pago: overrides.pago ?? false,
    data_vencimento: overrides.data_vencimento ?? "2026-07-05",
    ...overrides,
  };
}

assert.equal(
  resolverBloqueioAgendamentoFatura([]).bloqueado,
  false,
  "sem fatura vinculada"
);

assert.equal(
  resolverBloqueioAgendamentoFatura([fatura("rascunho")]).bloqueado,
  false,
  "fatura rascunho / aberta para emissao"
);

assert.equal(
  resolverBloqueioAgendamentoFatura([fatura("cancelada")]).bloqueado,
  false,
  "fatura cancelada"
);

const emitida = resolverBloqueioAgendamentoFatura([fatura("emitida")]);
assert.equal(emitida.bloqueado, true, "fatura emitida");
assert.equal(emitida.faturaStatusLabel, "Em aberto");

const paga = resolverBloqueioAgendamentoFatura([
  fatura("emitida", { pago: true, numero: "FAT-PAGA" }),
]);
assert.equal(paga.bloqueado, true, "fatura paga");
assert.equal(paga.faturaStatusLabel, "Paga");

const vencida = resolverBloqueioAgendamentoFatura([
  fatura("vencida", { data_vencimento: "2020-01-01", numero: "FAT-VENC" }),
]);
assert.equal(vencida.bloqueado, true, "fatura vencida");
assert.equal(vencida.faturaStatusLabel, "Vencida");

const emitidaAtraso = resolverBloqueioAgendamentoFatura([
  fatura("emitida", { data_vencimento: "2020-01-01", numero: "FAT-ATRASO" }),
]);
assert.equal(emitidaAtraso.faturaStatusLabel, "Em aberto");

assert.equal(
  resolverBloqueioAgendamentoFatura([
    fatura("cancelada"),
    fatura("emitida", { numero: "FAT-ATIVA" }),
  ]).faturaNumero,
  "FAT-ATIVA",
  "prioriza fatura emitida sobre cancelada"
);

assert.equal(
  faturaClienteBloqueiaEdicaoAgendamento(fatura("emitida")),
  true
);
assert.equal(
  faturaClienteBloqueiaEdicaoAgendamento(fatura("cancelada")),
  false
);
assert.equal(
  faturaClienteBloqueiaEdicaoAgendamento({
    ...fatura("emitida"),
    tipo: "clinica",
  }),
  false,
  "fatura clinica nao bloqueia"
);

assert.equal(deriveFaturaClienteStatusExibicao(fatura("rascunho")), "Aberta para emissão");

console.log("test-agendamento-fatura-bloqueio: OK");
