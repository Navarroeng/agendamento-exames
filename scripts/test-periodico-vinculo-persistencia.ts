/** Vínculo persistido de antecipação: status, datas e ciclo Clínico + N. */

import assert from "node:assert/strict";
import {
  agruparPeriodicosPendentesParaVinculo,
  agruparPeriodicosPorColaboradorCiclo,
  chaveCicloPeriodico,
  filterPeriodicoGrupos,
  countPeriodicoGruposByDisplayStatus,
} from "../lib/periodico-agrupamento";
import {
  buildPatchVinculoPeriodico,
  computePeriodicoDisplayStatus,
  dataAgendadaPeriodico,
  dataCicloPeriodico,
  filterPeriodicosFuturosPorMes,
  periodicoAtendeFiltroStatus,
  periodicoDisplayStatusLabel,
  toPeriodicoFuturoRow,
} from "../lib/periodicos-futuro";
import { efeitoCancelamentoAsoSobrePeriodico } from "../lib/periodico-cancelamento";
import type { PeriodicoFuturoRecord } from "../lib/types";

function rec(
  partial: Partial<PeriodicoFuturoRecord> & { id: string; exame_nome: string }
): PeriodicoFuturoRecord {
  return {
    agendamento_id: "ag-admissional",
    cliente_nome: "CLUB COFFEE",
    colaborador: "CLAUDIA VALDES DEL VALLE",
    cargo_id: "cargo-1",
    cargo_nome: "Operadora",
    exame_id: partial.exame_id ?? partial.id,
    tipo_exame: partial.exame_nome,
    data_realizada: "2026-06-12",
    proxima_data: "2026-12-12",
    data_prevista_original: "2026-12-12",
    status: "ativo",
    colaborador_cpf: "11435994892",
    origem: "agendamento",
    antecipado: false,
    ...partial,
  };
}

const EXAMES = ["Clínico", "Coprocultura", "Hemograma completo", "PPF"] as const;

function ciclo(
  opts: Partial<PeriodicoFuturoRecord> & { prefixo?: string } = {}
) {
  const { prefixo = "a", ...rest } = opts;
  return EXAMES.map((exame, i) =>
    rec({
      id: `${prefixo}-${i + 1}`,
      exame_nome: exame,
      exame_id: `ex-${exame}`,
      ...rest,
    })
  );
}

// 1) sem vínculo
const aberto = toPeriodicoFuturoRow(rec({ id: "1", exame_nome: "Clínico" }));
assert.notEqual(aberto.displayStatus, "reagendado");
assert.equal(aberto.agendadoParaBR, "—");
assert.equal(aberto.proximaDataBR, "12/12/2026");
assert.equal(aberto.dataRealizadaBR, "12/06/2026");

// 2-5) patch de vínculo não mexe na próxima data nem na origem
const { patch, antecipado } = buildPatchVinculoPeriodico({
  agendamentoId: "ag-demissional",
  dataAgendamentoIso: "2026-08-20",
  dataPrevistaOriginal: "2026-12-12",
});
assert.equal(antecipado, true);
assert.equal(patch.status, "reagendado");
assert.equal(patch.agendamento_vinculado_id, "ag-demissional");
assert.equal(patch.data_prevista_original, "2026-12-12");
assert.equal("proxima_data" in patch, false);
assert.equal("agendamento_id" in patch, false);

const vinculado = toPeriodicoFuturoRow(
  rec({
    id: "v1",
    exame_nome: "Clínico",
    status: "reagendado",
    agendamento_vinculado_id: "ag-demissional",
    data_agendada: "2026-08-20",
    antecipado: true,
  })
);
assert.equal(vinculado.displayStatus, "reagendado");
assert.equal(periodicoDisplayStatusLabel(vinculado.displayStatus), "Agendamento criado");
assert.equal(vinculado.proximaDataBR, "12/12/2026");
assert.equal(vinculado.agendadoParaBR, "20/08/2026");
assert.equal(dataCicloPeriodico(vinculado), "2026-12-12");
assert.equal(dataAgendadaPeriodico(vinculado), "2026-08-20");

// Histórico: próxima data foi sobrescrita pela data do agendamento
const legadoSobrescrito = rec({
  id: "leg-1",
  exame_nome: "Clínico",
  status: "reagendado",
  proxima_data: "2026-08-20",
  data_prevista_original: "2026-12-12",
  antecipado: true,
});
assert.equal(dataCicloPeriodico(legadoSobrescrito), "2026-12-12");
assert.equal(dataAgendadaPeriodico(legadoSobrescrito), "2026-08-20");
assert.equal(
  chaveCicloPeriodico(legadoSobrescrito),
  chaveCicloPeriodico(rec({ id: "x", exame_nome: "PPF" }))
);

// 7) Clínico + N — todos os IDs do ciclo
const grupoAberto = agruparPeriodicosPorColaboradorCiclo(
  ciclo().map(toPeriodicoFuturoRow)
);
assert.equal(grupoAberto.length, 1);
assert.equal(grupoAberto[0].examesLabel, "Clínico + 3");
assert.equal(grupoAberto[0].ids.length, 4);
assert.equal(grupoAberto[0].displayStatus !== "reagendado", true);

const grupoVinculado = agruparPeriodicosPorColaboradorCiclo(
  ciclo({
    status: "reagendado",
    agendamento_vinculado_id: "ag-demissional",
    data_agendada: "2026-08-20",
    antecipado: true,
  }).map(toPeriodicoFuturoRow)
);
assert.equal(grupoVinculado.length, 1);
assert.equal(grupoVinculado[0].displayStatus, "reagendado");
assert.equal(grupoVinculado[0].agendamentoVinculadoIds[0], "ag-demissional");
assert.equal(grupoVinculado[0].agendadoParaBR, "20/08/2026");
assert.equal(grupoVinculado[0].ids.length, 4);

// Duplicatas físicas: 4 vinculados + 4 ainda ativos na mesma obrigação
const mistos = agruparPeriodicosPorColaboradorCiclo([
  ...ciclo({ prefixo: "ok", status: "reagendado", agendamento_vinculado_id: "ag-d" }).map(
    toPeriodicoFuturoRow
  ),
  ...ciclo({ prefixo: "dup" }).map(toPeriodicoFuturoRow),
]);
assert.equal(mistos.length, 1);
assert.equal(mistos[0].displayStatus, "reagendado");
assert.equal(mistos[0].ids.length, 8);

// 9) filtro Status
assert.equal(periodicoAtendeFiltroStatus("reagendado", ""), true);
assert.equal(periodicoAtendeFiltroStatus("cancelado", ""), false);
assert.equal(periodicoAtendeFiltroStatus("reagendado", "reagendado"), true);
assert.equal(periodicoAtendeFiltroStatus("em_dia", "reagendado"), false);

const filtrados = filterPeriodicoGrupos(
  [...grupoAberto, ...grupoVinculado],
  {
    empresa: "",
    colaborador: "",
    cargo: "",
    exame: "",
    status: "reagendado",
    mesReferencia: "",
  }
);
assert.equal(filtrados.length, 1);
assert.equal(filtrados[0].displayStatus, "reagendado");

// 10) KPIs — não conta como Em dia
const kpis = countPeriodicoGruposByDisplayStatus(grupoVinculado);
assert.equal(kpis.reagendado, 1);
assert.equal(kpis.em_dia, 0);
assert.equal(kpis.vencido, 0);

// Mês da obrigação original, não o mês do Demissional
const noMes = filterPeriodicosFuturosPorMes(grupoVinculado, {
  year: 2026,
  month: 12,
});
assert.equal(noMes.length, 1);
const noAgosto = filterPeriodicosFuturosPorMes(grupoVinculado, {
  year: 2026,
  month: 8,
});
assert.equal(noAgosto.length, 0);

// 11-12) cancelar agendamento desfaz cumprimento
assert.equal(
  efeitoCancelamentoAsoSobrePeriodico("reagendado"),
  "reativar_cumprimento"
);
const restaurado = toPeriodicoFuturoRow(
  rec({
    id: "r1",
    exame_nome: "Clínico",
    status: "ativo",
    agendamento_vinculado_id: null,
    data_agendada: null,
    antecipado: false,
  })
);
assert.notEqual(restaurado.displayStatus, "reagendado");
assert.equal(restaurado.agendadoParaBR, "—");
assert.equal(restaurado.proximaDataBR, "12/12/2026");

// 14) cancelado manual tem precedência
assert.equal(
  computePeriodicoDisplayStatus(
    rec({
      id: "c1",
      exame_nome: "Clínico",
      status: "cancelado",
      cancelado_em: "2026-08-21T12:00:00Z",
      motivo_cancelamento: "Admin",
      agendamento_vinculado_id: "ag-d",
    }),
    "2026-08-21"
  ),
  "cancelado"
);

// Vinculado some da lista de antecipação
assert.equal(
  agruparPeriodicosPendentesParaVinculo(
    ciclo({ status: "reagendado", agendamento_vinculado_id: "ag-d" })
  ).length,
  0
);

// 16) dois ciclos do mesmo colaborador
const dois = agruparPeriodicosPorColaboradorCiclo(
  [
    rec({ id: "c1", exame_nome: "Clínico", proxima_data: "2026-12-12" }),
    rec({
      id: "a1",
      exame_nome: "Audiometria",
      proxima_data: "2027-06-12",
      data_prevista_original: "2027-06-12",
    }),
  ].map(toPeriodicoFuturoRow)
);
assert.equal(dois.length, 2);

console.log("ok: test-periodico-vinculo-persistencia");
