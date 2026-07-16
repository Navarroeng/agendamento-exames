import assert from "node:assert/strict";
import {
  CONFERENCIA_DATA_OBRIGATORIA_MSG,
  CONFERENCIA_FATURA_OBRIGATORIA_MSG,
  buildFaturaClinicaStoragePath,
} from "../lib/fatura-conferencia-clinica";
import {
  CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO,
  CUSTOS_CLINICA_ACAO_REABRIR,
  CUSTOS_CLINICA_ACAO_REGISTRAR_PAGAMENTO,
  CUSTOS_CLINICA_ACAO_VER_FATURA,
  FATURA_MES_STATUS_LABELS_CLINICA,
  formatAuditoriaMarcarConferido,
  formatAuditoriaReabrirConferencia,
  historicoStatusLabelClinica,
  periodoLabelCustosClinica,
} from "../lib/custos-clinicas-conferencia";
import { deriveFaturaMesStatus } from "../lib/fatura-mes-resumo";
import type { FaturaRecord } from "../lib/types";

function fatura(
  status: FaturaRecord["status"],
  pago = false,
  extras: Partial<FaturaRecord> = {}
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
    conferido_em: extras.conferido_em ?? null,
    conferido_por: extras.conferido_por ?? null,
    fatura_clinica_path: extras.fatura_clinica_path ?? null,
    fatura_clinica_nome: extras.fatura_clinica_nome ?? null,
    fatura_clinica_tipo: extras.fatura_clinica_tipo ?? null,
    fatura_clinica_tamanho: extras.fatura_clinica_tamanho ?? null,
    observacao_conferencia: extras.observacao_conferencia ?? null,
    conferencia_registrada_em: extras.conferencia_registrada_em ?? null,
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
assert.equal(CUSTOS_CLINICA_ACAO_VER_FATURA, "Ver fatura da clínica");

assert.equal(
  CONFERENCIA_DATA_OBRIGATORIA_MSG,
  "Informe a data da conferência."
);
assert.equal(
  CONFERENCIA_FATURA_OBRIGATORIA_MSG,
  "Anexe a fatura da clínica para concluir a conferência."
);

assert.match(
  buildFaturaClinicaStoragePath("uuid-1", "fatura.pdf"),
  /^uuid-1\/faturas\/fatura-clinica-\d+\.pdf$/
);

assert.equal(
  periodoLabelCustosClinica(fatura("rascunho")),
  "01/06/2026 a 30/06/2026"
);

assert.equal(
  formatAuditoriaMarcarConferido(
    "Maria",
    "Clínica ABC",
    "01/06/2026 a 30/06/2026",
    "2026-06-15",
    500,
    "fatura-junho.pdf"
  ),
  "Maria conferiu os custos da clínica Clínica ABC referentes ao período 01/06/2026 a 30/06/2026. Data da conferência: 15/06/2026. Valor total: R$ 500,00. Fatura anexada: fatura-junho.pdf."
);

assert.equal(
  formatAuditoriaMarcarConferido(
    "Maria",
    "Clínica ABC",
    "06/2026",
    "2026-06-15",
    500,
    "fatura-junho.pdf",
    "Conferido com ajuste"
  ).includes("Observação: Conferido com ajuste."),
  true
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

assert.equal(
  fatura("rascunho", false, {
    conferido_em: "2026-06-10",
    fatura_clinica_path: "uuid-1/faturas/fatura-clinica.pdf",
    fatura_clinica_nome: "fatura-clinica.pdf",
  }).fatura_clinica_nome,
  "fatura-clinica.pdf"
);

console.log("test-custos-clinicas-conferencia: ok");
