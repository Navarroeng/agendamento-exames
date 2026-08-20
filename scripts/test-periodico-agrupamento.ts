/** Agrupamento de periódicos por colaborador/ciclo e regularização de CPF. */

import assert from "node:assert/strict";
import { toPeriodicoFuturoRow } from "../lib/periodicos-futuro";
import {
  agruparPeriodicosPorColaboradorCiclo,
  chaveCicloPeriodico,
  chaveColaboradorPeriodico,
  countPeriodicoGruposByDisplayStatus,
  filterPeriodicoGrupos,
  formatarExamesGrupo,
  nomesColaboradorEquivalentes,
} from "../lib/periodico-agrupamento";
import {
  resolverConflitoCpfRegularizacao,
  validarCpfRegularizacaoPeriodico,
} from "../lib/periodico-cpf-regularizacao";
import type { PeriodicoFuturoRecord } from "../lib/types";

function row(partial: Partial<PeriodicoFuturoRecord> & { id: string }): ReturnType<
  typeof toPeriodicoFuturoRow
> {
  return toPeriodicoFuturoRow({
    agendamento_id: null,
    cliente_nome: "PORTAL DO CRESCER",
    colaborador: "ISABEL TELES",
    cargo_id: "cargo-aux",
    cargo_nome: "Auxiliar de Cozinha",
    exame_id: partial.exame_id ?? partial.id,
    tipo_exame: partial.exame_nome ?? "Clínico",
    exame_nome: "Clínico",
    data_realizada: "2026-06-01",
    proxima_data: "2026-12-01",
    status: "ativo",
    colaborador_cpf: null,
    ...partial,
  });
}

const isabelMesmoCiclo = [
  row({ id: "1", exame_nome: "Coprocultura", tipo_exame: "Coprocultura" }),
  row({ id: "2", exame_nome: "Clínico", tipo_exame: "Clínico" }),
  row({ id: "3", exame_nome: "PPF", tipo_exame: "PPF" }),
  row({ id: "4", exame_nome: "Hemograma completo", tipo_exame: "Hemograma completo" }),
];

const gruposIsabel = agruparPeriodicosPorColaboradorCiclo(isabelMesmoCiclo);
assert.equal(gruposIsabel.length, 1);
assert.equal(gruposIsabel[0].examesLabel, "Clínico + 3");
assert.equal(gruposIsabel[0].ids.length, 4);
assert.equal(gruposIsabel[0].temCpf, false);
assert.equal(
  formatarExamesGrupo(["Clínico"]).label,
  "Clínico"
);
assert.equal(
  formatarExamesGrupo(["Clínico", "PPF"]).label,
  "Clínico + 1"
);

const comCiclosDistintos = agruparPeriodicosPorColaboradorCiclo([
  ...isabelMesmoCiclo,
  row({
    id: "5",
    exame_nome: "Audiometria",
    tipo_exame: "Audiometria",
    proxima_data: "2027-06-01",
  }),
]);
assert.equal(comCiclosDistintos.length, 2);
assert.equal(
  comCiclosDistintos.find((g) => g.proxima_data.startsWith("2027"))?.examesLabel,
  "Audiometria"
);

const filtradoPpf = filterPeriodicoGrupos(gruposIsabel, {
  empresa: "",
  colaborador: "",
  cargo: "",
  exame: "PPF",
  status: "",
  mesReferencia: "",
});
assert.equal(filtradoPpf.length, 1);
assert.equal(filtradoPpf[0].examesLabel, "Clínico + 3");

assert.equal(
  chaveColaboradorPeriodico({
    colaborador_cpf: "529.982.247-25",
    cliente_nome: "A",
    colaborador: "X",
    cargo_id: null,
    cargo_nome: null,
  }),
  "cpf:52998224725"
);

const cpfValido = validarCpfRegularizacaoPeriodico("529.982.247-25");
assert.equal(cpfValido.ok, true);
assert.equal(validarCpfRegularizacaoPeriodico("111.111.111-11").ok, false);
assert.equal(validarCpfRegularizacaoPeriodico("123.456.789-00").ok, false);
assert.equal(validarCpfRegularizacaoPeriodico("000.000.000-00").ok, false);

assert.equal(
  nomesColaboradorEquivalentes("ISABEL TELES", "Isabel Teles"),
  true
);
assert.equal(
  nomesColaboradorEquivalentes("ISABEL TELES", "Maria Souza"),
  false
);

const conflito = resolverConflitoCpfRegularizacao({
  colaboradorAtual: "Isabel Teles",
  ocorrencias: [
    {
      colaborador: "João Outro",
      cliente_nome: "Outra Empresa",
      origem: "agendamento",
    },
  ],
});
assert.ok(conflito);
assert.equal(conflito?.colaborador, "João Outro");

const mesmoNome = resolverConflitoCpfRegularizacao({
  colaboradorAtual: "Isabel Teles",
  ocorrencias: [
    {
      colaborador: "ISABEL TELES",
      cliente_nome: "PORTAL DO CRESCER",
      origem: "periodico",
    },
  ],
});
assert.equal(mesmoNome, null);

assert.equal(
  chaveCicloPeriodico(isabelMesmoCiclo[0]),
  chaveCicloPeriodico(isabelMesmoCiclo[1])
);

const kpisIsabel = countPeriodicoGruposByDisplayStatus(gruposIsabel);
assert.equal(
  kpisIsabel.em_dia + kpisIsabel.vencido + kpisIsabel.vence_30_dias + kpisIsabel.reagendado,
  1,
  "KPI conta o ciclo, não cada exame"
);

const doisHomologos = agruparPeriodicosPorColaboradorCiclo([
  row({ id: "a", colaborador: "José da Silva", colaborador_cpf: "52998224725" }),
  row({
    id: "b",
    colaborador: "Jose da Silva",
    colaborador_cpf: null,
    cargo_id: "outro-cargo",
    cargo_nome: "Auxiliar",
  }),
]);
assert.equal(doisHomologos.length, 2, "legado sem CPF não mistura com CPF de outro cargo");

const mesmoNomeCpfsDistintos = agruparPeriodicosPorColaboradorCiclo([
  row({
    id: "c1",
    colaborador: "José da Silva",
    colaborador_cpf: "52998224725",
  }),
  row({
    id: "c2",
    colaborador: "José da Silva",
    colaborador_cpf: "11144477735",
  }),
]);
assert.equal(
  mesmoNomeCpfsDistintos.length,
  2,
  "mesmo nome com CPFs diferentes permanece separado"
);

console.log("test-periodico-agrupamento: OK");
