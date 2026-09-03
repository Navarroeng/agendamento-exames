/**
 * Testes do módulo Portal Faturas (lib/portal-faturas.ts).
 * Execução: npx tsx scripts/test-portal-faturas.ts
 */

import assert from "node:assert/strict";
import {
  calcPortalFaturasResumo,
  faturaPertencesseAoCliente,
  faturaToPortalLinha,
  filtrarPortalFaturas,
  resolverStatusPortalFatura,
  type PortalFaturaFiltros,
} from "../lib/portal-faturas";
import type { FaturaRecord } from "../lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function run(label: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${label}`);
    console.error(
      "   ",
      err instanceof Error ? err.message : String(err)
    );
  }
}

const DATA_REF_ATUAL = new Date("2026-09-03T12:00:00-03:00");

function mockFatura(
  overrides: Partial<FaturaRecord> & { id?: string } = {}
): FaturaRecord {
  return {
    id: overrides.id ?? "fatura-1",
    numero: overrides.numero ?? "FAT-00001",
    tipo: overrides.tipo ?? "cliente",
    referencia_id: overrides.referencia_id !== undefined ? overrides.referencia_id : "cliente-a",
    referencia_nome: overrides.referencia_nome ?? "Empresa A",
    periodo_inicio: null,
    periodo_fim: null,
    mes_referencia: overrides.mes_referencia ?? "2026-08",
    data_emissao: overrides.data_emissao ?? "2026-08-01",
    data_vencimento: overrides.data_vencimento ?? "2026-09-05",
    valor_total: overrides.valor_total ?? 1000,
    total_exames: 1,
    status: overrides.status ?? "emitida",
    gerado_por: null,
    pago: overrides.pago ?? false,
    data_pagamento: overrides.data_pagamento ?? null,
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
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Testes: resolverStatusPortalFatura
// ---------------------------------------------------------------------------

console.log("\n== resolverStatusPortalFatura ==");

run("emitida não paga, dentro do mês → emitida", () => {
  // vencimento no futuro
  const f = mockFatura({ data_vencimento: "2026-09-05", status: "emitida" });
  assert.equal(resolverStatusPortalFatura(f, DATA_REF_ATUAL), "emitida");
});

run("emitida não paga, após o mês do vencimento → vencida", () => {
  // vencimento em julho, referência em setembro → vencida
  const f = mockFatura({ data_vencimento: "2026-07-10", status: "emitida" });
  assert.equal(resolverStatusPortalFatura(f, DATA_REF_ATUAL), "vencida");
});

run("status vencida no DB → vencida", () => {
  const f = mockFatura({ status: "vencida" });
  assert.equal(resolverStatusPortalFatura(f, DATA_REF_ATUAL), "vencida");
});

run("pago=true → paga independente do status", () => {
  const f = mockFatura({ status: "vencida", pago: true });
  assert.equal(resolverStatusPortalFatura(f, DATA_REF_ATUAL), "paga");
});

run("cancelada → cancelada", () => {
  const f = mockFatura({ status: "cancelada" });
  assert.equal(resolverStatusPortalFatura(f, DATA_REF_ATUAL), "cancelada");
});

run("substituida → cancelada", () => {
  const f = mockFatura({ status: "substituida" });
  assert.equal(resolverStatusPortalFatura(f, DATA_REF_ATUAL), "cancelada");
});

run("reemitida → cancelada", () => {
  const f = mockFatura({ status: "reemitida" });
  assert.equal(resolverStatusPortalFatura(f, DATA_REF_ATUAL), "cancelada");
});

run("necessita_reemissao → emitida (visível ao cliente como em aberto)", () => {
  const f = mockFatura({ status: "necessita_reemissao" });
  assert.equal(resolverStatusPortalFatura(f, DATA_REF_ATUAL), "emitida");
});

// ---------------------------------------------------------------------------
// Testes: faturaPertencesseAoCliente — isolamento por cliente
// ---------------------------------------------------------------------------

console.log("\n== faturaPertencesseAoCliente ==");

run("fatura com referencia_id correto → pertence", () => {
  const f = mockFatura({ referencia_id: "cliente-a" });
  assert.ok(faturaPertencesseAoCliente(f, "cliente-a", "Empresa A"));
});

run("fatura com referencia_id de outro cliente → NÃO pertence", () => {
  const f = mockFatura({ referencia_id: "cliente-b" });
  assert.ok(!faturaPertencesseAoCliente(f, "cliente-a", "Empresa A"));
});

run("fatura sem referencia_id, nome igual → pertence (fallback)", () => {
  const f = mockFatura({ referencia_id: null, referencia_nome: "Empresa A" });
  assert.ok(faturaPertencesseAoCliente(f, "cliente-a", "Empresa A"));
});

run("fatura sem referencia_id, nome diferente → NÃO pertence", () => {
  const f = mockFatura({ referencia_id: null, referencia_nome: "Empresa B" });
  assert.ok(!faturaPertencesseAoCliente(f, "cliente-a", "Empresa A"));
});

run("fatura tipo clinica → NÃO pertence a nenhum cliente", () => {
  const f = mockFatura({ tipo: "clinica", referencia_id: "cliente-a" });
  assert.ok(!faturaPertencesseAoCliente(f, "cliente-a", "Empresa A"));
});

// ---------------------------------------------------------------------------
// Testes: calcPortalFaturasResumo
// ---------------------------------------------------------------------------

console.log("\n== calcPortalFaturasResumo ==");

run("empresa sem faturas → zeros", () => {
  const r = calcPortalFaturasResumo([]);
  assert.equal(r.temFaturas, false);
  assert.equal(r.totalEmAberto, 0);
  assert.equal(r.totalVencidas, 0);
  assert.equal(r.totalPagas, 0);
  assert.equal(r.valorEmAberto, 0);
});

run("empresa com 1 fatura emitida → 1 em aberto", () => {
  const f = mockFatura({ valor_total: 1850 });
  const r = calcPortalFaturasResumo([f], DATA_REF_ATUAL);
  assert.equal(r.totalEmAberto, 1);
  assert.equal(r.totalVencidas, 0);
  assert.equal(r.valorEmAberto, 1850);
  assert.equal(r.temFaturas, true);
});

run("empresa com 1 fatura vencida → 1 vencida, valor em aberto inclui vencida", () => {
  const f = mockFatura({ data_vencimento: "2026-07-10", status: "emitida", valor_total: 2000 });
  const r = calcPortalFaturasResumo([f], DATA_REF_ATUAL);
  assert.equal(r.totalVencidas, 1);
  assert.equal(r.totalEmAberto, 0);
  assert.equal(r.valorEmAberto, 2000);
});

run("empresa com fatura paga → 1 paga, sem valor em aberto", () => {
  const f = mockFatura({ pago: true, data_pagamento: "2026-08-20", valor_total: 500 });
  const r = calcPortalFaturasResumo([f], DATA_REF_ATUAL);
  assert.equal(r.totalPagas, 1);
  assert.equal(r.valorEmAberto, 0);
});

run("cancelada não conta nos KPIs", () => {
  const f = mockFatura({ status: "cancelada", valor_total: 9999 });
  const r = calcPortalFaturasResumo([f], DATA_REF_ATUAL);
  assert.equal(r.totalEmAberto, 0);
  assert.equal(r.totalVencidas, 0);
  assert.equal(r.totalPagas, 0);
  assert.equal(r.valorEmAberto, 0);
});

run("mix: 2 emitidas + 1 vencida + 1 paga + 1 cancelada", () => {
  const faturas = [
    mockFatura({ id: "1", valor_total: 1000, status: "emitida", data_vencimento: "2026-09-05" }),
    mockFatura({ id: "2", valor_total: 2000, status: "emitida", data_vencimento: "2026-09-10" }),
    mockFatura({ id: "3", valor_total: 850, status: "emitida", data_vencimento: "2026-07-10" }), // vencida
    mockFatura({ id: "4", valor_total: 500, pago: true, data_pagamento: "2026-08-15" }),
    mockFatura({ id: "5", valor_total: 9999, status: "cancelada" }),
  ];
  const r = calcPortalFaturasResumo(faturas, DATA_REF_ATUAL);
  assert.equal(r.totalEmAberto, 2);
  assert.equal(r.totalVencidas, 1);
  assert.equal(r.totalPagas, 1);
  assert.equal(r.valorEmAberto, 1000 + 2000 + 850);
});

// ---------------------------------------------------------------------------
// Testes: filtrarPortalFaturas
// ---------------------------------------------------------------------------

console.log("\n== filtrarPortalFaturas ==");

function mockLinha(overrides: Partial<ReturnType<typeof faturaToPortalLinha>> = {}) {
  return {
    id: overrides.id ?? "1",
    numero: "FAT-00001",
    competencia: overrides.competencia ?? "08/2026",
    dataEmissao: "01/08/2026",
    dataVencimento: "05/09/2026",
    valorTotal: 1000,
    valorFormatado: "R$ 1.000,00",
    status: overrides.status ?? ("emitida" as const),
    pago: false,
    dataPagamento: null,
    ...overrides,
  };
}

const filtroDefault: PortalFaturaFiltros = {
  status: "todas",
  competencia: "",
  mostrarCanceladas: false,
};

run("cancelada oculta por padrão", () => {
  const linhas = [
    mockLinha({ id: "1", status: "emitida" }),
    mockLinha({ id: "2", status: "cancelada" }),
  ];
  const r = filtrarPortalFaturas(linhas, filtroDefault);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "1");
});

run("mostrarCanceladas=true exibe canceladas", () => {
  const linhas = [
    mockLinha({ id: "1", status: "emitida" }),
    mockLinha({ id: "2", status: "cancelada" }),
  ];
  const r = filtrarPortalFaturas(linhas, { ...filtroDefault, mostrarCanceladas: true });
  assert.equal(r.length, 2);
});

run("filtro por status emitida exclui vencidas e pagas", () => {
  const linhas = [
    mockLinha({ id: "1", status: "emitida" }),
    mockLinha({ id: "2", status: "vencida" }),
    mockLinha({ id: "3", status: "paga" }),
  ];
  const r = filtrarPortalFaturas(linhas, { ...filtroDefault, status: "emitida" });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "1");
});

run("filtro por competência retorna apenas do mês correto", () => {
  const linhas = [
    mockLinha({ id: "1", competencia: "08/2026" }),
    mockLinha({ id: "2", competencia: "07/2026" }),
  ];
  const r = filtrarPortalFaturas(linhas, { ...filtroDefault, competencia: "08/2026" });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "1");
});

run("filtro status=cancelada exibe canceladas sem precisar do checkbox", () => {
  const linhas = [
    mockLinha({ id: "1", status: "emitida" }),
    mockLinha({ id: "2", status: "cancelada" }),
  ];
  const r = filtrarPortalFaturas(linhas, { ...filtroDefault, status: "cancelada" });
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "2");
});

run("status outros nunca aparece", () => {
  const linhas = [mockLinha({ id: "1", status: "outros" as "emitida" })];
  const r = filtrarPortalFaturas(linhas, filtroDefault);
  assert.equal(r.length, 0);
});

run("lista vazia sem quebrar", () => {
  const r = filtrarPortalFaturas([], filtroDefault);
  assert.equal(r.length, 0);
});

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
