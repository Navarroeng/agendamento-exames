/** Smoke: camada única Gestão Comercial (exclui encerrados/cancelados). */
import assert from "node:assert/strict";
import {
  buildGestaoComercialDashboard,
  calcComparacaoMes,
  isContratoContabilizavel,
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
  orcamentoStatus: partial.orcamentoStatus ?? "aprovado",
});

assert.equal(
  isContratoContabilizavel({ statusContrato: "ativo", orcamentoStatus: "aprovado" }),
  true
);
assert.equal(
  isContratoContabilizavel({
    statusContrato: "encerrado",
    orcamentoStatus: "aprovado",
  }),
  false
);
assert.equal(
  isContratoContabilizavel({
    statusContrato: "ativo",
    orcamentoStatus: "contrato_encerrado",
  }),
  false
);
assert.equal(
  isContratoContabilizavel({
    statusContrato: null,
    orcamentoStatus: "cancelado",
  }),
  false
);

assert.deepEqual(resolveValorFechado(1400, 1500), {
  valor: 1400,
  usouFallback: false,
});
assert.equal(calcComparacaoMes(1000, 0).tendencia, "sem_base");
assert.equal(calcComparacaoMes(20000, 16000).percentual, 25);

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

const dashAtivos = buildGestaoComercialDashboard(rows, {
  ano: 2026,
  mes: 8,
  periodoInicio: "",
  periodoFim: "",
  responsavel: "",
  origem: "",
  tipo: "",
  statusContrato: "ativos",
  usarPeriodoPersonalizado: false,
});

assert.equal(dashAtivos.contratosFechados, 1, "só o ativo");
assert.equal(dashAtivos.valorFechado, 1400);
assert.equal(dashAtivos.novosClientes, 1);
assert.equal(dashAtivos.renovacoes, 0);
assert.equal(dashAtivos.contratosEncerrados, 1, "card separado");
assert.equal(dashAtivos.ticketMedio, 1400);
assert.equal(
  dashAtivos.rows.reduce((s, r) => s + r.valorFechado, 0),
  dashAtivos.valorFechado
);

const ago = dashAtivos.serieMensalAno.find((s) => s.mes === 8);
assert.ok(ago);
assert.equal(ago!.valorFechado, 1400);
assert.equal(ago!.quantidade, 1);

const dashEnc = buildGestaoComercialDashboard(rows, {
  ano: 2026,
  mes: 8,
  periodoInicio: "",
  periodoFim: "",
  responsavel: "",
  origem: "",
  tipo: "",
  statusContrato: "encerrados",
  usarPeriodoPersonalizado: false,
});
assert.equal(dashEnc.contratosFechados, 1);
assert.equal(dashEnc.valorFechado, 2000);
assert.equal(dashEnc.rows[0]?.statusContrato, "encerrado");

console.log("test-gestao-comercial: OK");
