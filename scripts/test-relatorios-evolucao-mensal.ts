/**
 * Gráfico Evolução mensal = mesmos Previsto / Custos / Lucro dos cards.
 * Executar: npx tsx scripts/test-relatorios-evolucao-mensal.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildResumoClientesMes,
  buildResumoClinicasMes,
} from "../lib/fatura-mes-resumo";
import { formatCurrencyIntl } from "../lib/money";
import {
  buildFaturamentoMensalChart,
  buildKpis,
} from "../lib/relatorios/aggregations";
import { EMPTY_RELATORIOS_FILTERS } from "../lib/relatorios/types";
import type { AgendamentoWithExames, FaturaRecord } from "../lib/types";

function ag(params: {
  id: string;
  data: string;
  cliente: string;
  valorCliente: number;
  custoClinica: number;
  clinica?: string;
  status?: AgendamentoWithExames["status"];
}): AgendamentoWithExames {
  return {
    id: params.id,
    cliente_nome: params.cliente,
    data_agendamento: params.data,
    status: params.status ?? "agendado",
    colaborador: "Colab",
    clinica_nome: params.clinica ?? "Clínica A",
    responsavel: "Resp",
    aso: "Admissional",
    agendamento_exames: [
      {
        id: `${params.id}-e1`,
        agendamento_id: params.id,
        tipo_exame: "Clínico",
        valor_cliente: params.valorCliente,
        custo_clinica: params.custoClinica,
      },
    ],
  } as AgendamentoWithExames;
}

function fatura(params: {
  id: string;
  tipo: FaturaRecord["tipo"];
  mes: string;
  valorTotal: number;
  nome: string;
}): FaturaRecord {
  return {
    id: params.id,
    numero: `FAT-${params.id}`,
    tipo: params.tipo,
    referencia_id: null,
    referencia_nome: params.nome,
    periodo_inicio: `${params.mes}-01`,
    periodo_fim: `${params.mes}-31`,
    mes_referencia: params.mes,
    data_emissao: `${params.mes}-05`,
    data_vencimento: `${params.mes}-15`,
    valor_total: params.valorTotal,
    total_exames: 1,
    status: "emitida",
    gerado_por: "Teste",
    pago: false,
    data_pagamento: null,
    observacao_pagamento: null,
    comprovante_pagamento_path: null,
    comprovante_pagamento_nome: null,
    conferido_em: null,
    conferido_por: null,
    fatura_clinica_path: null,
    fatura_clinica_nome: null,
    fatura_clinica_tipo: null,
    fatura_clinica_tamanho: null,
    observacao_conferencia: null,
    conferencia_registrada_em: null,
    conferencia_registrada_por: null,
    fatura_origem_id: null,
    fatura_substituta_id: null,
    created_at: `${params.mes}-01T12:00:00.000Z`,
    updated_at: `${params.mes}-01T12:00:00.000Z`,
  } as FaturaRecord;
}

const ags = [
  ag({
    id: "mai",
    data: "2026-05-10",
    cliente: "Empresa A",
    valorCliente: 2000,
    custoClinica: 900,
  }),
  ag({
    id: "jun",
    data: "2026-06-08",
    cliente: "Empresa A",
    valorCliente: 4500,
    custoClinica: 2100,
  }),
  ag({
    id: "jul-a",
    data: "2026-07-04",
    cliente: "Empresa A",
    valorCliente: 8000,
    custoClinica: 5000,
  }),
  ag({
    id: "jul-b",
    data: "2026-07-18",
    cliente: "Empresa B",
    valorCliente: 2370,
    custoClinica: 1734.54,
  }),
  ag({
    id: "ago",
    data: "2026-08-12",
    cliente: "Empresa A",
    valorCliente: 5972,
    custoClinica: 3147,
  }),
];

const faturas = [
  fatura({
    id: "cli-jul",
    tipo: "cliente",
    mes: "2026-07",
    valorTotal: 10820,
    nome: "Empresa A",
  }),
  fatura({
    id: "cln-jul",
    tipo: "clinica",
    mes: "2026-07",
    valorTotal: 1826,
    nome: "Clínica A",
  }),
];

const chart = buildFaturamentoMensalChart(
  ags,
  faturas,
  [],
  [],
  EMPTY_RELATORIOS_FILTERS
);

const byLabel = Object.fromEntries(chart.map((p) => [p.label, p]));

for (const mes of ["05/2026", "06/2026", "07/2026", "08/2026"] as const) {
  const iso = `${mes.slice(3)}-${mes.slice(0, 2)}`;
  const kpis = buildKpis(ags, faturas, [], [], {
    ...EMPTY_RELATORIOS_FILTERS,
    mesReferencia: mes,
  }, ags);
  const ponto = byLabel[iso];
  assert.ok(ponto, `gráfico deve ter o mês ${iso}`);

  const previstoClientes = buildResumoClientesMes(ags, faturas, mes)?.resumo
    .valorPrevisto;
  const previstoCustos = buildResumoClinicasMes(ags, faturas, mes)?.resumo
    .valorPrevisto;

  assert.equal(kpis.totalFaturado, previstoClientes);
  assert.equal(kpis.custosClinicas, previstoCustos);
  assert.equal(kpis.lucroBruto, kpis.totalFaturado - kpis.custosClinicas);
  assert.equal(ponto.value, kpis.totalFaturado);
  assert.equal(ponto.value2, kpis.custosClinicas);
  assert.equal(ponto.value3, kpis.lucroBruto);
}

const julho = byLabel["2026-07"];
assert.equal(julho.value, 10370);
assert.equal(julho.value2, 6734.54);
assert.equal(julho.value3, julho.value - julho.value2);
assert.equal(julho.value3, 10370 - 6734.54);
assert.notEqual(julho.value, 10820);
assert.notEqual(julho.value2, 1826);

assert.equal(formatCurrencyIntl(julho.value), "R$ 10.370,00");
assert.equal(formatCurrencyIntl(julho.value2), "R$ 6.734,54");
assert.equal(formatCurrencyIntl(julho.value3), "R$ 3.635,46");

const soEmpresaB = buildFaturamentoMensalChart(ags, faturas, [], [], {
  ...EMPTY_RELATORIOS_FILTERS,
  empresa: "Empresa B",
});
assert.equal(soEmpresaB.length, 1);
assert.equal(soEmpresaB[0].label, "2026-07");
assert.equal(soEmpresaB[0].value, 2370);
assert.equal(soEmpresaB[0].value2, 1734.54);

const root = process.cwd();
const aggregations = readFileSync(
  join(root, "lib/relatorios/aggregations.ts"),
  "utf8"
);
const hook = readFileSync(join(root, "hooks/useRelatoriosPage.ts"), "utf8");
const chartCard = readFileSync(
  join(root, "components/relatorios/RelatoriosChartCard.tsx"),
  "utf8"
);

assert.match(aggregations, /financeiroPrevistoNoMes/);
assert.match(aggregations, /buildFaturamentoMensalChart/);
assert.doesNotMatch(
  aggregations,
  /if \(f\.tipo === "cliente"\) current\.faturado \+= valor/
);
assert.match(hook, /agendamentosCustosClinicas/);
assert.match(hook, /buildFaturamentoMensalChart\(/);
assert.match(chartCard, /name="Previsto"/);
assert.doesNotMatch(chartCard, /name="Faturado"/);

console.log("test-relatorios-evolucao-mensal: OK");
console.log("  Julho previsto:", formatCurrencyIntl(julho.value));
console.log("  Julho custos:", formatCurrencyIntl(julho.value2));
console.log("  Julho lucro:", formatCurrencyIntl(julho.value3));
