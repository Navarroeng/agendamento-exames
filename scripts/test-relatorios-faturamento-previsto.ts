/**
 * Card Relatórios > Previsto no mês = Faturas Clientes > Previsto no mês.
 * Lucro bruto = previsto − custos clínicas.
 * Executar: npx tsx scripts/test-relatorios-faturamento-previsto.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildResumoClientesMes,
  buildResumoClinicasMes,
} from "../lib/fatura-mes-resumo";
import {
  buildKpis,
  faturamentoPrevistoNoMes,
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

function faturaCliente(valorTotal: number): FaturaRecord {
  return {
    id: "fat-cli",
    numero: "FAT-CLI-00001",
    tipo: "cliente",
    referencia_id: null,
    referencia_nome: "Empresa A",
    periodo_inicio: "2026-08-01",
    periodo_fim: "2026-08-31",
    mes_referencia: "2026-08",
    data_emissao: "2026-08-05",
    data_vencimento: "2026-08-15",
    valor_total: valorTotal,
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
    created_at: "2026-08-01T12:00:00.000Z",
    updated_at: "2026-08-01T12:00:00.000Z",
  } as FaturaRecord;
}

const agostoAgs = [
  ag({
    id: "1",
    data: "2026-08-04",
    cliente: "Empresa A",
    valorCliente: 4000,
    custoClinica: 2000,
  }),
  ag({
    id: "2",
    data: "2026-08-12",
    cliente: "Empresa B",
    valorCliente: 1972,
    custoClinica: 1147,
  }),
  ag({
    id: "3",
    data: "2026-08-20",
    cliente: "Empresa A",
    valorCliente: 0.5,
    custoClinica: 0.5,
  }),
  ag({
    id: "4",
    data: "2026-08-22",
    cliente: "Empresa A",
    valorCliente: 800,
    custoClinica: 400,
    status: "cancelado",
  }),
  ag({
    id: "5",
    data: "2026-07-10",
    cliente: "Empresa A",
    valorCliente: 500,
    custoClinica: 200,
  }),
];

const faturas = [faturaCliente(0)];
const filtersAgosto = {
  ...EMPTY_RELATORIOS_FILTERS,
  mesReferencia: "08/2026",
};

const previstoClientes = buildResumoClientesMes(
  agostoAgs,
  faturas,
  "08/2026"
);
const previstoCustos = buildResumoClinicasMes(agostoAgs, [], "08/2026");
assert.ok(previstoClientes);
assert.ok(previstoCustos);
assert.equal(previstoClientes.resumo.valorPrevisto, 5972);
assert.equal(previstoCustos.resumo.valorPrevisto, 3147);

const kpis = buildKpis(
  agostoAgs,
  faturas,
  [],
  [],
  filtersAgosto,
  agostoAgs
);
assert.equal(kpis.totalFaturado, 5972);
assert.equal(
  kpis.totalFaturado,
  previstoClientes.resumo.valorPrevisto,
  "Relatórios deve reutilizar Previsto no mês de Faturas Clientes"
);
assert.equal(kpis.custosClinicas, 3147);
assert.equal(kpis.lucroBruto, 2825);
assert.notEqual(kpis.totalFaturado, 0, "não deve usar valor_total da fatura emitida");

assert.equal(
  faturamentoPrevistoNoMes(agostoAgs, faturas, [], [], filtersAgosto),
  5972
);

const julho = buildKpis(
  agostoAgs,
  faturas,
  [],
  [],
  { ...EMPTY_RELATORIOS_FILTERS, mesReferencia: "07/2026" },
  agostoAgs
);
assert.equal(julho.totalFaturado, 500);
assert.equal(
  julho.totalFaturado,
  buildResumoClientesMes(agostoAgs, faturas, "07/2026")?.resumo.valorPrevisto
);

const soEmpresaB = faturamentoPrevistoNoMes(
  agostoAgs,
  faturas,
  [],
  [],
  { ...filtersAgosto, empresa: "Empresa B" }
);
assert.equal(soEmpresaB, 1972);

const root = process.cwd();
const aggregations = readFileSync(
  join(root, "lib/relatorios/aggregations.ts"),
  "utf8"
);
const summary = readFileSync(
  join(root, "components/relatorios/RelatoriosSummaryCards.tsx"),
  "utf8"
);
const financeiro = readFileSync(
  join(root, "components/relatorios/RelatoriosFinanceiroSection.tsx"),
  "utf8"
);

assert.match(aggregations, /buildResumoClientesMes/);
assert.match(aggregations, /faturamentoPrevistoNoMes/);
assert.doesNotMatch(aggregations, /faturasCliente\.reduce/);
assert.match(summary, /Previsto no mês/);
assert.doesNotMatch(summary, /Total faturado/);
assert.match(financeiro, /Previsto no mês/);
assert.doesNotMatch(financeiro, /Total faturado/);

console.log("test-relatorios-faturamento-previsto: OK");
