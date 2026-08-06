/** Smoke: abas mensais de Orçamentos (data_proposta) + integração com filtros. */

import assert from "node:assert/strict";
import { filterOrcamentos } from "../lib/orcamento-filters";
import {
  filterOrcamentosPorMes,
  listOrcamentoAnos,
  listOrcamentoMesAbas,
  orcamentoBelongsToMes,
  resolveInitialOrcamentoMes,
  resolveOrcamentoMesParaAno,
} from "../lib/orcamento-meses";
import { isMesDisponivel } from "../lib/listagem-meses";
import type { OrcamentoRecord } from "../lib/orcamento-types";

function stub(
  partial: Partial<OrcamentoRecord> &
    Pick<OrcamentoRecord, "id" | "numero" | "status" | "data_proposta">
): OrcamentoRecord {
  return {
    cliente_id: null,
    cliente_nome: "Cliente Teste",
    cliente_cnpj: null,
    cliente_endereco: null,
    cliente_setor: null,
    contato: null,
    email: null,
    telefone: null,
    responsavel: "Agatha",
    origem_cliente: null,
    observacoes: null,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: null,
    validade_proposta: null,
    subtotal: 0,
    valor_total: 0,
    assinatura_status: "nao_aplicavel",
    assinatura_token: null,
    aceite_em: null,
    aceite_ip: null,
    aceite_usuario_nome: null,
    link_aceite_expira_em: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

const agoraAgosto = new Date(2026, 7, 6); // 06/08/2026

const abas2026 = listOrcamentoMesAbas(2026);
assert.equal(abas2026.length, 6);
assert.deepEqual(abas2026[0], { year: 2026, month: 7 });
assert.deepEqual(abas2026[5], { year: 2026, month: 12 });

const abas2027 = listOrcamentoMesAbas(2027);
assert.equal(abas2027.length, 12);
assert.deepEqual(abas2027[0], { year: 2027, month: 1 });

assert.deepEqual(listOrcamentoAnos(agoraAgosto), [2026]);
assert.deepEqual(resolveInitialOrcamentoMes(agoraAgosto), {
  year: 2026,
  month: 8,
});

assert.equal(isMesDisponivel({ year: 2026, month: 7 }, agoraAgosto), true);
assert.equal(isMesDisponivel({ year: 2026, month: 8 }, agoraAgosto), true);
assert.equal(isMesDisponivel({ year: 2026, month: 9 }, agoraAgosto), false);

assert.deepEqual(resolveOrcamentoMesParaAno(2026, 8, agoraAgosto), {
  year: 2026,
  month: 8,
});
assert.deepEqual(resolveOrcamentoMesParaAno(2026, 11, agoraAgosto), {
  year: 2026,
  month: 8,
});

const julho = stub({
  id: "j1",
  numero: "ORC-2026-0010",
  status: "enviado",
  data_proposta: "2026-07-15",
  cliente_nome: "Cliente Julho",
  responsavel: "Bruna",
});
const agostoBase = [
  stub({
    id: "a21",
    numero: "ORC-2026-0021",
    status: "enviado",
    data_proposta: "2026-08-01",
    cliente_nome: "Alpha",
    responsavel: "Bruna",
  }),
  stub({
    id: "a22",
    numero: "ORC-2026-0022",
    status: "em_elaboracao",
    data_proposta: "2026-08-02",
  }),
  stub({
    id: "a23",
    numero: "ORC-2026-0023",
    status: "enviado",
    data_proposta: "2026-08-03",
  }),
  stub({
    id: "a24",
    numero: "ORC-2026-0024",
    status: "aprovado",
    data_proposta: "2026-08-04",
  }),
  stub({
    id: "a25",
    numero: "ORC-2026-0025",
    status: "enviado",
    data_proposta: "2026-08-05",
  }),
  stub({
    id: "a26",
    numero: "ORC-2026-0026",
    status: "enviado",
    data_proposta: "2026-08-05",
  }),
  stub({
    id: "a27",
    numero: "ORC-2026-0027",
    status: "enviado",
    data_proposta: "2026-08-05",
  }),
  stub({
    id: "a28",
    numero: "ORC-2026-0028",
    status: "enviado",
    data_proposta: "2026-08-05",
  }),
  stub({
    id: "a29",
    numero: "ORC-2026-0029",
    status: "enviado",
    data_proposta: "2026-08-05",
  }),
  stub({
    id: "a30",
    numero: "ORC-2026-0030",
    status: "enviado",
    data_proposta: "2026-08-05",
    cliente_nome: "Cliente 30",
  }),
];
const encerradoAgosto = stub({
  id: "ae",
  numero: "ORC-2026-0017",
  status: "contrato_encerrado",
  data_proposta: "2026-08-10",
  cliente_nome: "Encerrado Agosto",
});

const all = [julho, ...agostoBase, encerradoAgosto];

assert.equal(
  orcamentoBelongsToMes(
    { data_proposta: "2026-08-05" },
    { year: 2026, month: 8 }
  ),
  true
);

const soJulho = filterOrcamentosPorMes(all, { year: 2026, month: 7 });
assert.equal(soJulho.length, 1);
assert.equal(soJulho[0].numero, "ORC-2026-0010");

const soAgosto = filterOrcamentosPorMes(all, { year: 2026, month: 8 });
assert.equal(soAgosto.length, 11);
assert.ok(soAgosto.every((o) => o.data_proposta.startsWith("2026-08")));
for (const n of [
  "ORC-2026-0021",
  "ORC-2026-0022",
  "ORC-2026-0023",
  "ORC-2026-0024",
  "ORC-2026-0025",
  "ORC-2026-0026",
  "ORC-2026-0027",
  "ORC-2026-0028",
  "ORC-2026-0029",
  "ORC-2026-0030",
]) {
  assert.ok(
    soAgosto.some((o) => o.numero === n),
    `faltou ${n} em agosto`
  );
}

// Integração: mês → status → busca; Todos oculta encerrado
const agostoTodos = filterOrcamentos(soAgosto, { busca: "", status: "" });
assert.equal(agostoTodos.length, 10);
assert.ok(!agostoTodos.some((o) => o.status === "contrato_encerrado"));

const agostoEncerrados = filterOrcamentos(soAgosto, {
  busca: "",
  status: "contrato_encerrado",
});
assert.equal(agostoEncerrados.length, 1);
assert.equal(agostoEncerrados[0].numero, "ORC-2026-0017");

const buscaBrunaAgosto = filterOrcamentos(soAgosto, {
  busca: "Bruna",
  status: "enviado",
});
assert.equal(buscaBrunaAgosto.length, 1);
assert.equal(buscaBrunaAgosto[0].numero, "ORC-2026-0021");

// Busca em agosto não retorna julho
const buscaJulhoEmAgosto = filterOrcamentos(soAgosto, {
  busca: "ORC-2026-0010",
  status: "",
});
assert.equal(buscaJulhoEmAgosto.length, 0);

const setembroVazio = filterOrcamentosPorMes(all, {
  year: 2026,
  month: 9,
});
assert.equal(setembroVazio.length, 0);

console.log("test-orcamento-meses: OK");
