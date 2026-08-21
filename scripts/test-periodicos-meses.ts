/** Smoke: navegação Ano/Mês de Periódicos Futuros (proxima_data). */
/** Garante anos futuros, meses previstos e a aba Todos. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  belongsToPeriodo,
  belongsToYearMonth,
  isPeriodoTodosMeses,
  listMesAbasDoAno,
  mergeAnosComAtual,
  resolveMesParaAno,
  resolvePeriodoParaAno,
  yearMonthFromIsoDate,
} from "../lib/listagem-meses";
import {
  filterPeriodicosFuturosPorMes,
  resolveInitialMesPeriodicos,
  toPeriodicoFuturoRow,
} from "../lib/periodicos-futuro";
import {
  agruparPeriodicosPorColaboradorCiclo,
  countPeriodicoGruposByDisplayStatus,
  filterPeriodicoGrupos,
} from "../lib/periodico-agrupamento";
import type { PeriodicoFuturoFilters, PeriodicoFuturoRecord } from "../lib/types";

const root = join(__dirname, "..");
const agoraAgosto = new Date(2026, 7, 7); // 07/08/2026

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const records = [
  { id: "a", proxima_data: "2026-08-10" },
  { id: "b", proxima_data: "2026-12-15" },
  { id: "c", proxima_data: "2026-12-20" },
  { id: "d", proxima_data: "2027-03-01" },
  { id: "e", proxima_data: "2027-11-12" },
  { id: "f", proxima_data: "2028-01-05" },
];

function extractAnos(rows: { proxima_data: string }[]): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    const ym = yearMonthFromIsoDate(row.proxima_data);
    if (ym) years.add(ym.year);
  }
  return Array.from(years).sort((a, b) => a - b);
}

function countPorAno(rows: { proxima_data: string }[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const row of rows) {
    const ym = yearMonthFromIsoDate(row.proxima_data);
    if (!ym) continue;
    counts[ym.year] = (counts[ym.year] || 0) + 1;
  }
  return counts;
}

function filterPorMes(
  rows: { id: string; proxima_data: string }[],
  mes: { year: number; month: number }
) {
  return rows.filter((r) => belongsToYearMonth(r.proxima_data, mes));
}

assert.deepEqual(extractAnos(records), [2026, 2027, 2028]);
assert.deepEqual(mergeAnosComAtual(extractAnos(records), agoraAgosto), [
  2026, 2027, 2028,
]);
assert.deepEqual(countPorAno(records), {
  2026: 3,
  2027: 2,
  2028: 1,
});

const abas2026 = listMesAbasDoAno(2026, 1);
assert.equal(abas2026.length, 12);
assert.deepEqual(abas2026[0], { year: 2026, month: 1 });
assert.deepEqual(abas2026[11], { year: 2026, month: 12 });

// Sem allowFutureMonths, dezembro/2026 ficaria bloqueado (regressão).
assert.deepEqual(resolveMesParaAno(2026, 12, { now: agoraAgosto }), {
  year: 2026,
  month: 8,
});

// Com allowFutureMonths (Periódicos), dezembro e 2027 ficam acessíveis.
assert.deepEqual(
  resolveMesParaAno(2026, 12, {
    now: agoraAgosto,
    allowFutureMonths: true,
  }),
  { year: 2026, month: 12 }
);
assert.deepEqual(
  resolveMesParaAno(2027, 3, {
    now: agoraAgosto,
    allowFutureMonths: true,
  }),
  { year: 2027, month: 3 }
);

const dez2026 = filterPorMes(records, { year: 2026, month: 12 });
assert.equal(dez2026.length, 2);

const mar2027 = filterPorMes(records, { year: 2027, month: 3 });
assert.equal(mar2027.length, 1);
assert.equal(mar2027[0].id, "d");

const totalVisivel =
  filterPorMes(records, { year: 2026, month: 8 }).length +
  filterPorMes(records, { year: 2026, month: 12 }).length +
  filterPorMes(records, { year: 2027, month: 3 }).length +
  filterPorMes(records, { year: 2027, month: 11 }).length +
  filterPorMes(records, { year: 2028, month: 1 }).length;
assert.equal(totalVisivel, records.length);

function row(
  partial: Partial<PeriodicoFuturoRecord> & {
    id: string;
    proxima_data: string;
    colaborador: string;
  }
) {
  return toPeriodicoFuturoRow({
    agendamento_id: null,
    cliente_nome: "PORTAL DO CRESCER",
    cargo_id: "cargo-aux",
    cargo_nome: "Auxiliar de Cozinha",
    exame_id: partial.exame_id ?? partial.id,
    tipo_exame: partial.exame_nome ?? "Clínico",
    exame_nome: "Clínico",
    data_realizada: "2026-06-01",
    status: "ativo",
    colaborador_cpf: null,
    ...partial,
  });
}

const EMPTY: PeriodicoFuturoFilters = {
  empresa: "",
  colaborador: "",
  cargo: "",
  exame: "",
  status: "",
  mesReferencia: "",
};

const isabelJanClinico = row({
  id: "ij-cli",
  colaborador: "ISABEL TELES",
  proxima_data: "2026-01-15",
  exame_nome: "Clínico",
  tipo_exame: "Clínico",
});
const isabelJanPpf = row({
  id: "ij-ppf",
  colaborador: "ISABEL TELES",
  proxima_data: "2026-01-15",
  exame_nome: "PPF",
  tipo_exame: "PPF",
});
const isabelAgo = row({
  id: "ia",
  colaborador: "ISABEL TELES",
  proxima_data: "2026-08-10",
  exame_nome: "Audiometria",
  tipo_exame: "Audiometria",
});
const mariaAgo = row({
  id: "ma",
  colaborador: "MARIA SOUZA",
  cliente_nome: "ACME LTDA",
  cargo_id: "cargo-adm",
  cargo_nome: "Administrativo",
  proxima_data: "2026-08-20",
  exame_nome: "Hemograma completo",
  tipo_exame: "Hemograma completo",
});
const joao2027 = row({
  id: "j27",
  colaborador: "JOAO SILVA",
  proxima_data: "2027-03-01",
  exame_nome: "Clínico",
  tipo_exame: "Clínico",
});
const isabelCancelado = row({
  id: "ic",
  colaborador: "ISABEL TELES",
  proxima_data: "2026-09-01",
  exame_nome: "Clínico",
  tipo_exame: "Clínico",
  status: "cancelado",
  cancelado_em: "2026-08-01T12:00:00Z",
  motivo_cancelamento: "Saiu da empresa",
});
const mariaReagendado = row({
  id: "mr",
  colaborador: "MARIA SOUZA",
  cliente_nome: "ACME LTDA",
  cargo_id: "cargo-adm",
  cargo_nome: "Administrativo",
  proxima_data: "2026-11-10",
  status: "reagendado",
  exame_nome: "Clínico",
  tipo_exame: "Clínico",
});

const amostra = [
  isabelJanClinico,
  isabelJanPpf,
  isabelAgo,
  mariaAgo,
  joao2027,
  isabelCancelado,
  mariaReagendado,
];

function pipeline(
  mes: { year: number; month: number | null },
  filters: PeriodicoFuturoFilters = EMPTY
) {
  const doPeriodo = filterPeriodicosFuturosPorMes(amostra, mes);
  const grupos = agruparPeriodicosPorColaboradorCiclo(doPeriodo);
  const filtrados = filterPeriodicoGrupos(grupos, filters);
  const kpis = countPeriodicoGruposByDisplayStatus(grupos);
  return { doPeriodo, grupos, filtrados, kpis, contador: filtrados.length };
}

run("2026 + Janeiro", () => {
  const p = pipeline({ year: 2026, month: 1 });
  assert.equal(p.doPeriodo.length, 2);
  assert.equal(p.grupos.length, 1);
  assert.equal(p.grupos[0].examesLabel, "Clínico + 1");
  assert.equal(p.contador, 1);
});

run("2026 + Agosto", () => {
  const p = pipeline({ year: 2026, month: 8 });
  assert.equal(p.doPeriodo.length, 2);
  assert.equal(p.grupos.length, 2);
  assert.ok(p.grupos.some((g) => g.colaborador === "ISABEL TELES"));
  assert.ok(p.grupos.some((g) => g.colaborador === "MARIA SOUZA"));
});

run("2026 + Todos inclui jan/ago/set/nov e exclui 2027", () => {
  const p = pipeline({ year: 2026, month: null });
  assert.equal(isPeriodoTodosMeses({ year: 2026, month: null }), true);
  assert.equal(p.doPeriodo.some((r) => r.id === "j27"), false);
  assert.ok(p.doPeriodo.some((r) => r.id === "ij-cli"));
  assert.ok(p.doPeriodo.some((r) => r.id === "ia"));
  assert.ok(p.doPeriodo.some((r) => r.id === "ic"));
  assert.ok(p.doPeriodo.some((r) => r.id === "mr"));
  assert.equal(p.doPeriodo.length, 6);
});

run("2027 + Todos", () => {
  const p = pipeline({ year: 2027, month: null });
  assert.equal(p.doPeriodo.length, 1);
  assert.equal(p.doPeriodo[0].colaborador, "JOAO SILVA");
});

run("Todos + filtro Colaborador", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, colaborador: "ISABEL TELES" }
  );
  assert.ok(p.filtrados.every((g) => g.colaborador === "ISABEL TELES"));
  assert.equal(p.filtrados.length, 2);
  assert.ok(p.filtrados.every((g) => g.displayStatus !== "cancelado"));
});

run("Todos + Empresa", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, empresa: "ACME LTDA" }
  );
  assert.ok(p.filtrados.every((g) => g.cliente_nome === "ACME LTDA"));
  assert.equal(p.filtrados.length, 2);
});

run("Todos + Cargo", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, cargo: "Administrativo" }
  );
  assert.ok(p.filtrados.every((g) => g.cargo_nome === "Administrativo"));
});

run("Todos + Exame", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, exame: "Audiometria" }
  );
  assert.equal(p.filtrados.length, 1);
  assert.equal(p.filtrados[0].colaborador, "ISABEL TELES");
});

run("Todos + Status cancelado", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, status: "cancelado" }
  );
  assert.equal(p.filtrados.length, 1);
  assert.equal(p.filtrados[0].id, "ic");
});

run("agrupamento Clinico + N no mesmo ciclo", () => {
  const jan = pipeline({ year: 2026, month: 1 });
  assert.equal(jan.grupos[0].examesLabel, "Clínico + 1");
  assert.equal(jan.kpis.em_dia + jan.kpis.vencido + jan.kpis.vence_30_dias, 1);
});

run("KPIs e contador usam o período; KPI agrupa ciclo", () => {
  const todos = pipeline({ year: 2026, month: null });
  const kpisSoma =
    todos.kpis.vencido +
    todos.kpis.vence_30_dias +
    todos.kpis.em_dia +
    todos.kpis.reagendado +
    todos.kpis.cancelado;
  assert.equal(kpisSoma, todos.grupos.length);
  assert.equal(todos.kpis.reagendado, 1);
  assert.equal(todos.kpis.cancelado, 1);
  assert.equal(
    todos.contador,
    todos.grupos.length - todos.kpis.cancelado,
    "Status Todos não conta cancelados"
  );
  assert.equal(todos.contador, todos.filtrados.length);
  assert.ok(todos.filtrados.every((g) => g.displayStatus !== "cancelado"));
  const soIsabel = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, colaborador: "ISABEL TELES" }
  );
  assert.equal(soIsabel.contador, soIsabel.filtrados.length);
  assert.ok(soIsabel.contador < todos.contador);
});

run("periódico cancelado e reagendado no ano Todos", () => {
  const p = pipeline({ year: 2026, month: null });
  assert.ok(p.grupos.some((g) => g.displayStatus === "cancelado"));
  assert.ok(p.grupos.some((g) => g.displayStatus === "reagendado"));
  assert.ok(p.filtrados.every((g) => g.displayStatus !== "cancelado"));
});

function isoOffset(days: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

run("Status Todos não lista cancelados", () => {
  const p = pipeline({ year: 2026, month: null }, EMPTY);
  assert.ok(p.filtrados.length > 0);
  assert.ok(p.filtrados.every((g) => g.displayStatus !== "cancelado"));
  assert.ok(p.grupos.some((g) => g.displayStatus === "cancelado"));
});

run("Status Cancelado lista somente cancelados", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, status: "cancelado" }
  );
  assert.equal(p.filtrados.length, 1);
  assert.ok(p.filtrados.every((g) => g.displayStatus === "cancelado"));
  assert.equal(p.contador, 1);
});

run("Status Vencido", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, status: "vencido" }
  );
  assert.ok(p.filtrados.length > 0);
  assert.ok(p.filtrados.every((g) => g.displayStatus === "vencido"));
});

run("Status Reagendado", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, status: "reagendado" }
  );
  assert.equal(p.filtrados.length, 1);
  assert.equal(p.filtrados[0].id, "mr");
});

run("Status Em dia e Vence em 30 dias", () => {
  const extras = [
    row({
      id: "em-dia",
      colaborador: "ANA LIMA",
      proxima_data: isoOffset(60),
      exame_nome: "Clínico",
      tipo_exame: "Clínico",
    }),
    row({
      id: "vence-30",
      colaborador: "BRUNO COSTA",
      proxima_data: isoOffset(10),
      exame_nome: "Clínico",
      tipo_exame: "Clínico",
    }),
  ];
  const grupos = agruparPeriodicosPorColaboradorCiclo([...amostra, ...extras]);
  const emDia = filterPeriodicoGrupos(grupos, { ...EMPTY, status: "em_dia" });
  const vence30 = filterPeriodicoGrupos(grupos, {
    ...EMPTY,
    status: "vence_30_dias",
  });
  assert.ok(emDia.some((g) => g.id === "em-dia"));
  assert.ok(emDia.every((g) => g.displayStatus === "em_dia"));
  assert.ok(vence30.some((g) => g.id === "vence-30"));
  assert.ok(vence30.every((g) => g.displayStatus === "vence_30_dias"));
});

run("Mês Todos + Status Todos exclui cancelado", () => {
  const p = pipeline({ year: 2026, month: null }, EMPTY);
  assert.ok(p.filtrados.every((g) => g.displayStatus !== "cancelado"));
  assert.equal(p.contador, p.filtrados.length);
});

run("Mês Todos + Status Cancelado", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, status: "cancelado" }
  );
  assert.ok(p.filtrados.every((g) => g.displayStatus === "cancelado"));
  assert.equal(p.contador, p.filtrados.length);
});

run("colaborador + Status Todos", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, colaborador: "ISABEL TELES" }
  );
  assert.ok(p.filtrados.every((g) => g.colaborador === "ISABEL TELES"));
  assert.ok(p.filtrados.every((g) => g.displayStatus !== "cancelado"));
});

run("colaborador + Status Cancelado", () => {
  const p = pipeline(
    { year: 2026, month: null },
    { ...EMPTY, colaborador: "ISABEL TELES", status: "cancelado" }
  );
  assert.equal(p.filtrados.length, 1);
  assert.equal(p.filtrados[0].id, "ic");
  assert.equal(p.contador, 1);
});

run("KPIs operacionais não misturam cancelado", () => {
  const p = pipeline({ year: 2026, month: null });
  assert.equal(p.kpis.cancelado, 1);
  assert.equal(p.kpis.reagendado, 1);
  assert.equal(
    p.kpis.vencido + p.kpis.vence_30_dias + p.kpis.em_dia + p.kpis.reagendado,
    p.grupos.length - p.kpis.cancelado
  );
});

run("trocar Todos para um mês específico", () => {
  const todos = pipeline({ year: 2026, month: null });
  const agosto = pipeline({ year: 2026, month: 8 });
  assert.ok(todos.doPeriodo.length > agosto.doPeriodo.length);
  assert.equal(
    agosto.doPeriodo.every((r) => r.proxima_data.startsWith("2026-08")),
    true
  );
});

run("trocar o ano mantendo Todos", () => {
  const next = resolvePeriodoParaAno(
    2027,
    { year: 2026, month: null },
    {
      now: agoraAgosto,
      allowFutureMonths: true,
    }
  );
  assert.deepEqual(next, { year: 2027, month: null });
  const mesPreservado = resolvePeriodoParaAno(
    2027,
    { year: 2026, month: 8 },
    { now: agoraAgosto, allowFutureMonths: true }
  );
  assert.deepEqual(mesPreservado, { year: 2027, month: 8 });
});

run("Todos não é um mês sintético", () => {
  assert.equal(isPeriodoTodosMeses({ year: 2026, month: null }), true);
  assert.equal(isPeriodoTodosMeses({ year: 2026, month: 8 }), false);
  assert.equal(belongsToPeriodo("2026-01-15", { year: 2026, month: null }), true);
  assert.equal(belongsToPeriodo("2026-12-01", { year: 2026, month: null }), true);
  assert.equal(belongsToPeriodo("2027-01-01", { year: 2026, month: null }), false);
  assert.equal(belongsToPeriodo("2026-01-15", { year: 2026, month: 1 }), true);
  assert.equal(belongsToPeriodo("2026-08-10", { year: 2026, month: 1 }), false);
});

run("UI: aba Todos só em Periódicos Futuros", () => {
  const table = readFileSync(
    join(root, "components/periodicos-futuros/PeriodicosFuturosTable.tsx"),
    "utf8"
  );
  const tabs = readFileSync(
    join(root, "components/ui/ListagemMesAnoTabs.tsx"),
    "utf8"
  );
  const implantacao = readFileSync(
    join(root, "components/implantacao/ImplantacaoMesTabs.tsx"),
    "utf8"
  );
  assert.match(table, /showAllMonthsTab/);
  assert.match(tabs, /showAllMonthsTab/);
  assert.doesNotMatch(implantacao, /showAllMonthsTab/);
});

run("página inicia em ano atual + Todos, não no mês civil", () => {
  const inicial = resolveInitialMesPeriodicos(agoraAgosto);
  assert.deepEqual(inicial, { year: 2026, month: null });
  assert.equal(isPeriodoTodosMeses(inicial), true);
  assert.notEqual(inicial.month, 8);
  const janeiro = resolveInitialMesPeriodicos(new Date(2027, 0, 15));
  assert.deepEqual(janeiro, { year: 2027, month: null });
});

run("Limpar filtros e estado inicial usam o mesmo período Todos", () => {
  const hook = readFileSync(
    join(root, "hooks/usePeriodicosFuturosPage.ts"),
    "utf8"
  );
  assert.match(hook, /resolveInitialMesPeriodicos\(\)/);
  assert.match(
    hook,
    /setMesSelecionado\(resolveInitialMesPeriodicos\(\)\)/
  );
  assert.doesNotMatch(hook, /resolveInitialMesPeriodicos\(\[\]\)/);
  assert.doesNotMatch(
    hook,
    /getNowYearMonth/
  );
});

console.log(
  JSON.stringify({
    ok: true,
    counts: countPorAno(records),
    anos: extractAnos(records),
    dez2026: dez2026.length,
  })
);
