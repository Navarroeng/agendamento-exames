/**
 * Card Relatórios > Custos clínicas = Custos Clínicas > Previsto no mês.
 * Executar: npx tsx scripts/test-relatorios-custos-clinicas.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildResumoClinicasMes } from "../lib/fatura-mes-resumo";
import {
  buildKpis,
  custosClinicasPrevistoNoMes,
} from "../lib/relatorios/aggregations";
import { EMPTY_RELATORIOS_FILTERS } from "../lib/relatorios/types";
import type {
  AgendamentoWithExames,
  ClienteContratoRecord,
  ClienteRecord,
  FaturaRecord,
} from "../lib/types";

function agClinica(params: {
  id: string;
  data: string;
  clinica: string;
  custo: number;
  cliente?: string;
  responsavel?: string;
  status?: AgendamentoWithExames["status"];
  inclusoCredito?: boolean;
}): AgendamentoWithExames {
  return {
    id: params.id,
    cliente_nome: params.cliente ?? "Empresa A",
    data_agendamento: params.data,
    status: params.status ?? "agendado",
    colaborador: "Colab",
    clinica_nome: params.clinica,
    responsavel: params.responsavel ?? "Resp",
    aso: "Admissional",
    agendamento_exames: [
      {
        id: `${params.id}-e1`,
        agendamento_id: params.id,
        tipo_exame: "Clínico",
        valor_cliente: 0,
        custo_clinica: params.custo,
        incluso_credito_contrato: params.inclusoCredito ?? false,
      },
    ],
  } as AgendamentoWithExames;
}

function faturaClinica(params: {
  id: string;
  clinica: string;
  mes: string;
  valorTotal: number;
  status?: FaturaRecord["status"];
}): FaturaRecord {
  return {
    id: params.id,
    numero: `FAT-CLN-${params.id}`,
    tipo: "clinica",
    referencia_id: null,
    referencia_nome: params.clinica,
    periodo_inicio: `${params.mes}-01`,
    periodo_fim: `${params.mes}-31`,
    mes_referencia: params.mes,
    data_emissao: null,
    data_vencimento: `${params.mes}-15`,
    valor_total: params.valorTotal,
    total_exames: 1,
    status: params.status ?? "emitida",
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

const julhoAgs = [
  agClinica({
    id: "1",
    data: "2026-07-05",
    clinica: "Clínica Alpha",
    custo: 4000,
  }),
  agClinica({
    id: "2",
    data: "2026-07-12",
    clinica: "Clínica Beta",
    custo: 2734.54,
  }),
  agClinica({
    id: "3",
    data: "2026-07-20",
    clinica: "Clínica Alpha",
    custo: 0.5,
  }),
  agClinica({
    id: "4",
    data: "2026-07-22",
    clinica: "Clínica Alpha",
    custo: 200,
    status: "cancelado",
  }),
  agClinica({
    id: "5",
    data: "2026-06-10",
    clinica: "Clínica Alpha",
    custo: 999,
  }),
];

const faturas = [
  faturaClinica({
    id: "inv",
    clinica: "Clínica Alpha",
    mes: "2026-07",
    valorTotal: 1826,
  }),
];

const filtersJulho = {
  ...EMPTY_RELATORIOS_FILTERS,
  mesReferencia: "07/2026",
};

const previstoCustos = buildResumoClinicasMes(
  julhoAgs,
  faturas,
  "07/2026"
);
assert.ok(previstoCustos);
assert.equal(previstoCustos.resumo.valorPrevisto, 6734.54);

const kpis = buildKpis(
  julhoAgs,
  faturas,
  [],
  [],
  filtersJulho,
  julhoAgs
);
assert.equal(kpis.custosClinicas, 6734.54);
assert.equal(
  kpis.custosClinicas,
  previstoCustos.resumo.valorPrevisto,
  "Relatórios deve reutilizar Previsto no mês"
);
assert.notEqual(
  kpis.custosClinicas,
  1826,
  "não deve usar valor_total armazenado da fatura"
);

const junho = buildKpis(
  julhoAgs,
  faturas,
  [],
  [],
  { ...EMPTY_RELATORIOS_FILTERS, mesReferencia: "06/2026" },
  julhoAgs
);
assert.equal(junho.custosClinicas, 999);
assert.equal(
  junho.custosClinicas,
  buildResumoClinicasMes(julhoAgs, faturas, "06/2026")?.resumo.valorPrevisto
);

const soBeta = custosClinicasPrevistoNoMes(
  julhoAgs,
  faturas,
  [],
  [],
  { ...filtersJulho, clinica: "Beta" }
);
assert.equal(soBeta, 2734.54);

const soEmpresaB = custosClinicasPrevistoNoMes(
  [
    ...julhoAgs,
    agClinica({
      id: "6",
      data: "2026-07-08",
      clinica: "Clínica Gama",
      custo: 100,
      cliente: "Empresa B",
    }),
  ],
  faturas,
  [],
  [],
  { ...filtersJulho, empresa: "Empresa B" }
);
assert.equal(soEmpresaB, 100);

const clientes = [{ id: "c1", nome: "Empresa A" }] as ClienteRecord[];
const contratos = [
  { id: "ct1", cliente_id: "c1", status: "ativo" },
] as ClienteContratoRecord[];
const comContratoAtivo = custosClinicasPrevistoNoMes(
  [
    ...julhoAgs,
    agClinica({
      id: "7",
      data: "2026-07-09",
      clinica: "Clínica Gama",
      custo: 80,
      cliente: "Empresa B",
    }),
  ],
  faturas,
  contratos,
  clientes,
  { ...filtersJulho, statusContrato: "ativo" }
);
assert.equal(comContratoAtivo, 6734.54);

const root = process.cwd();
const aggregations = readFileSync(
  join(root, "lib/relatorios/aggregations.ts"),
  "utf8"
);
const service = readFileSync(
  join(root, "services/relatorios.service.ts"),
  "utf8"
);
const hook = readFileSync(join(root, "hooks/useRelatoriosPage.ts"), "utf8");

assert.match(aggregations, /buildResumoClinicasMes/);
assert.match(aggregations, /custosClinicasPrevistoNoMes/);
assert.match(aggregations, /buildResumoClientesMes/);
assert.match(aggregations, /faturamentoPrevistoNoMes/);
assert.doesNotMatch(
  aggregations,
  /faturasClinica\.reduce/
);
assert.doesNotMatch(aggregations, /faturasCliente\.reduce/);
assert.match(service, /listarAgendamentosParaFatura/);
assert.match(hook, /agendamentosCustosClinicas/);

console.log("test-relatorios-custos-clinicas: OK");
