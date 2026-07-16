import assert from "node:assert/strict";
import {
  canReemitirFaturaCliente,
  mesReferenciaBRFromFatura,
} from "../lib/fatura-reemissao";
import {
  deriveFaturaMesStatus,
  findFaturaReferenciaMes,
} from "../lib/fatura-mes-resumo";
import type { FaturaRecord } from "../lib/types";

function fatura(
  id: string,
  cliente: string,
  mes: string,
  status: FaturaRecord["status"],
  numero?: string
): FaturaRecord {
  return {
    id,
    numero: numero ?? `FAT-${id}`,
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
  };
}

assert.equal(mesReferenciaBRFromFatura({ mes_referencia: "2026-06", periodo_inicio: null }), "06/2026");
assert.equal(
  mesReferenciaBRFromFatura({ mes_referencia: null, periodo_inicio: "2026-06-01" }),
  "06/2026"
);

const cancelada = fatura("c1", "Empresa A", "2026-06", "cancelada", "FAT-CANCEL");
const nova = fatura("n1", "Empresa A", "2026-06", "emitida", "FAT-NOVA");
const necessita = fatura("r1", "Empresa A", "2026-06", "necessita_reemissao", "FAT-REEM");

assert.equal(canReemitirFaturaCliente(cancelada), true);
assert.equal(canReemitirFaturaCliente(necessita), true);
assert.equal(canReemitirFaturaCliente(nova), false);
assert.equal(canReemitirFaturaCliente({ ...cancelada, tipo: "clinica" }), false);

const faturas = [cancelada, nova];
const found = findFaturaReferenciaMes(faturas, "cliente", "Empresa A", "06/2026");
assert.ok(found);
assert.equal(found!.id, "n1");
assert.equal(found!.status, "emitida");
assert.equal(deriveFaturaMesStatus(found), "emitida");

const onlyCancelada = findFaturaReferenciaMes(
  [cancelada],
  "cliente",
  "Empresa A",
  "06/2026"
);
assert.ok(onlyCancelada);
assert.equal(onlyCancelada!.status, "cancelada");
assert.equal(canReemitirFaturaCliente(onlyCancelada!), true);

console.log("test-fatura-reemissao: OK");
