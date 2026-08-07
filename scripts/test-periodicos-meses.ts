/** Smoke: navegação Ano/Mês de Periódicos Futuros (proxima_data). */
/** Garante anos futuros e meses previstos acessíveis no seletor. */

import assert from "node:assert/strict";
import {
  belongsToYearMonth,
  listMesAbasDoAno,
  mergeAnosComAtual,
  resolveMesParaAno,
  yearMonthFromIsoDate,
} from "../lib/listagem-meses";

const agoraAgosto = new Date(2026, 7, 7); // 07/08/2026

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

console.log(
  JSON.stringify({
    ok: true,
    counts: countPorAno(records),
    anos: extractAnos(records),
    dez2026: dez2026.length,
  })
);
