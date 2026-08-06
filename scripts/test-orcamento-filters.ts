/** Smoke test: filtro padrão de Orçamentos exclui contrato_encerrado. */

import assert from "node:assert/strict";
import { filterOrcamentos } from "../lib/orcamento-filters";
import type { OrcamentoRecord } from "../lib/orcamento-types";

function stub(partial: Partial<OrcamentoRecord> & Pick<OrcamentoRecord, "id" | "numero" | "status">): OrcamentoRecord {
  return {
    data_proposta: "2026-01-01",
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

const elaboracao = stub({
  id: "1",
  numero: "ORC-2026-0010",
  status: "em_elaboracao",
  cliente_nome: "Alpha Ltda",
});
const enviado = stub({
  id: "2",
  numero: "ORC-2026-0011",
  status: "enviado",
  cliente_nome: "Beta SA",
});
const aprovado = stub({
  id: "3",
  numero: "ORC-2026-0012",
  status: "aprovado",
  cliente_nome: "Gamma ME",
});
const encerrado = stub({
  id: "4",
  numero: "ORC-2026-0017",
  status: "contrato_encerrado",
  cliente_nome: "Delta Encerrado",
  contato: "João Encerrado",
  responsavel: "Maria",
});
const cancelado = stub({
  id: "5",
  numero: "ORC-2026-0005",
  status: "cancelado",
  cliente_nome: "Epsilon Cancelado",
});

const all = [elaboracao, enviado, aprovado, encerrado, cancelado];

// 1) Todos (status "") exclui contrato_encerrado
const todos = filterOrcamentos(all, { busca: "", status: "" });
assert.equal(todos.length, 4);
assert.ok(!todos.some((o) => o.status === "contrato_encerrado"));
assert.ok(todos.some((o) => o.numero === "ORC-2026-0010"));
assert.ok(todos.some((o) => o.status === "cancelado"));

// 2) Filtro explícito contrato_encerrado
const soEncerrados = filterOrcamentos(all, {
  busca: "",
  status: "contrato_encerrado",
});
assert.equal(soEncerrados.length, 1);
assert.equal(soEncerrados[0].numero, "ORC-2026-0017");

// 3) Filtro por status ativo
const soAprovados = filterOrcamentos(all, { busca: "", status: "aprovado" });
assert.equal(soAprovados.length, 1);
assert.equal(soAprovados[0].numero, "ORC-2026-0012");

// 4) Busca com filtro padrão não retorna encerrado
const buscaTodos = filterOrcamentos(all, {
  busca: "ORC-2026-0017",
  status: "",
});
assert.equal(buscaTodos.length, 0);

const buscaNomeEncerrado = filterOrcamentos(all, {
  busca: "Delta Encerrado",
  status: "",
});
assert.equal(buscaNomeEncerrado.length, 0);

// 5) Busca com filtro Contrato encerrado retorna
const buscaEncerrado = filterOrcamentos(all, {
  busca: "ORC-2026-0017",
  status: "contrato_encerrado",
});
assert.equal(buscaEncerrado.length, 1);
assert.equal(buscaEncerrado[0].id, "4");

const buscaContatoEncerrado = filterOrcamentos(all, {
  busca: "João Encerrado",
  status: "contrato_encerrado",
});
assert.equal(buscaContatoEncerrado.length, 1);

// 6) Contagem = registros do filtro (já validado via length acima)
assert.equal(
  filterOrcamentos(all, { busca: "", status: "" }).length,
  4,
  "contagem Todos"
);
assert.equal(
  filterOrcamentos(all, { busca: "", status: "contrato_encerrado" }).length,
  1,
  "contagem encerrados"
);

// 7) Busca de ativo com Todos continua funcionando
const buscaAtivo = filterOrcamentos(all, {
  busca: "Alpha",
  status: "",
});
assert.equal(buscaAtivo.length, 1);
assert.equal(buscaAtivo[0].numero, "ORC-2026-0010");

console.log("test-orcamento-filters: OK");
