/** Smoke: camada única Gestão Comercial. */
import assert from "node:assert/strict";
import {
  buildGestaoComercialDashboard,
  calcComparacaoMes,
  resolveValorFechado,
  type GestaoComercialFechamentoRow,
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
  orcamentoStatus: "aprovado",
});

// Fallback valor
assert.deepEqual(resolveValorFechado(1400, 1500), {
  valor: 1400,
  usouFallback: false,
});
assert.deepEqual(resolveValorFechado(0, 1500), {
  valor: 1500,
  usouFallback: true,
});

// Comparação sem base
assert.equal(calcComparacaoMes(1000, 0).tendencia, "sem_base");
assert.equal(calcComparacaoMes(20000, 16000).percentual, 25);

const rows: GestaoComercialFechamentoRow[] = [
  base({
    aprovacaoId: "1",
    aprovadoEm: "2026-08-05T10:00:00.000Z",
    valorFechado: 1400,
    origem: "google",
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
  }),
];

const dash = buildGestaoComercialDashboard(rows, {
  ano: 2026,
  mes: 8,
  periodoInicio: "",
  periodoFim: "",
  responsavel: "",
  origem: "",
  tipo: "",
  statusContrato: "",
  usarPeriodoPersonalizado: false,
});

assert.equal(dash.contratosFechados, 2);
assert.equal(dash.valorFechado, 3400);
assert.equal(dash.novosClientes, 1);
assert.equal(dash.renovacoes, 1);
assert.equal(dash.contratosEncerrados, 1);
assert.equal(
  dash.rows.reduce((s, r) => s + r.valorFechado, 0),
  dash.valorFechado,
  "tabela = cards"
);

const ago = dash.serieMensalAno.find((s) => s.mes === 8);
assert.ok(ago);
assert.equal(ago!.valorFechado, 3400);
assert.equal(ago!.quantidade, 2);

console.log("test-gestao-comercial: OK");
