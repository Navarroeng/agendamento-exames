/**
 * Mensalidades previstas da Gestão Comercial, pelo vencimento.
 * Executar: npx tsx scripts/test-gestao-comercial-mensalidades.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildGestaoComercialDashboard,
  type GestaoComercialFechamentoRow,
  type GestaoComercialFilters,
} from "../lib/gestao-comercial";
import {
  montarMensalidadesPrevistas,
  periodoVencimentoGestaoComercial,
  type FonteMensalidadePrevista,
  type PeriodoVencimentoMensalidades,
} from "../lib/gestao-comercial-mensalidades";
import type { ParcelaMensalidadeRegistrada } from "../lib/mensalidade-parcelas";

const HOJE = "2026-11-01";

function filters(
  partial: Partial<GestaoComercialFilters> = {}
): GestaoComercialFilters {
  return {
    ano: 2026,
    mes: 10,
    periodoInicio: "",
    periodoFim: "",
    responsavel: "",
    origem: "",
    tipo: "",
    statusContrato: "ativos",
    usarPeriodoPersonalizado: false,
    ...partial,
  };
}

function mes(ano: number, mesRef: number): PeriodoVencimentoMensalidades {
  return { tipo: "mes", ano, mes: mesRef };
}

function parcela(
  partial: Partial<ParcelaMensalidadeRegistrada> &
    Pick<ParcelaMensalidadeRegistrada, "vigenciaInicio" | "numero" | "vencimentoIso" | "valor">
): ParcelaMensalidadeRegistrada {
  return {
    pagoEmIso: null,
    ...partial,
  };
}

function fonte(
  partial: Partial<FonteMensalidadePrevista> = {}
): FonteMensalidadePrevista {
  return {
    aprovacaoId: "jet",
    clienteNome: "JET SERVICE",
    numeroOrcamento: "ORC-JET",
    modalidade: "mensalidade",
    mensalidadePagamento: "mensal",
    diaVencimento: 10,
    valorMensal: 170,
    valorFinal: 2000,
    vigencias: [
      {
        inicio: "2026-10-14",
        fim: "2027-10-14",
        numeroContrato: "CTR-JET",
      },
    ],
    parcelasRegistradas: [],
    ...partial,
  };
}

function previsto(
  fontes: FonteMensalidadePrevista[],
  periodo: PeriodoVencimentoMensalidades
) {
  return montarMensalidadesPrevistas(fontes, periodo, HOJE);
}

function somaDetalhe(
  resumo: ReturnType<typeof montarMensalidadesPrevistas>
): number {
  const cents = resumo.linhas
    .filter((linha) => linha.compoeTotal)
    .reduce((acc, linha) => acc + Math.round((linha.valor ?? 0) * 100), 0);
  return cents / 100;
}

const jetOutubro = previsto([fonte()], mes(2026, 10));
assert.equal(jetOutubro.valor, 0);
assert.equal(jetOutubro.contratosComParcela, 0);
assert.equal(jetOutubro.linhas.filter((linha) => linha.compoeTotal).length, 0);
assert.equal(jetOutubro.periodoLabel, "Outubro/2026");

const jetNovembro = previsto([fonte()], mes(2026, 11));
assert.equal(jetNovembro.valor, 170);
assert.equal(jetNovembro.contratosComParcela, 1);
assert.equal(jetNovembro.contratosLabel, "1 contrato com parcela no mês");
assert.equal(jetNovembro.linhas.filter((linha) => linha.compoeTotal).length, 1);
assert.equal(jetNovembro.linhas[0]?.vencimentoIso, "2026-11-10");
assert.equal(jetNovembro.linhas[0]?.valor, 170);
assert.equal(jetNovembro.linhas[0]?.situacao, "em_aberto");
assert.notEqual(jetNovembro.valor, 2000);
assert.notEqual(jetNovembro.valor, 2000 / 12);

let mesesComParcela = 0;
let somaDoze = 0;
for (let offset = 0; offset < 14; offset += 1) {
  const data = new Date(2026, 9 + offset, 1);
  const item = previsto(
    [fonte()],
    mes(data.getFullYear(), data.getMonth() + 1)
  );
  if (item.valor === 0) continue;
  assert.equal(item.valor, 170);
  mesesComParcela += 1;
  somaDoze += item.valor;
}
assert.equal(mesesComParcela, 12);
assert.equal(somaDoze, 2040);
assert.equal(previsto([fonte()], mes(2027, 11)).valor, 0);

const setembro = fonte({
  aprovacaoId: "setembro",
  clienteNome: "Cliente de setembro",
  numeroOrcamento: "ORC-SET",
  valorMensal: 250,
  vigencias: [
    {
      inicio: "2026-09-02",
      fim: "2027-09-02",
      numeroContrato: "CTR-SET",
    },
  ],
});
assert.equal(previsto([setembro], mes(2026, 9)).valor, 0);
const outubroSetembro = previsto([setembro], mes(2026, 10));
assert.equal(outubroSetembro.valor, 250);
assert.equal(outubroSetembro.linhas[0]?.vencimentoIso, "2026-10-10");
assert.equal(outubroSetembro.contratosLabel, "1 contrato com parcela no mês");

const avista = fonte({
  aprovacaoId: "avista",
  mensalidadePagamento: "avista",
  parcelasRegistradas: [
    parcela({
      vigenciaInicio: "2026-10-14",
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 170,
    }),
  ],
});
assert.equal(previsto([avista], mes(2026, 11)).valor, 0);
assert.equal(previsto([avista], mes(2026, 11)).linhas.length, 0);

const pontual = fonte({
  aprovacaoId: "pontual",
  clienteNome: "Pontual parcelado",
  modalidade: "pontual",
  mensalidadePagamento: "mensal",
  valorMensal: 300,
  valorFinal: 900,
  parcelasRegistradas: [
    parcela({
      vigenciaInicio: "2026-10-14",
      numero: 2,
      vencimentoIso: "2026-11-10",
      valor: 300,
    }),
  ],
});
assert.equal(previsto([pontual], mes(2026, 11)).valor, 0);
assert.equal(previsto([pontual], mes(2026, 11)).linhas.length, 0);

const exame = fonte({
  aprovacaoId: "exame",
  clienteNome: "Exame avulso",
  modalidade: null,
  mensalidadePagamento: null,
  valorFinal: 400,
});
assert.equal(previsto([exame], mes(2026, 11)).linhas.length, 0);

const paga = fonte({
  aprovacaoId: "paga",
  clienteNome: "Alfa",
  numeroOrcamento: "ORC-A",
  vigencias: [
    { inicio: "2026-10-14", fim: "2027-10-14", numeroContrato: "CTR-A" },
  ],
  parcelasRegistradas: [
    parcela({
      vigenciaInicio: "2026-10-14",
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 170,
      pagoEmIso: "2026-11-05",
    }),
  ],
});
const aberta = fonte({
  aprovacaoId: "aberta",
  clienteNome: "Beta",
  numeroOrcamento: "ORC-B",
  valorMensal: 90,
  diaVencimento: 20,
  vigencias: [
    { inicio: "2026-10-01", fim: "2027-10-01", numeroContrato: "CTR-B" },
  ],
});
const misto = previsto([paga, aberta], mes(2026, 11));
assert.equal(misto.valor, 260);
assert.equal(misto.contratosComParcela, 2);
assert.equal(misto.contratosLabel, "2 contratos com parcela no mês");
assert.deepEqual(
  misto.linhas.filter((linha) => linha.compoeTotal).map((linha) => linha.situacao),
  ["paga", "em_aberto"]
);
assert.equal(misto.valor, somaDetalhe(misto));

const negociada = fonte({
  parcelasRegistradas: [
    parcela({
      vigenciaInicio: "2026-10-14",
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 180,
    }),
  ],
});
const negociadaResumo = previsto([negociada, { ...negociada }], mes(2026, 11));
assert.equal(negociadaResumo.valor, 180);
assert.equal(
  negociadaResumo.linhas.filter((linha) => linha.compoeTotal).length,
  1
);
assert.equal(negociadaResumo.valor, somaDetalhe(negociadaResumo));

const historico = fonte({
  aprovacaoId: "historico",
  clienteNome: "Contrato depois encerrado",
  valorMensal: 170,
  vigencias: [
    {
      inicio: "2025-10-14",
      fim: "2026-10-14",
      numeroContrato: "CTR-ANTIGO",
    },
    {
      inicio: "2026-09-02",
      fim: "2027-09-02",
      numeroContrato: "CTR-NOVO",
    },
  ],
  parcelasRegistradas: [
    parcela({
      vigenciaInicio: "2025-10-14",
      numero: 12,
      vencimentoIso: "2026-10-10",
      valor: 100,
      pagoEmIso: "2026-10-10",
    }),
  ],
});
const outubroHistorico = previsto([historico], mes(2026, 10));
assert.equal(outubroHistorico.valor, 270);
assert.equal(outubroHistorico.contratosComParcela, 1);
assert.equal(outubroHistorico.linhas.filter((linha) => linha.compoeTotal).length, 2);
assert.equal(outubroHistorico.valor, somaDetalhe(outubroHistorico));
assert.ok(
  outubroHistorico.linhas.some(
    (linha) => linha.contrato === "CTR-ANTIGO" && linha.valor === 100 && linha.situacao === "paga"
  )
);
assert.ok(
  outubroHistorico.linhas.some(
    (linha) => linha.contrato === "CTR-NOVO" && linha.valor === 170
  )
);

const semDados = previsto(
  [
    fonte({
      aprovacaoId: "sem-dados",
      clienteNome: "Sem vigência",
      diaVencimento: null,
      valorMensal: null,
      valorFinal: null,
      vigencias: [],
      parcelasRegistradas: [],
    }),
  ],
  mes(2026, 11)
);
assert.equal(semDados.valor, 0);
assert.equal(semDados.pendencias, 1);
assert.equal(semDados.linhas.length, 1);
assert.equal(semDados.linhas[0]?.situacao, "pendencia");
assert.equal(semDados.linhas[0]?.valor, null);
assert.equal(semDados.linhas[0]?.compoeTotal, false);

const incompleta = fonte({
  aprovacaoId: "incompleta",
  diaVencimento: null,
  valorMensal: null,
  valorFinal: null,
  parcelasRegistradas: [
    parcela({
      vigenciaInicio: "2026-10-14",
      numero: 1,
      vencimentoIso: "2026-11-10",
      valor: 180,
    }),
  ],
});
const novembroIncompleto = previsto([incompleta], mes(2026, 11));
assert.equal(novembroIncompleto.valor, 180);
assert.equal(novembroIncompleto.pendencias, 1);
assert.equal(novembroIncompleto.valor, somaDetalhe(novembroIncompleto));
const outubroIncompleto = previsto([incompleta], mes(2026, 10));
assert.equal(outubroIncompleto.valor, 0);
assert.equal(outubroIncompleto.pendencias, 1);
assert.equal(
  outubroIncompleto.linhas.some((linha) => linha.compoeTotal && linha.valor != null),
  false
);

const diaInvalido = previsto(
  [fonte({ diaVencimento: 15, parcelasRegistradas: [] })],
  mes(2026, 11)
);
assert.equal(diaInvalido.valor, 0);
assert.equal(diaInvalido.pendencias, 1);
assert.equal(diaInvalido.linhas.every((linha) => linha.valor == null), true);

const intervalo = previsto([fonte()], {
  tipo: "intervalo",
  inicio: "2026-11-01",
  fim: "2026-11-30",
});
assert.equal(intervalo.valor, 170);
assert.equal(intervalo.periodoLabel, "01/11/2026 a 30/11/2026");
assert.equal(intervalo.contratosLabel, "1 contrato com parcela no período");
assert.equal(
  previsto([fonte()], {
    tipo: "intervalo",
    inicio: "2026-10-01",
    fim: "2026-10-31",
  }).valor,
  0
);

assert.deepEqual(
  periodoVencimentoGestaoComercial(
    filters({ statusContrato: "ativos", responsavel: "", tipo: "" })
  ),
  periodoVencimentoGestaoComercial(
    filters({
      statusContrato: "encerrados",
      responsavel: "Ana",
      tipo: "renovacao",
      origem: "google",
    })
  )
);

const fechamento: GestaoComercialFechamentoRow = {
  aprovacaoId: "fechado-setembro",
  orcamentoId: "o-set",
  contratoId: "c-set",
  aprovadoEm: "2026-09-10T12:00:00.000Z",
  numeroOrcamento: "ORC-SET",
  numeroContrato: "CTR-SET",
  clienteNome: "Cliente de setembro",
  clienteCnpj: "00000000000191",
  origem: "google",
  responsavelNoFechamento: "Bruna",
  responsavelAproximado: false,
  quantidadeColaboradores: 8,
  valorOriginalOrcamento: 2000,
  valorFinalAprovado: 2000,
  valorFechado: 2000,
  usouValorOriginalFallback: false,
  formaPagamento: "parcelado",
  pagamentoLabel: "12x de R$ 250,00",
  condicaoPagamento: "12 mensalidades",
  statusContrato: "ativo",
  statusExibicao: "Ativo",
  statusFinanceiro: null,
  orcamentoStatus: "aprovado",
};
const dash = buildGestaoComercialDashboard([fechamento], filters({ mes: 9 }), []);
assert.equal(dash.valorFechado, 2000);
assert.equal(dash.ticketMedio, 2000);
assert.equal(dash.contratosFechados, 1);

const root = process.cwd();
const hook = readFileSync(join(root, "hooks/useGestaoComercialPage.ts"), "utf8");
const cards = readFileSync(
  join(root, "components/gestao-comercial/GestaoComercialCards.tsx"),
  "utf8"
);
const modal = readFileSync(
  join(root, "components/gestao-comercial/GestaoComercialMensalidadesModal.tsx"),
  "utf8"
);
const service = readFileSync(
  join(root, "services/gestao-comercial.service.ts"),
  "utf8"
);
const fonteService = service.slice(
  service.indexOf("export async function listarFontesMensalidadesPrevistas")
);
const lib = readFileSync(
  join(root, "lib/gestao-comercial-mensalidades.ts"),
  "utf8"
);

assert.match(hook, /montarMensalidadesPrevistas\(fontesMensalidades/);
assert.doesNotMatch(hook, /fontesMensalidades\.filter/);
assert.match(cards, /Mensalidades previstas/);
assert.match(cards, /Por vencimento da mensalidade/);
assert.match(cards, /formatCurrency\(resumo\.valor\)/);
assert.match(modal, /Total previsto/);
assert.match(modal, /formatCurrency\(resumo\.valor\)/);
assert.match(modal, />Cliente</);
assert.match(modal, />Contrato</);
assert.match(modal, />Parcela</);
assert.match(modal, />Vencimento</);
assert.match(modal, />Valor</);
assert.match(modal, />Situação</);
assert.doesNotMatch(fonteService, /\.insert\(|\.update\(|\.delete\(/);
assert.doesNotMatch(fonteService, /from\("faturas"\)/);
assert.match(fonteService, /orcamento_mensalidade_parcelas/);
assert.doesNotMatch(fonteService, /\.eq\(\s*"status"|\.not\(\s*"status"/);
assert.doesNotMatch(lib, /\.insert\(|\.update\(|\.delete\(/);
assert.doesNotMatch(lib, /\/\s*12/);

console.log("test-gestao-comercial-mensalidades: OK");
