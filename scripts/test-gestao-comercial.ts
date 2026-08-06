/** Smoke: Gestão Comercial com histórico mensal anterior ao sistema. */
import assert from "node:assert/strict";
import {
  buildGestaoComercialDashboard,
  buildEvolucaoAnualGestaoComercial,
  calcComparacaoMes,
  indexHistoricoMensal,
  isContratoContabilizavel,
  labelPeriodoAteMes,
  resolveValorFechado,
  resolveValorMesGestaoComercial,
  type GestaoComercialFechamentoRow,
  type GestaoComercialHistoricoMensal,
} from "../lib/gestao-comercial";

const base = (
  partial: Partial<GestaoComercialFechamentoRow>
): GestaoComercialFechamentoRow => ({
  aprovacaoId: partial.aprovacaoId ?? "a1",
  orcamentoId: "o1",
  contratoId: "c1",
  aprovadoEm: partial.aprovadoEm ?? "2026-08-10T12:00:00.000Z",
  numeroOrcamento: "ORC-1",
  numeroContrato: "CTR-1",
  clienteNome: partial.clienteNome ?? "Cliente",
  clienteCnpj: "00000000000191",
  origem: partial.origem ?? "google",
  responsavelNoFechamento: partial.responsavelNoFechamento ?? "Bruna",
  responsavelAproximado: false,
  quantidadeColaboradores: 10,
  valorOriginalOrcamento: partial.valorOriginalOrcamento ?? 1500,
  valorFinalAprovado: partial.valorFinalAprovado ?? 1400,
  valorFechado: partial.valorFechado ?? 1400,
  usouValorOriginalFallback: partial.usouValorOriginalFallback ?? false,
  formaPagamento: partial.formaPagamento ?? "avista",
  condicaoPagamento: "À vista",
  statusContrato: partial.statusContrato ?? "ativo",
  orcamentoStatus: partial.orcamentoStatus ?? "aprovado",
});

const historico: GestaoComercialHistoricoMensal[] = [
  { ano: 2025, mes: 1, valorFechado: 25910, origemDado: "historico_manual" },
  { ano: 2026, mes: 6, valorFechado: 19700, origemDado: "historico_manual" },
  { ano: 2026, mes: 7, valorFechado: 99999, origemDado: "historico_manual" },
];

assert.equal(
  isContratoContabilizavel({ statusContrato: "ativo", orcamentoStatus: "aprovado" }),
  true
);
assert.deepEqual(resolveValorFechado(1400, 1500), {
  valor: 1400,
  usouFallback: false,
});
assert.equal(calcComparacaoMes(1000, 0).tendencia, "sem_base");
assert.equal(calcComparacaoMes(20000, 16000).percentual, 25);

const histMap = indexHistoricoMensal(historico);
const filtersBase = {
  ano: 2026,
  mes: 6,
  periodoInicio: "",
  periodoFim: "",
  responsavel: "",
  origem: "" as const,
  tipo: "" as const,
  statusContrato: "ativos" as const,
  usarPeriodoPersonalizado: false,
};

// 1) Janeiro/2025 histórico
const jan2025 = resolveValorMesGestaoComercial([], filtersBase, 2025, 1, histMap);
assert.equal(jan2025.valorFechado, 25910);
assert.equal(jan2025.origem, "historico_manual");

// 2) Junho/2026 histórico
const jun2026 = resolveValorMesGestaoComercial([], filtersBase, 2026, 6, histMap);
assert.equal(jun2026.valorFechado, 19700);
assert.equal(jun2026.origem, "historico_manual");

// 3) Julho/2026: real prevalece e NÃO soma com histórico 99999
const rowsJul = [
  base({
    aprovacaoId: "j1",
    aprovadoEm: "2026-07-15T10:00:00.000Z",
    valorFechado: 8000,
    statusContrato: "ativo",
  }),
];
const jul2026 = resolveValorMesGestaoComercial(
  rowsJul,
  { ...filtersBase, mes: 7 },
  2026,
  7,
  histMap
);
assert.equal(jul2026.valorFechado, 8000);
assert.equal(jul2026.origem, "sistema");
assert.notEqual(jul2026.valorFechado, 8000 + 99999);

// 4) Comparação junho x julho
const dashJul = buildGestaoComercialDashboard(
  rowsJul,
  { ...filtersBase, mes: 7 },
  historico
);
assert.equal(dashJul.valorFechado, 8000);
assert.equal(dashJul.comparacao.valorAnterior, 19700);
assert.equal(dashJul.comparacao.diferenca, 8000 - 19700);
assert.equal(dashJul.comparacao.origemAnterior, "historico_manual");
assert.equal(dashJul.comparacao.origemAtual, "sistema");

// 5) Mês histórico: cards sem detalhes
const dashJun = buildGestaoComercialDashboard([], filtersBase, historico);
assert.equal(dashJun.valorFechado, 19700);
assert.equal(dashJun.indicadoresDetalhadosDisponiveis, false);
assert.equal(dashJun.contratosFechados, 0);
assert.equal(dashJun.rows.length, 0);
assert.ok(dashJun.mensagemDetalhesIndisponiveis);

// 6) Série 2026: jun histórico, jul real
const serieJun = dashJul.serieMensalAno.find((s) => s.mes === 6);
const serieJul = dashJul.serieMensalAno.find((s) => s.mes === 7);
assert.equal(serieJun?.origem, "historico_manual");
assert.equal(serieJun?.valorFechado, 19700);
assert.equal(serieJul?.origem, "sistema");
assert.equal(serieJul?.valorFechado, 8000);

// 7) Prioridade real vs histórico no mesmo mês
const conflito = resolveValorMesGestaoComercial(
  [
    base({
      aprovacaoId: "c1",
      aprovadoEm: "2026-06-10T10:00:00.000Z",
      valorFechado: 500,
    }),
  ],
  filtersBase,
  2026,
  6,
  histMap
);
assert.equal(conflito.valorFechado, 500);
assert.equal(conflito.origem, "sistema");

// 8) Total anual sem duplicidade
assert.ok(dashJul.totalAnualValor >= 19700 + 8000 - 0.01);

// Regressão: ativos excluem encerrados
const rows: GestaoComercialFechamentoRow[] = [
  base({
    aprovacaoId: "1",
    aprovadoEm: "2026-08-05T10:00:00.000Z",
    valorFechado: 1400,
    origem: "google",
    statusContrato: "ativo",
  }),
  base({
    aprovacaoId: "2",
    aprovadoEm: "2026-08-12T10:00:00.000Z",
    valorFechado: 2000,
    origem: "renovacao",
    statusContrato: "encerrado",
  }),
  base({
    aprovacaoId: "3",
    aprovadoEm: "2026-07-20T10:00:00.000Z",
    valorFechado: 1000,
    origem: "indicacao",
    statusContrato: "ativo",
  }),
];

const dashAtivos = buildGestaoComercialDashboard(
  rows,
  {
    ...filtersBase,
    mes: 8,
  },
  historico
);

assert.equal(dashAtivos.contratosFechados, 1, "só o ativo");
assert.equal(dashAtivos.valorFechado, 1400);
assert.equal(dashAtivos.indicadoresDetalhadosDisponiveis, true);
assert.equal(dashAtivos.novosClientes, 1);
assert.equal(dashAtivos.renovacoes, 0);
assert.equal(dashAtivos.contratosEncerrados, 1, "card separado");
assert.equal(dashAtivos.ticketMedio, 1400);

const ago = dashAtivos.serieMensalAno.find((s) => s.mes === 8);
assert.ok(ago);
assert.equal(ago!.valorFechado, 1400);
assert.equal(ago!.quantidade, 1);

// 9) Histórico 2023/2024: evolução e comparação sem contratos fictícios
const historicoCompleto: GestaoComercialHistoricoMensal[] = [
  ...historico,
  { ano: 2023, mes: 1, valorFechado: 32480.5, origemDado: "historico_manual" },
  { ano: 2023, mes: 3, valorFechado: 46910, origemDado: "historico_manual" },
  { ano: 2024, mes: 1, valorFechado: 18455, origemDado: "historico_manual" },
  { ano: 2024, mes: 4, valorFechado: 43835, origemDado: "historico_manual" },
];
const dash2024 = buildGestaoComercialDashboard(
  [],
  { ...filtersBase, ano: 2024, mes: 1 },
  historicoCompleto
);
assert.equal(dash2024.valorFechado, 18455);
assert.equal(dash2024.origemValorPeriodo, "historico_manual");
assert.equal(dash2024.indicadoresDetalhadosDisponiveis, false);
assert.equal(dash2024.rows.length, 0);
assert.equal(dash2024.anoComparacaoA, 2023);
assert.equal(dash2024.anoComparacaoB, 2024);
const janCmp = dash2024.serieComparacaoAnual.find((s) => s.mes === 1);
assert.equal(janCmp?.valorAnoA, 32480.5);
assert.equal(janCmp?.valorAnoB, 18455);
assert.equal(janCmp?.origemAnoA, "historico_manual");
assert.equal(janCmp?.origemAnoB, "historico_manual");
const serieMar2023 = dash2024.serieMensalAno.find((s) => s.mes === 1);
assert.equal(serieMar2023?.valorFechado, 18455);

const dash2026Cmp = buildGestaoComercialDashboard(
  rowsJul,
  { ...filtersBase, mes: 7 },
  historicoCompleto
);
assert.equal(dash2026Cmp.anoComparacaoA, 2025);
assert.equal(dash2026Cmp.anoComparacaoB, 2026);

// 10) Evolução anual executiva

const seedAnual: GestaoComercialHistoricoMensal[] = [
  // 2023
  ...[32480.5, 37766, 46910, 8200, 9655, 11240, 10070, 17095, 6075, 15775, 15985, 19120].map(
    (v, i) => ({
      ano: 2023,
      mes: i + 1,
      valorFechado: v,
      origemDado: "historico_manual" as const,
    })
  ),
  // 2024
  ...[18455, 22746, 16390, 43835, 9790, 6125, 19645, 22020, 11589, 20000, 8500, 17370].map(
    (v, i) => ({
      ano: 2024,
      mes: i + 1,
      valorFechado: v,
      origemDado: "historico_manual" as const,
    })
  ),
  // 2025
  ...[25910, 25646, 16980, 36785, 23300, 20300, 33600, 39150, 26900, 25400, 29295, 40000].map(
    (v, i) => ({
      ano: 2025,
      mes: i + 1,
      valorFechado: v,
      origemDado: "historico_manual" as const,
    })
  ),
  // 2026 jan-jun
  ...[40900, 37426, 26070, 56550, 18525, 19700].map((v, i) => ({
    ano: 2026,
    mes: i + 1,
    valorFechado: v,
    origemDado: "historico_manual" as const,
  })),
];

const nowAgo = new Date(Date.UTC(2026, 7, 6)); // 6 ago 2026
const evo = buildEvolucaoAnualGestaoComercial(
  [],
  filtersBase,
  seedAnual,
  nowAgo
);
assert.deepEqual(evo.anosDisponiveis, [2023, 2024, 2025, 2026]);
assert.equal(evo.melhorAnoCompleto?.ano, 2025);
assert.equal(evo.melhorAnoCompleto?.valor, 343266);
assert.equal(evo.crescimentoUltimosCompletos?.anoRecente, 2025);
assert.equal(evo.crescimentoUltimosCompletos?.anoAnterior, 2024);

const p2023 = evo.pontosAnuais.find((p) => p.ano === 2023)!;
const p2024 = evo.pontosAnuais.find((p) => p.ano === 2024)!;
const p2025 = evo.pontosAnuais.find((p) => p.ano === 2025)!;
const p2026 = evo.pontosAnuais.find((p) => p.ano === 2026)!;
assert.equal(p2023.parcial, false);
assert.equal(p2024.parcial, false);
assert.equal(p2025.parcial, false);
assert.equal(p2026.parcial, true);
assert.equal(p2023.valorTotal, 230371.5);
assert.equal(p2024.valorTotal, 216465);
assert.equal(p2025.valorTotal, 343266);
assert.equal(p2026.valorTotal, 199171); // só até jun no seed; sem jul/ago históricos
assert.equal(p2026.mesAte, 6);
assert.equal(p2026.periodoLabel, labelPeriodoAteMes(6));

// Comparação mesmo período: jan-jun 2026 vs jan-jun 2025
const janJun2025 = 25910 + 25646 + 16980 + 36785 + 23300 + 20300;
assert.equal(evo.anoAtualVsMesmoPeriodo?.mesAte, 6);
assert.equal(evo.anoAtualVsMesmoPeriodo?.valorAtual, 199171);
assert.equal(evo.anoAtualVsMesmoPeriodo?.valorAnterior, janJun2025);

// Acumulado: fev 2025 = jan+fev
const fev2025 = evo.acumuladoMensal.find((m) => m.mes === 2)!;
assert.equal(fev2025.porAno[2025], 25910 + 25646);
// Meses futuros de 2026 = null
const set2026 = evo.acumuladoMensal.find((m) => m.mes === 9)!;
assert.equal(set2026.porAno[2026], null);
assert.ok(set2026.porAno[2025] != null);

console.log("test-gestao-comercial: OK");
