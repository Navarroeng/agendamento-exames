/** Regra central de origem vs cumprimento de Periódico Futuro. */

import assert from "node:assert/strict";
import { computeProximaDataPeriodico } from "../lib/cargo-periodico";
import {
  agruparPeriodicosPendentesParaVinculo,
  agruparPeriodicosPorColaboradorCiclo,
} from "../lib/periodico-agrupamento";
import { efeitoCancelamentoAsoSobrePeriodico } from "../lib/periodico-cancelamento";
import {
  decidirOrigemPeriodicoFuturo,
  identificarPeriodicosCascataSuspeitos,
  isAsoDemissional,
  TIPOS_ASO_PODEM_ORIGINAR_PERIODICO,
} from "../lib/periodico-geracao";
import {
  buildPatchVinculoPeriodico,
  computePeriodicoDisplayStatus,
  dataAgendadaPeriodico,
  dataCicloPeriodico,
  periodicoAtendeFiltroStatus,
  periodicoDisplayStatusLabel,
  toPeriodicoFuturoRow,
} from "../lib/periodicos-futuro";
import { TIPOS_ASO } from "../lib/constants";
import type { PeriodicoFuturoRecord } from "../lib/types";

function rec(
  partial: Partial<PeriodicoFuturoRecord> & { id: string }
): PeriodicoFuturoRecord {
  return {
    agendamento_id: "ag-admissional",
    cliente_nome: "CLUB COFFEE",
    colaborador: "CLAUDIA VALDES DEL VALLE",
    cargo_id: "cargo-1",
    cargo_nome: "Auxiliar de Cozinha",
    exame_id: partial.exame_id ?? partial.id,
    tipo_exame: partial.exame_nome ?? "Clínico",
    exame_nome: partial.exame_nome ?? "Clínico",
    data_realizada: "2026-06-12",
    proxima_data: "2026-12-12",
    data_prevista_original: "2026-12-12",
    status: "ativo",
    colaborador_cpf: "11435994892",
    origem: "agendamento",
    created_at: "2026-06-12T00:00:00Z",
    updated_at: "2026-06-12T00:00:00Z",
    ...partial,
  };
}

// --- Cenário 1: Admissional originador ---
const proximaAdmissional = computeProximaDataPeriodico("2026-06-01", 6);
assert.equal(proximaAdmissional, "2026-12-01");
assert.deepEqual(
  decidirOrigemPeriodicoFuturo({
    tipoAso: "Admissional",
    cumprindoPeriodicoExistente: false,
    cargoGeraAlerta: true,
    proximaDataIso: proximaAdmissional,
    contratoDataFim: "2026-12-31",
  }),
  { gerar: true, motivo: null }
);

// --- Cenário 2: Periódico cumprindo ciclo existente ---
assert.deepEqual(
  decidirOrigemPeriodicoFuturo({
    tipoAso: "Periódico",
    cumprindoPeriodicoExistente: true,
    cargoGeraAlerta: true,
    proximaDataIso: computeProximaDataPeriodico("2026-12-01", 6),
    contratoDataFim: "2026-12-31",
  }),
  { gerar: false, motivo: "cumprindo_existente" }
);

// --- Cenário 3: Antecipação não recalcula próxima data ---
const patchAntecipacao = buildPatchVinculoPeriodico({
  agendamentoId: "ag-ant",
  dataAgendamentoIso: "2026-10-20",
  dataPrevistaOriginal: "2026-12-01",
});
assert.equal(patchAntecipacao.patch.status, "reagendado");
assert.equal(patchAntecipacao.patch.agendamento_vinculado_id, "ag-ant");
assert.equal(patchAntecipacao.antecipado, true);
assert.equal(
  (patchAntecipacao.patch as { proxima_data?: string }).proxima_data,
  undefined
);
const antecipado = rec({
  id: "pf-ant",
  proxima_data: "2026-12-01",
  data_prevista_original: "2026-12-01",
  status: "reagendado",
  data_agendada: "2026-10-20",
  agendamento_vinculado_id: "ag-ant",
});
assert.equal(dataCicloPeriodico(antecipado), "2026-12-01");
assert.equal(dataAgendadaPeriodico(antecipado), "2026-10-20");
assert.equal(computePeriodicoDisplayStatus(antecipado), "reagendado");
assert.equal(periodicoDisplayStatusLabel("reagendado"), "Agendamento criado");
assert.deepEqual(
  decidirOrigemPeriodicoFuturo({
    tipoAso: "Periódico",
    cumprindoPeriodicoExistente: true,
    cargoGeraAlerta: true,
    proximaDataIso: computeProximaDataPeriodico("2026-10-20", 6),
  }),
  { gerar: false, motivo: "cumprindo_existente" }
);

// --- Cenário 4: Demissional nunca gera ---
for (const aso of ["Demissional", "demissional", " DEMISSIONAL "]) {
  assert.equal(isAsoDemissional(aso), true);
  assert.deepEqual(
    decidirOrigemPeriodicoFuturo({
      tipoAso: aso,
      cumprindoPeriodicoExistente: false,
      cargoGeraAlerta: true,
      proximaDataIso: "2027-02-21",
      contratoDataFim: "2026-12-31",
    }),
    { gerar: false, motivo: "aso_demissional" }
  );
}
assert.ok(!TIPOS_ASO_PODEM_ORIGINAR_PERIODICO.includes("Demissional" as never));
assert.ok(TIPOS_ASO.includes("Demissional"));
assert.ok(TIPOS_ASO.includes("Pontual"));
assert.ok(!TIPOS_ASO_PODEM_ORIGINAR_PERIODICO.includes("Pontual" as never));
assert.deepEqual(
  decidirOrigemPeriodicoFuturo({
    tipoAso: "Pontual",
    cumprindoPeriodicoExistente: false,
    cargoGeraAlerta: true,
    proximaDataIso: "2027-02-21",
    contratoDataFim: "2028-12-31",
  }),
  { gerar: false, motivo: "aso_pontual" }
);

// --- Cenário 5: Claudia ---
const claudiaOrigem = rec({ id: "pf-cli-1", exame_nome: "Clínico" });
const claudiaVinculo = {
  ...claudiaOrigem,
  status: "reagendado" as const,
  agendamento_vinculado_id: "ag-demissional",
  data_agendada: "2026-08-21",
  antecipado: true,
};
assert.equal(dataCicloPeriodico(claudiaVinculo), "2026-12-12");
assert.equal(dataAgendadaPeriodico(claudiaVinculo), "2026-08-21");
assert.equal(computePeriodicoDisplayStatus(claudiaVinculo), "reagendado");
assert.deepEqual(
  decidirOrigemPeriodicoFuturo({
    tipoAso: "Demissional",
    cumprindoPeriodicoExistente: true,
    cargoGeraAlerta: true,
    proximaDataIso: computeProximaDataPeriodico("2026-08-21", 6),
  }),
  { gerar: false, motivo: "aso_demissional" }
);

// --- Cenário 6: cancelar ASO não cancela o periódico ---
assert.equal(
  efeitoCancelamentoAsoSobrePeriodico("reagendado"),
  "reativar_cumprimento"
);
assert.equal(efeitoCancelamentoAsoSobrePeriodico("ativo"), "manter_aberto");
const reativado = rec({
  id: "pf-reat",
  status: "ativo",
  agendamento_vinculado_id: null,
  data_agendada: null,
});
assert.equal(dataAgendadaPeriodico(reativado), null);
assert.equal(
  computePeriodicoDisplayStatus(reativado, "2026-08-21"),
  "em_dia"
);

// --- Cenário 7: cancelado manualmente pelo admin ---
const canceladoManual = rec({
  id: "pf-canc",
  status: "cancelado",
  cancelado_em: "2026-08-21T12:00:00Z",
  motivo_cancelamento: "Pedido do cliente",
});
assert.equal(computePeriodicoDisplayStatus(canceladoManual), "cancelado");
assert.equal(
  periodicoAtendeFiltroStatus("cancelado", ""),
  false,
  "Status Todos não lista cancelados"
);
assert.equal(periodicoAtendeFiltroStatus("cancelado", "cancelado"), true);

// --- Cenário 8: fora da vigência ---
assert.deepEqual(
  decidirOrigemPeriodicoFuturo({
    tipoAso: "Periódico",
    cumprindoPeriodicoExistente: false,
    cargoGeraAlerta: true,
    proximaDataIso: "2027-06-01",
    contratoDataFim: "2026-12-31",
  }),
  { gerar: false, motivo: "fora_vigencia_contratual" }
);

// Sem data_fim conhecida: não inventar bloqueio silencioso
assert.deepEqual(
  decidirOrigemPeriodicoFuturo({
    tipoAso: "Admissional",
    cumprindoPeriodicoExistente: false,
    cargoGeraAlerta: true,
    proximaDataIso: "2027-06-01",
    contratoDataFim: null,
  }),
  { gerar: true, motivo: null }
);

// --- Cenário 9: dois ciclos legítimos ---
assert.deepEqual(
  decidirOrigemPeriodicoFuturo({
    tipoAso: "Admissional",
    cumprindoPeriodicoExistente: false,
    cargoGeraAlerta: true,
    proximaDataIso: "2026-12-01",
    jaExisteObrigacaoEquivalente: false,
  }),
  { gerar: true, motivo: null }
);
assert.deepEqual(
  decidirOrigemPeriodicoFuturo({
    tipoAso: "Admissional",
    cumprindoPeriodicoExistente: false,
    cargoGeraAlerta: true,
    proximaDataIso: "2026-12-01",
    jaExisteObrigacaoEquivalente: true,
  }),
  { gerar: false, motivo: "obrigacao_equivalente" }
);

// --- Cenário 10: Clínico + N compartilha vínculo ---
const ciclo = [
  rec({ id: "e1", exame_id: "ex-1", exame_nome: "Clínico" }),
  rec({ id: "e2", exame_id: "ex-2", exame_nome: "Coprocultura" }),
  rec({ id: "e3", exame_id: "ex-3", exame_nome: "Hemograma completo" }),
  rec({ id: "e4", exame_id: "ex-4", exame_nome: "PPF" }),
];
const gruposPendentes = agruparPeriodicosPendentesParaVinculo(ciclo);
assert.equal(gruposPendentes.length, 1);
assert.equal(gruposPendentes[0].ids.length, 4);
const gruposPagina = agruparPeriodicosPorColaboradorCiclo(
  ciclo.map(toPeriodicoFuturoRow)
);
assert.equal(gruposPagina.length, 1);
assert.match(gruposPagina[0].examesLabel, /Clínico \+ 3/);

// Cargo sem periodicidade de alerta (12 meses) não origina automático
assert.deepEqual(
  decidirOrigemPeriodicoFuturo({
    tipoAso: "Admissional",
    cumprindoPeriodicoExistente: false,
    cargoGeraAlerta: false,
    proximaDataIso: "2027-06-01",
    contratoDataFim: "2027-12-31",
  }),
  { gerar: false, motivo: "sem_periodicidade_alerta" }
);

// Diagnóstico de cascata: 12/12 originado + 01/06/2027 gerado do cumprimento
const suspeitos = identificarPeriodicosCascataSuspeitos([
  {
    id: "a",
    colaborador_cpf: "11435994892",
    data_realizada: "2026-06-12",
    proxima_data: "2026-12-12",
    origem: "agendamento",
  },
  {
    id: "b",
    colaborador_cpf: "11435994892",
    data_realizada: "2026-12-12",
    proxima_data: "2027-06-12",
    origem: "agendamento",
  },
]);
assert.equal(suspeitos.length, 1);
assert.equal(suspeitos[0].origemId, "a");
assert.equal(suspeitos[0].cascataId, "b");

console.log("test-periodico-geracao: ok");
