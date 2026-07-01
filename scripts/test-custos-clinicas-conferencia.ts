import assert from "node:assert/strict";
import {
  CUSTOS_CLINICA_STATUS_LABELS,
  faturaClinicaHistoricoStatusLabel,
  isCustosClinicaAbertaConferencia,
  isCustosClinicaConferido,
} from "../lib/custos-clinicas-conferencia";
import { FATURA_MES_STATUS_LABELS_CLINICA } from "../lib/fatura-mes-resumo";
import type { FaturaRecord } from "../lib/types";

function fatura(
  status: FaturaRecord["status"],
  pago = false
): Pick<FaturaRecord, "tipo" | "status" | "pago"> {
  return { tipo: "clinica", status, pago };
}

assert.equal(CUSTOS_CLINICA_STATUS_LABELS.aberta_emissao, "Aberta para conferência");
assert.equal(CUSTOS_CLINICA_STATUS_LABELS.rascunho, "Aberta para conferência");
assert.equal(CUSTOS_CLINICA_STATUS_LABELS.emitida, "Conferido");
assert.equal(CUSTOS_CLINICA_STATUS_LABELS.paga, "Pago");

assert.equal(FATURA_MES_STATUS_LABELS_CLINICA.emitida, "Conferido");
assert.equal(FATURA_MES_STATUS_LABELS_CLINICA.paga, "Pago");

assert.equal(isCustosClinicaAbertaConferencia("aberta_emissao"), true);
assert.equal(isCustosClinicaAbertaConferencia("rascunho"), true);
assert.equal(isCustosClinicaAbertaConferencia("emitida"), false);

assert.equal(isCustosClinicaConferido(fatura("emitida", false)), true);
assert.equal(isCustosClinicaConferido(fatura("emitida", true)), false);
assert.equal(isCustosClinicaConferido(fatura("rascunho", false)), false);

assert.equal(faturaClinicaHistoricoStatusLabel("rascunho", false), "Aberta para conferência");
assert.equal(faturaClinicaHistoricoStatusLabel("emitida", false), "Conferido");
assert.equal(faturaClinicaHistoricoStatusLabel("emitida", true), "Pago");

console.log("test-custos-clinicas-conferencia: ok");
