import assert from "node:assert/strict";
import {
  CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO,
  CUSTOS_CLINICA_ACAO_REABRIR,
  CUSTOS_CLINICA_ACAO_REGISTRAR_PAGAMENTO,
  FATURA_MES_STATUS_LABELS_CLINICA,
  formatAuditoriaMarcarConferido,
  formatAuditoriaReabrirConferencia,
  historicoStatusLabelClinica,
} from "../lib/custos-clinicas-conferencia";
import { deriveFaturaMesStatus } from "../lib/fatura-mes-resumo";
import type { FaturaRecord } from "../lib/types";

function fatura(
  status: FaturaRecord["status"],
  pago = false
): FaturaRecord {
  return {
    id: "f1",
    numero: "CC-001",
    tipo: "clinica",
    referencia_id: null,
    referencia_nome: "Clínica Teste",
    periodo_inicio: "2026-06-01",
    periodo_fim: "2026-06-30",
    mes_referencia: "2026-06",
    data_emissao: status === "emitida" ? "2026-06-30" : null,
    data_vencimento: "2026-06-30",
    valor_total: 500,
    total_exames: 3,
    status,
    gerado_por: "Admin",
    pago,
    data_pagamento: pago ? "2026-07-05" : null,
    observacao_pagamento: null,
    comprovante_pagamento_path: null,
    comprovante_pagamento_nome: null,
    fatura_origem_id: null,
    fatura_substituta_id: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  };
}

assert.equal(
  FATURA_MES_STATUS_LABELS_CLINICA.aberta_emissao,
  "Aberta para conferência"
);
assert.equal(FATURA_MES_STATUS_LABELS_CLINICA.rascunho, "Aberta para conferência");
assert.equal(FATURA_MES_STATUS_LABELS_CLINICA.emitida, "Conferido");
assert.equal(FATURA_MES_STATUS_LABELS_CLINICA.paga, "Pago");

assert.equal(historicoStatusLabelClinica("rascunho", false), "Aberta para conferência");
assert.equal(historicoStatusLabelClinica("emitida", false), "Conferido");
assert.equal(historicoStatusLabelClinica("emitida", true), "Pago");

assert.equal(deriveFaturaMesStatus(null), "aberta_emissao");
assert.equal(deriveFaturaMesStatus(fatura("rascunho")), "rascunho");
assert.equal(deriveFaturaMesStatus(fatura("emitida")), "emitida");
assert.equal(deriveFaturaMesStatus(fatura("emitida", true)), "paga");

assert.equal(CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO, "Marcar como conferido");
assert.equal(CUSTOS_CLINICA_ACAO_REABRIR, "Reabrir conferência");
assert.equal(
  CUSTOS_CLINICA_ACAO_REGISTRAR_PAGAMENTO,
  "Registrar pagamento"
);

assert.equal(
  formatAuditoriaMarcarConferido("Maria", "Clínica ABC"),
  "Maria marcou os custos da clínica Clínica ABC como conferidos."
);
assert.equal(
  formatAuditoriaReabrirConferencia("João", "Clínica XYZ"),
  "João reabriu a conferência dos custos da clínica Clínica XYZ."
);

function canReabrirConferencia(record: FaturaRecord): boolean {
  return (
    record.tipo === "clinica" &&
    record.status === "emitida" &&
    !record.pago
  );
}

assert.equal(canReabrirConferencia(fatura("emitida")), true);
assert.equal(canReabrirConferencia(fatura("emitida", true)), false);
assert.equal(canReabrirConferencia(fatura("rascunho")), false);

console.log("test-custos-clinicas-conferencia: ok");
