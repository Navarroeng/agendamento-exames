/** Agrupamento do modal de antecipação: ciclo periódico, não exame avulso. */

import assert from "node:assert/strict";
import {
  agruparPeriodicosPendentesParaVinculo,
  agruparPeriodicosPorColaboradorCiclo,
  encontrarGrupoPeriodicoPorIds,
  labelExamesCicloVinculo,
  textoQuantidadePeriodicosFuturos,
} from "../lib/periodico-agrupamento";
import { toPeriodicoFuturoRow } from "../lib/periodicos-futuro";
import type { PeriodicoFuturoRecord } from "../lib/types";

function rec(
  partial: Partial<PeriodicoFuturoRecord> & {
    id: string;
    exame_nome: string;
    proxima_data: string;
  }
): PeriodicoFuturoRecord {
  return {
    agendamento_id: partial.agendamento_id ?? "ag-1",
    cliente_nome: "CLUB COFFEE",
    colaborador: "CLAUDIA VALDES DEL VALLE",
    cargo_id: "cargo-1",
    cargo_nome: "Operadora",
    exame_id: partial.exame_id ?? partial.id,
    tipo_exame: partial.exame_nome,
    data_realizada: "2026-06-12",
    status: "ativo",
    colaborador_cpf: "11435994892",
    origem: "agendamento",
    ...partial,
  };
}

const EXAMES_CLAUDIA = [
  "Clínico",
  "Coprocultura",
  "Hemograma completo",
  "PPF",
] as const;

function cicloClaudia(opts?: {
  prefixoId?: string;
  agendamentoId?: string;
  status?: PeriodicoFuturoRecord["status"];
  cpf?: string | null;
  canceladoEm?: string | null;
}): PeriodicoFuturoRecord[] {
  const prefixo = opts?.prefixoId ?? "a";
  return EXAMES_CLAUDIA.map((exame, i) =>
    rec({
      id: `${prefixo}-${i + 1}`,
      exame_id: `exame-${exame}`,
      exame_nome: exame,
      proxima_data: "2026-12-12",
      data_prevista_original: "2026-12-12",
      agendamento_id: opts?.agendamentoId ?? `ag-${prefixo}`,
      status: opts?.status ?? "ativo",
      colaborador_cpf: opts?.cpf === undefined ? "11435994892" : opts.cpf,
      cancelado_em: opts?.canceladoEm ?? null,
      motivo_cancelamento: opts?.canceladoEm ? "Cancelado pelo admin" : null,
    })
  );
}

// 1) 1 periódico com 4 exames → 1 opção Clínico + 3
const umCiclo = agruparPeriodicosPendentesParaVinculo(cicloClaudia());
assert.equal(umCiclo.length, 1);
assert.equal(umCiclo[0].examesLabel, "Clínico + 3");
assert.equal(labelExamesCicloVinculo(umCiclo[0]), "Clínico + 3 exames");
assert.equal(umCiclo[0].ids.length, 4);
assert.deepEqual(umCiclo[0].examesNomes, [
  "Clínico",
  "Coprocultura",
  "Hemograma completo",
  "PPF",
]);
assert.equal(
  textoQuantidadePeriodicosFuturos(umCiclo.length),
  "1 periódico futuro programado"
);

// 2) Duplicidade física do mesmo ciclo (4 × 2 = 8 linhas) → 1 opção
const duplicadosFisicos = agruparPeriodicosPendentesParaVinculo([
  ...cicloClaudia({ prefixoId: "a", agendamentoId: "ag-ativo" }),
  ...cicloClaudia({ prefixoId: "b", agendamentoId: "ag-cancelado-aso" }),
]);
assert.equal(duplicadosFisicos.length, 1, "duplicatas físicas do mesmo ciclo viram 1 opção");
assert.equal(duplicadosFisicos[0].ids.length, 8);
assert.equal(duplicadosFisicos[0].examesLabel, "Clínico + 3");
assert.equal(labelExamesCicloVinculo(duplicadosFisicos[0]), "Clínico + 3 exames");
assert.equal(duplicadosFisicos[0].agendamentoIds.length, 2);

// A página Periódicos Futuros usa a mesma chave e também mostra 1 ciclo
const naPaginaReal = agruparPeriodicosPorColaboradorCiclo(
  [
    ...cicloClaudia({ prefixoId: "a", agendamentoId: "ag-ativo" }),
    ...cicloClaudia({ prefixoId: "b", agendamentoId: "ag-cancelado-aso" }),
  ].map(toPeriodicoFuturoRow)
);
assert.equal(naPaginaReal.length, 1);
assert.equal(naPaginaReal[0].examesLabel, duplicadosFisicos[0].examesLabel);

// 3) Dois ciclos em datas diferentes → 2 opções
const doisCiclos = agruparPeriodicosPendentesParaVinculo([
  ...cicloClaudia(),
  rec({
    id: "aud-1",
    exame_nome: "Audiometria",
    exame_id: "exame-audio",
    proxima_data: "2027-06-12",
    data_prevista_original: "2027-06-12",
    agendamento_id: "ag-audio",
  }),
]);
assert.equal(doisCiclos.length, 2);
assert.equal(textoQuantidadePeriodicosFuturos(doisCiclos.length), "2 periódicos futuros programados");
const labels = doisCiclos.map((g) => labelExamesCicloVinculo(g)).sort();
assert.deepEqual(labels, ["Audiometria", "Clínico + 3 exames"]);

// 4) Exames diferentes na mesma data → 1 ciclo
assert.equal(umCiclo.length, 1);
assert.equal(umCiclo[0].examesNomes.length, 4);

// 5) Demissional antecipando o periódico: a seleção representa o ciclo inteiro
const selecionado = duplicadosFisicos[0];
assert.ok(selecionado.ids.includes("a-1"));
assert.ok(selecionado.ids.includes("b-4"));
const encontrado = encontrarGrupoPeriodicoPorIds(duplicadosFisicos, ["b-2"]);
assert.equal(encontrado?.grupoKey, selecionado.grupoKey);
assert.deepEqual(encontrado?.ids, selecionado.ids);

// 6) ASO Periódico pode escolher outro ciclo (não junta datas)
const outroCiclo = encontrarGrupoPeriodicoPorIds(doisCiclos, ["aud-1"]);
assert.equal(outroCiclo?.examesNomes.length, 1);
assert.equal(outroCiclo?.proxima_data.slice(0, 10), "2027-06-12");

// 7) Agendamento anterior cancelado não cria segunda opção do mesmo ciclo
assert.equal(duplicadosFisicos.length, 1);

// 8) Periódico cancelado manualmente não aparece
const comCancelado = agruparPeriodicosPendentesParaVinculo([
  ...cicloClaudia({ prefixoId: "ativo" }),
  ...cicloClaudia({
    prefixoId: "canc",
    status: "cancelado",
    canceladoEm: "2026-08-01T10:00:00Z",
    agendamentoId: "ag-canc",
  }),
]);
assert.equal(comCancelado.length, 1);
assert.equal(comCancelado[0].ids.length, 4);
assert.ok(comCancelado[0].ids.every((id) => id.startsWith("ativo-")));

const soCancelado = agruparPeriodicosPendentesParaVinculo(
  cicloClaudia({
    prefixoId: "canc",
    status: "cancelado",
    canceladoEm: "2026-08-01T10:00:00Z",
  })
);
assert.equal(soCancelado.length, 0);

// Reagendado/cumprido não aparece
const reagendado = agruparPeriodicosPendentesParaVinculo(
  cicloClaudia({ prefixoId: "re", status: "reagendado" })
);
assert.equal(reagendado.length, 0);

// 9) Identificação por CPF normalizado (máscara vs dígitos)
const cpfMascara = agruparPeriodicosPendentesParaVinculo([
  ...cicloClaudia({ prefixoId: "d", cpf: "114.359.948-92" }),
  ...cicloClaudia({ prefixoId: "e", cpf: "11435994892" }),
]);
assert.equal(cpfMascara.length, 1);
assert.equal(cpfMascara[0].ids.length, 8);

// 10) Legado sem CPF: mesma empresa+nome+cargo+data → 1 ciclo
const legado = agruparPeriodicosPendentesParaVinculo([
  rec({
    id: "leg-1",
    exame_nome: "Clínico",
    proxima_data: "2026-12-12",
    colaborador_cpf: null,
    colaborador: "MARIA SILVA",
    agendamento_id: "ag-leg-1",
  }),
  rec({
    id: "leg-2",
    exame_nome: "PPF",
    proxima_data: "2026-12-12",
    colaborador_cpf: null,
    colaborador: "Maria Silva",
    agendamento_id: "ag-leg-2",
  }),
]);
assert.equal(legado.length, 1);
assert.equal(legado[0].examesLabel, "Clínico + 1");
assert.equal(labelExamesCicloVinculo(legado[0]), "Clínico + 1 exame");

// Legado: mesmo nome, empresas diferentes → 2 ciclos
const legadoEmpresas = agruparPeriodicosPendentesParaVinculo([
  rec({
    id: "emp-1",
    exame_nome: "Clínico",
    proxima_data: "2026-12-12",
    colaborador_cpf: null,
    colaborador: "MARIA SILVA",
    cliente_nome: "EMPRESA A",
  }),
  rec({
    id: "emp-2",
    exame_nome: "Clínico",
    proxima_data: "2026-12-12",
    colaborador_cpf: null,
    colaborador: "MARIA SILVA",
    cliente_nome: "EMPRESA B",
  }),
]);
assert.equal(legadoEmpresas.length, 2);

// Vencido permanece selecionável
const vencido = agruparPeriodicosPendentesParaVinculo([
  rec({
    id: "venc-1",
    exame_nome: "Clínico",
    proxima_data: "2020-01-01",
    data_prevista_original: "2020-01-01",
  }),
]);
assert.equal(vencido.length, 1);
assert.equal(vencido[0].displayStatus, "vencido");

assert.equal(textoQuantidadePeriodicosFuturos(0), "nenhum periódico futuro programado");
assert.equal(encontrarGrupoPeriodicoPorIds(umCiclo, []), null);
assert.equal(encontrarGrupoPeriodicoPorIds(umCiclo, ["inexistente"]), null);

console.log("ok: test-periodico-vinculo-agendamento");
