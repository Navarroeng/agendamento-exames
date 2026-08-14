/**
 * Formatação de valores nos gráficos de Relatórios (somente exibição).
 * Executar: npx tsx scripts/test-relatorios-chart-format.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatCurrencyIntl } from "../lib/money";
import { formatRelatoriosChartTick } from "../lib/relatorios/chart-format";

const faturado = formatCurrencyIntl(12485);
const custos = formatCurrencyIntl(6722.780000000001);
const lucro = formatCurrencyIntl(5762.219999999999);
const negativo = formatCurrencyIntl(-3147);

assert.match(faturado, /R\$/);
assert.match(faturado, /12\.485,00/);
assert.match(custos, /6\.722,78/);
assert.match(lucro, /5\.762,22/);
assert.doesNotMatch(custos, /6722\.780000000001/);
assert.doesNotMatch(lucro, /5762\.219999999999/);
assert.match(negativo, /3\.147,00/);
assert.match(negativo, /R\$/);

assert.equal(
  formatRelatoriosChartTick(6722.780000000001, "currency"),
  custos
);
assert.equal(formatRelatoriosChartTick(12, "number"), "12");
assert.equal(formatRelatoriosChartTick("abc", "currency"), "—");

const financeiro = readFileSync(
  join(process.cwd(), "components/relatorios/RelatoriosFinanceiroSection.tsx"),
  "utf8"
);
const contratos = readFileSync(
  join(process.cwd(), "components/relatorios/RelatoriosContratosSection.tsx"),
  "utf8"
);
const chartCard = readFileSync(
  join(process.cwd(), "components/relatorios/RelatoriosChartCard.tsx"),
  "utf8"
);
assert.match(financeiro, /Evolução mensal[\s\S]*valueFormat="currency"/);
assert.match(financeiro, /Exames mais realizados/);
assert.doesNotMatch(
  financeiro.slice(financeiro.indexOf("Exames mais realizados")),
  /valueFormat="currency"/
);
assert.match(
  contratos,
  /Evolução de receita contratual[\s\S]*valueFormat="currency"/
);
assert.match(chartCard, /formatRelatoriosChartTick/);

console.log("test-relatorios-chart-format: OK");
console.log("  Faturado:", faturado);
console.log("  Custos:", custos);
console.log("  Lucro:", lucro);
console.log("  Negativo:", negativo);
