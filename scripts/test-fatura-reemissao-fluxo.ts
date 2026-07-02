import assert from "node:assert/strict";
import {
  canReemitirFaturaCliente,
  faturaStatusPermitePagamento,
} from "../lib/fatura-reemissao";
import {
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
    valor_total: 100,
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
  numero: "FAT-EMIT",
});
const substituida = fatura("s1", "Empresa A", "2026-06", "substituida", {
  numero: "FAT-OLD",
  fatura_substituta_id: "e1",
});
const novaEmitida = fatura("e1", "Empresa A", "2026-06", "emitida", {
  numero: "FAT-NEW",
  fatura_origem_id: "s1",
});

assert.equal(canReemitirFaturaCliente(necessita), true);
assert.equal(canReemitirFaturaCliente(emitida), false);
assert.equal(canReemitirFaturaCliente(substituida), false);
assert.equal(canReemitirFaturaCliente(fatura("c1", "Empresa A", "2026-06", "cancelada")), true);

assert.equal(faturaStatusPermitePagamento("emitida"), true);
assert.equal(faturaStatusPermitePagamento("necessita_reemissao"), false);
assert.equal(faturaStatusPermitePagamento("substituida"), false);

assert.equal(deriveFaturaMesStatus(necessita), "necessita_reemissao");
assert.equal(deriveFaturaMesStatus(substituida), "substituida");
assert.equal(deriveFaturaMesStatus(emitida), "emitida");

const found = findFaturaReferenciaMes(
  [substituida, emitida],
  "cliente",
  "Empresa A",
  "06/2026"
);
assert.ok(found);
assert.equal(found!.id, "e1", "prioriza emitida ativa sobre substituida");

const foundNecessita = findFaturaReferenciaMes(
  [substituida, necessita],
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
  faturaClienteEmitidaPossuiAlteracaoPosEmissao(emitida, [{ status: "agendado" }]),
  false
);

assert.equal(novaEmitida.fatura_origem_id, "s1");
assert.equal(substituida.fatura_substituta_id, "e1");

console.log("test-fatura-reemissao-fluxo: OK");
