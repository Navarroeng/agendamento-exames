import assert from "node:assert/strict";
import {
  canReemitirFaturaCliente,
  faturaStatusContaNoResumoEmitido,
  faturaStatusPermitePagamento,
} from "../lib/fatura-reemissao";
import {
  buildResumoClientesMes,
  deriveFaturaMesStatus,
  findFaturaReferenciaMes,
} from "../lib/fatura-mes-resumo";
import { faturaClienteEmitidaPossuiAlteracaoPosEmissao } from "../lib/fatura-alteracao-pos-emissao";
import type { FaturaRecord } from "../lib/types";

function fatura(
  id: string,
  cliente: string,
  mes: string,
  status: FaturaRecord["status"],
  overrides: Partial<FaturaRecord> = {}
): FaturaRecord {
  return {
    id,
    numero: overrides.numero ?? `FAT-${id}`,
    tipo: "cliente",
    referencia_id: null,
    referencia_nome: cliente,
    periodo_inicio: `${mes}-01`,
    periodo_fim: `${mes}-30`,
    mes_referencia: mes,
    data_emissao: status === "emitida" ? `${mes}-05` : null,
    data_vencimento: `${mes}-15`,
    valor_total: overrides.valor_total ?? 100,
    total_exames: 1,
    status,
    gerado_por: "Teste",
    pago: false,
    data_pagamento: null,
    observacao_pagamento: null,
    comprovante_pagamento_path: null,
    comprovante_pagamento_nome: null,
    fatura_origem_id: null,
    fatura_substituta_id: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const necessita = fatura("n1", "Empresa A", "2026-06", "necessita_reemissao");
const emitida = fatura("e1", "Empresa A", "2026-06", "emitida", {
  numero: "FAT-NEW",
  fatura_origem_id: "r1",
  valor_total: 120,
});
const reemitida = fatura("r1", "Empresa A", "2026-06", "reemitida", {
  numero: "FAT-OLD",
  fatura_substituta_id: "e1",
  valor_total: 100,
});

assert.equal(canReemitirFaturaCliente(necessita), true);
assert.equal(canReemitirFaturaCliente(emitida), false);
assert.equal(canReemitirFaturaCliente(reemitida), false);
assert.equal(
  canReemitirFaturaCliente(fatura("c1", "Empresa A", "2026-06", "cancelada")),
  true
);

assert.equal(faturaStatusPermitePagamento("emitida"), true);
assert.equal(faturaStatusPermitePagamento("reemitida"), false);
assert.equal(faturaStatusPermitePagamento("necessita_reemissao"), false);
assert.equal(faturaStatusContaNoResumoEmitido("reemitida"), false);
assert.equal(faturaStatusContaNoResumoEmitido("emitida"), true);

assert.equal(deriveFaturaMesStatus(necessita), "necessita_reemissao");
assert.equal(deriveFaturaMesStatus(reemitida), "reemitida");
assert.equal(deriveFaturaMesStatus(emitida), "emitida");

const found = findFaturaReferenciaMes(
  [reemitida, emitida],
  "cliente",
  "Empresa A",
  "06/2026"
);
assert.ok(found);
assert.equal(found!.id, "e1", "prioriza emitida ativa sobre reemitida histórica");

const foundNecessita = findFaturaReferenciaMes(
  [reemitida, necessita],
  "cliente",
  "Empresa A",
  "06/2026"
);
assert.equal(foundNecessita!.status, "necessita_reemissao");

assert.equal(
  faturaClienteEmitidaPossuiAlteracaoPosEmissao(necessita, []),
  true,
  "status persistido indica alteracao"
);
assert.equal(
  faturaClienteEmitidaPossuiAlteracaoPosEmissao(emitida, [{ status: "cancelado" }]),
  true
);
assert.equal(
  faturaClienteEmitidaPossuiAlteracaoPosEmissao(reemitida, [{ status: "cancelado" }]),
  false,
  "fatura histórica reemitida não entra no fluxo ativo"
);

assert.equal(emitida.fatura_origem_id, "r1");
assert.equal(reemitida.fatura_substituta_id, "e1");

const resumoReemissao = buildResumoClientesMes(
  [],
  [reemitida, emitida],
  "06/2026",
  "Empresa A"
);
assert.ok(resumoReemissao);
assert.equal(resumoReemissao.rows.length, 2);
assert.equal(resumoReemissao.resumo.valorEmitido, 120);
assert.equal(resumoReemissao.resumo.valorEmAberto, 120);
assert.equal(resumoReemissao.resumo.valorPrevisto, 120);

console.log("test-fatura-reemissao-fluxo: OK");
