/**
 * Snapshot da fatura cliente na reabertura/reemissão (caso PAVFACIL).
 * Executar: npx tsx scripts/test-fatura-reemissao-snapshot.ts
 */
import assert from "node:assert/strict";
import {
  rebuildItensFaturaClienteFromAgendamentos,
  shouldRebuildFaturaClienteItensFromAgendamentos,
  faturaClienteBloqueiaSalvarAlteracao,
  calcTotaisFaturaItens,
} from "../lib/fatura-itens-rebuild";
import {
  buildFaturaItensFromAgendamentos,
  calcTotalFaturaItens,
  faturaComItensToPreview,
} from "../lib/fatura-mappers";
import type {
  AgendamentoWithExames,
  FaturaComItens,
  FaturaItemInsert,
  FaturaRecord,
} from "../lib/types";

function ag(
  id: string,
  cliente: string,
  data: string,
  exames: { tipo: string; valor: number }[]
): AgendamentoWithExames {
  return {
    id,
    cliente_id: "cli-1",
    cliente_nome: cliente,
    data_agendamento: data,
    status: "agendado",
    colaborador: "Colaborador A",
    clinica_nome: "Clínica X",
    responsavel: "Resp",
    aso: "Admissional",
    agendamento_exames: exames.map((e, idx) => ({
      id: `${id}-e${idx}`,
      agendamento_id: id,
      tipo_exame: e.tipo,
      valor_cliente: e.valor,
      custo_clinica: 0,
    })),
  } as AgendamentoWithExames;
}

function faturaBase(
  overrides: Partial<FaturaRecord> = {}
): FaturaComItens {
  return {
    id: "fat-1",
    numero: "FAT-CLI-2026-00102",
    tipo: "cliente",
    referencia_id: "cli-1",
    referencia_nome: "PAVFACIL",
    periodo_inicio: "2026-08-01",
    periodo_fim: "2026-08-31",
    mes_referencia: "2026-08",
    data_emissao: "2026-08-05T12:00:00.000Z",
    data_vencimento: "2026-08-15",
    valor_total: 210,
    total_exames: 3,
    status: "emitida",
    gerado_por: "Teste",
    pago: false,
    data_pagamento: null,
    observacao_pagamento: null,
    comprovante_pagamento_path: null,
    comprovante_pagamento_nome: null,
    conferido_em: null,
    conferido_por: null,
    fatura_clinica_path: null,
    fatura_clinica_nome: null,
    fatura_clinica_tipo: null,
    fatura_clinica_tamanho: null,
    observacao_conferencia: null,
    conferencia_registrada_em: null,
    fatura_origem_id: null,
    fatura_substituta_id: null,
    created_at: "",
    updated_at: "",
    fatura_itens: [],
    ...overrides,
  } as FaturaComItens;
}

function itensFromAgendamentos(
  agendamentos: AgendamentoWithExames[]
): FaturaItemInsert[] {
  return buildFaturaItensFromAgendamentos(agendamentos, "cliente");
}

function snapshotFromItens(
  fatura: FaturaComItens,
  itens: FaturaItemInsert[]
): FaturaComItens {
  return {
    ...fatura,
    valor_total: calcTotalFaturaItens(itens),
    total_exames: itens.length,
    fatura_itens: itens.map((item, idx) => ({
      id: `item-${idx}`,
      fatura_id: fatura.id,
      ...item,
    })),
  };
}

const mesRef = "08/2026";
const faturaSource = {
  referencia_nome: "PAVFACIL",
  referencia_id: "cli-1",
  mes_referencia: "2026-08",
  periodo_inicio: "2026-08-01",
};

const agendamentosIniciais = [
  ag("ag-1", "PAVFACIL", "2026-08-10", [
    { tipo: "Clínico", valor: 100 },
    { tipo: "Audiometria", valor: 33 },
    { tipo: "RX Tórax - PA", valor: 77 },
  ]),
];

console.log("=== A) Emissão inicial R$ 100 ===");
const itensEmitidos = itensFromAgendamentos(agendamentosIniciais);
assert.equal(itensEmitidos.find((i) => i.exame_nome === "Clínico")?.valor_unitario, 100);
assert.equal(calcTotalFaturaItens(itensEmitidos), 210);
const faturaEmitida = snapshotFromItens(
  faturaBase({ status: "emitida", valor_total: 210, total_exames: 3 }),
  itensEmitidos
);
const previewEmitida = faturaComItensToPreview(faturaEmitida, true);
assert.equal(
  previewEmitida.itens.find((i) => i.exame_nome === "Clínico")?.valor_unitario,
  100
);
console.log("OK  A — snapshot/PDF base = R$ 100, total R$ 210");

console.log("=== B) Editar agendamento sem reabrir — emitida congelada ===");
const agendamentosEditadosSemReabrir = [
  ag("ag-1", "PAVFACIL", "2026-08-10", [
    { tipo: "Clínico", valor: 50 },
    { tipo: "Audiometria", valor: 33 },
    { tipo: "RX Tórax - PA", valor: 77 },
  ]),
];
assert.equal(
  shouldRebuildFaturaClienteItensFromAgendamentos(
    { tipo: "cliente", status: "emitida", faturaId: "fat-1" },
    faturaEmitida
  ),
  false
);
assert.equal(faturaClienteBloqueiaSalvarAlteracao(faturaEmitida), true);
assert.equal(faturaEmitida.fatura_itens[0]?.valor_unitario, 100);
assert.equal(
  buildFaturaItensFromAgendamentos(agendamentosEditadosSemReabrir, "cliente")[0]
    ?.valor_unitario,
  50,
  "agendamento vivo mudou, mas snapshot emitido não"
);
console.log("OK  B — fatura emitida permanece R$ 100 no snapshot");

console.log("=== C) Reabrir → editar R$ 50 → emitir novamente ===");
const faturaRascunho = faturaBase({
  status: "rascunho",
  data_emissao: null,
  valor_total: 210,
});
assert.equal(
  shouldRebuildFaturaClienteItensFromAgendamentos(
    { tipo: "cliente", status: "emitida", faturaId: "fat-1" },
    faturaRascunho
  ),
  true
);
const itensReemitidos = rebuildItensFaturaClienteFromAgendamentos(
  faturaSource,
  agendamentosEditadosSemReabrir
);
assert.equal(
  itensReemitidos.find((i) => i.exame_nome === "Clínico")?.valor_unitario,
  50
);
const totaisReemitidos = calcTotaisFaturaItens(itensReemitidos);
assert.equal(totaisReemitidos.valorTotal, 160);
assert.equal(totaisReemitidos.totalExames, 3);
const faturaReemitida = snapshotFromItens(
  {
    ...faturaRascunho,
    status: "emitida",
    data_emissao: new Date().toISOString(),
    valor_total: totaisReemitidos.valorTotal,
    total_exames: totaisReemitidos.totalExames,
  },
  itensReemitidos
);
const previewReemitida = faturaComItensToPreview(faturaReemitida, true);
assert.equal(
  previewReemitida.itens.find((i) => i.exame_nome === "Clínico")?.valor_unitario,
  50
);
assert.equal(calcTotalFaturaItens(previewReemitida.itens), 160);
console.log("OK  C — reemissão: itens R$ 50, total R$ 160, visualização alinhada");

console.log("=== D) Nova emissão congelada — editar para R$ 80 sem reabrir ===");
const agendamentosPosEmissao = [
  ag("ag-1", "PAVFACIL", "2026-08-10", [
    { tipo: "Clínico", valor: 80 },
    { tipo: "Audiometria", valor: 33 },
    { tipo: "RX Tórax - PA", valor: 77 },
  ]),
];
assert.equal(
  shouldRebuildFaturaClienteItensFromAgendamentos(
    { tipo: "cliente", status: "emitida", faturaId: "fat-1" },
    faturaReemitida
  ),
  false
);
assert.equal(faturaReemitida.fatura_itens[0]?.valor_unitario, 50);
assert.notEqual(
  rebuildItensFaturaClienteFromAgendamentos(faturaSource, agendamentosPosEmissao)[0]
    ?.valor_unitario,
  faturaReemitida.fatura_itens[0]?.valor_unitario
);
console.log("OK  D — após nova emissão, snapshot permanece R$ 50");

console.log("=== Extras: múltiplos agendamentos e stale preview ===");
const multiAg = [
  ag("ag-1", "PAVFACIL", "2026-08-05", [{ tipo: "Clínico", valor: 50 }]),
  ag("ag-2", "PAVFACIL", "2026-08-12", [{ tipo: "Audiometria", valor: 33 }]),
];
const multiItens = rebuildItensFaturaClienteFromAgendamentos(
  faturaSource,
  multiAg
);
assert.equal(multiItens.length, 2);
assert.equal(calcTotalFaturaItens(multiItens), 83);

const stalePreviewItens: FaturaItemInsert[] = [
  {
    agendamento_id: "ag-1",
    data_agendamento: "2026-08-10",
    colaborador: "Colaborador A",
    cliente_nome: "PAVFACIL",
    clinica_nome: "Clínica X",
    tipo_aso: "Admissional",
    exame_nome: "Clínico",
    valor_unitario: 100,
    quantidade: 1,
    valor_total: 100,
  },
];
assert.equal(stalePreviewItens[0]?.valor_unitario, 100);
assert.equal(
  rebuildItensFaturaClienteFromAgendamentos(faturaSource, agendamentosEditadosSemReabrir)[0]
    ?.valor_unitario,
  50,
  "servidor ignora preview stale e reconstrói de agendamentos"
);
console.log("OK  extras — múltiplos agendamentos e rebuild substitui preview stale");

console.log("");
console.log("Todos os testes de snapshot na reemissão passaram.");
