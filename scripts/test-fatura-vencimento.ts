import assert from "node:assert/strict";
import {
  buildCustosClinicaVencimentoView,
  calcDataVencimentoClinicaCompetencia,
  calcQuintoDiaUtilDoMes,
  calcVencimentoFaturaCliente,
  formatDiaVencimentoFatura,
  parseDiaVencimentoFatura,
} from "../lib/fatura-vencimento";

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Jul/2026: 1 qua, 2 qui, 3 sex, 6 seg (4º), 7 ter (5º)
assert.equal(iso(calcQuintoDiaUtilDoMes(2026, 7)), "2026-07-07");

const venc = calcVencimentoFaturaCliente("06/2026");
assert.ok(venc);
assert.equal(venc.iso, "2026-07-07");
assert.equal(venc.label, "07/07/2026");

// Dez/2026 -> Jan/2027
const vencJan = calcVencimentoFaturaCliente("12/2026");
assert.ok(vencJan);
assert.equal(vencJan.iso, iso(calcQuintoDiaUtilDoMes(2027, 1)));

assert.equal(calcVencimentoFaturaCliente("13/2026"), null);

// --- Dia vencimento clínica ---
assert.equal(parseDiaVencimentoFatura(5), 5);
assert.equal(parseDiaVencimentoFatura("05"), 5);
assert.equal(parseDiaVencimentoFatura(""), null);
assert.equal(parseDiaVencimentoFatura(0), null);
assert.equal(parseDiaVencimentoFatura(32), null);
assert.equal(formatDiaVencimentoFatura(5), "05");
assert.equal(formatDiaVencimentoFatura(null), "—");

const set = calcDataVencimentoClinicaCompetencia(5, "09/2026");
assert.ok(set);
assert.equal(set.iso, "2026-09-05");
assert.equal(set.label, "05/09/2026");

const fev31 = calcDataVencimentoClinicaCompetencia(31, "02/2027");
assert.ok(fev31);
assert.equal(fev31.iso, "2027-02-28");
assert.equal(fev31.diaEfetivo, 28);

const fevBissexto = calcDataVencimentoClinicaCompetencia(31, "02/2024");
assert.ok(fevBissexto);
assert.equal(fevBissexto.iso, "2024-02-29");

const abr31 = calcDataVencimentoClinicaCompetencia(31, "04/2026");
assert.ok(abr31);
assert.equal(abr31.iso, "2026-04-30");

const semConfig = buildCustosClinicaVencimentoView({
  diaVencimento: null,
  mesReferencia: "09/2026",
  emAberto: true,
  hojeIso: "2026-09-10",
});
assert.equal(semConfig.situacao, "sem_config");
assert.equal(semConfig.titulo, "—");

const vencido = buildCustosClinicaVencimentoView({
  diaVencimento: 5,
  mesReferencia: "09/2026",
  emAberto: true,
  hojeIso: "2026-09-10",
});
assert.equal(vencido.situacao, "vencido");
assert.match(vencido.detalhe ?? "", /Vencido/);

const venceHoje = buildCustosClinicaVencimentoView({
  diaVencimento: 10,
  mesReferencia: "09/2026",
  emAberto: true,
  hojeIso: "2026-09-10",
});
assert.equal(venceHoje.situacao, "vence_hoje");

const proximo = buildCustosClinicaVencimentoView({
  diaVencimento: 13,
  mesReferencia: "09/2026",
  emAberto: true,
  hojeIso: "2026-09-10",
});
assert.equal(proximo.situacao, "proximo");
assert.match(proximo.detalhe ?? "", /Vence em 3 dias/);

const emDia = buildCustosClinicaVencimentoView({
  diaVencimento: 20,
  mesReferencia: "09/2026",
  emAberto: true,
  hojeIso: "2026-09-10",
});
assert.equal(emDia.situacao, "em_dia");
assert.equal(emDia.detalhe, "20/09/2026");

const pagoPassado = buildCustosClinicaVencimentoView({
  diaVencimento: 5,
  mesReferencia: "09/2026",
  emAberto: false,
  hojeIso: "2026-09-10",
});
assert.equal(pagoPassado.situacao, "pago");
assert.doesNotMatch(pagoPassado.detalhe ?? "", /Vencido/);

const out = calcDataVencimentoClinicaCompetencia(5, "10/2026");
assert.equal(out?.iso, "2026-10-05");

console.log("test-fatura-vencimento: ok");
