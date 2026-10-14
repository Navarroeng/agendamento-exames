/**
 * Contrato documental do Laudo de Parecer Técnico.
 * Não integra o fluxo operacional do Laudo de Insalubridade
 * nem o contrato SST. Textos próprios deste serviço.
 */

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  CONTRATO_AET_FECHO,
  NAVARRO_CONTRATO_AET,
  redigirContratadaAet,
  redigirContratanteAet,
} from "@/lib/contrato-aet";
import {
  montarParcelasPontual,
  type ContratoParcela,
} from "@/lib/contrato-pagamento";
import type {
  ContratoClausula,
  ContratoParteContratante,
} from "@/lib/contrato-navarro";
import { formatMoedaComExtenso, numeroPorExtenso } from "@/lib/extenso";
import { formatCurrency } from "@/lib/money";
import {
  formatCondicaoParcelasCentavos,
  parecerMostraAlternativaAvista,
  parseQuantidadeParcelasInteira,
  PARECER_TECNICO_INCLUSOS_ITENS,
} from "@/lib/servico-parecer-tecnico";
import type { ServicoItemRef } from "@/lib/servico-treinamentos";

export const CONTRATO_PARECER_TITULO =
  "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ASSISTÊNCIA TÉCNICA E ELABORAÇÃO DE PARECER TÉCNICO";

export const CONTRATO_PARECER_TITULO_LINHAS = [
  "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE",
  "ASSISTÊNCIA TÉCNICA E ELABORAÇÃO DE",
  "PARECER TÉCNICO",
] as const;

export const PARECER_PAGAMENTO_ESCOLHA_PENDENTE_MSG =
  "Selecione a condição de pagamento acordada — parcelado ou à vista — antes de gerar o contrato.";

export const PARECER_AVISTA_INVALIDO_MSG =
  "O desconto à vista está marcado, mas o valor à vista salvo é inválido. Ajuste o orçamento antes de gerar o contrato.";

export type ParecerPagamentoEscolhido = "parcelado" | "avista";

export type ParecerOrcamentoPagamento = {
  oferecer_desconto_avista?: boolean | null;
  valor_avista?: number | null;
  valor_total?: number | null;
  quantidade_parcelas?: number | null;
  parecer_pagamento_escolhido?: string | null;
  orcamento_itens?: ServicoItemRef[] | null;
};

export function lerParecerPagamentoEscolhido(
  value: string | null | undefined
): ParecerPagamentoEscolhido | null {
  return value === "parcelado" || value === "avista" ? value : null;
}

function quantidadeParcelasRedacao(quantidade: number): string {
  const n = Math.max(1, Math.floor(quantidade) || 1);
  if (n === 1) return "1 (uma) parcela";
  const extenso = numeroPorExtenso(n) === "dois" ? "duas" : numeroPorExtenso(n);
  return `${n} (${extenso}) parcelas`;
}

export function qualificacaoContratoParecer(
  contratante: ContratoParteContratante
): { titulo: string; paragrafos: string[] } {
  return {
    titulo: "QUALIFICAÇÃO",
    paragrafos: [
      `CONTRATADA: ${redigirContratadaAet()}`,
      `CONTRATANTE: ${redigirContratanteAet(contratante)}`,
      "As partes acima identificadas celebram o presente Contrato de Prestação de Serviços de Assistência Técnica e Elaboração de Parecer Técnico, mediante as cláusulas e condições seguintes.",
    ],
  };
}

export function resolverPagamentoContratoParecer(params: {
  orcamento: ParecerOrcamentoPagamento;
  dataContrato: string;
}): {
  pendente: string | null;
  forma: ParecerPagamentoEscolhido;
  valor: number;
  parcelas: ContratoParcela[];
} {
  const total = Number(params.orcamento.valor_total) || 0;
  const quantidade =
    parseQuantidadeParcelasInteira(params.orcamento.quantidade_parcelas) ?? 1;
  const oferece = parecerMostraAlternativaAvista(params.orcamento);
  const marcado = params.orcamento.oferecer_desconto_avista === true;

  if (marcado && !oferece) {
    return {
      pendente: PARECER_AVISTA_INVALIDO_MSG,
      forma: "parcelado",
      valor: total,
      parcelas: montarParcelasPontual({
        valorTotal: total,
        quantidadeParcelas: quantidade,
        dataContrato: params.dataContrato,
      }),
    };
  }

  if (!oferece) {
    return {
      pendente: null,
      forma: "parcelado",
      valor: total,
      parcelas: montarParcelasPontual({
        valorTotal: total,
        quantidadeParcelas: quantidade,
        dataContrato: params.dataContrato,
      }),
    };
  }

  const escolha = lerParecerPagamentoEscolhido(
    params.orcamento.parecer_pagamento_escolhido
  );
  if (!escolha) {
    return {
      pendente: PARECER_PAGAMENTO_ESCOLHA_PENDENTE_MSG,
      forma: "parcelado",
      valor: total,
      parcelas: montarParcelasPontual({
        valorTotal: total,
        quantidadeParcelas: quantidade,
        dataContrato: params.dataContrato,
      }),
    };
  }

  if (escolha === "avista") {
    const valor = Number(params.orcamento.valor_avista) || 0;
    return {
      pendente: null,
      forma: "avista",
      valor,
      parcelas: montarParcelasPontual({
        valorTotal: valor,
        quantidadeParcelas: 1,
        dataContrato: params.dataContrato,
      }),
    };
  }

  return {
    pendente: null,
    forma: "parcelado",
    valor: total,
    parcelas: montarParcelasPontual({
      valorTotal: total,
      quantidadeParcelas: quantidade,
      dataContrato: params.dataContrato,
    }),
  };
}

export function condicaoAprovadaParecer(params: {
  forma: ParecerPagamentoEscolhido;
  valorTotal: number;
  valorAvista: number;
  quantidadeParcelas: number;
}): {
  valor_final: number;
  condicao_pagamento: string;
  quantidade_parcelas: number;
  valor_parcela: number;
  valor_avista: number | null;
  desconto_percentual: 0;
} {
  if (params.forma === "avista") {
    return {
      valor_final: params.valorAvista,
      condicao_pagamento: "À vista",
      quantidade_parcelas: 1,
      valor_parcela: params.valorAvista,
      valor_avista: params.valorAvista,
      desconto_percentual: 0,
    };
  }
  const parcelas = montarParcelasPontual({
    valorTotal: params.valorTotal,
    quantidadeParcelas: params.quantidadeParcelas,
    dataContrato: "2026-01-01",
  });
  return {
    valor_final: params.valorTotal,
    condicao_pagamento: formatCondicaoParcelasCentavos(
      params.valorTotal,
      params.quantidadeParcelas
    ),
    quantidade_parcelas: Math.max(1, parcelas.length),
    valor_parcela: parcelas[0]?.valor ?? params.valorTotal,
    valor_avista: null,
    desconto_percentual: 0,
  };
}

export type ContratoParecerContexto = {
  numeroOrcamento: string;
  contratante: ContratoParteContratante;
  forma: ParecerPagamentoEscolhido;
  valor: number;
  parcelas: ContratoParcela[];
};

export function buildClausulasContratoParecer(
  ctx: ContratoParecerContexto
): ContratoClausula[] {
  const numero = ctx.numeroOrcamento.trim();
  const parcelas = ctx.parcelas;
  const n = Math.max(1, parcelas.length || 1);
  const valoresIguais =
    parcelas.length > 0 &&
    parcelas.every((p) => p.valorCentavos === parcelas[0]?.valorCentavos);
  const valorParcelaRef = parcelas[0]?.valor ?? ctx.valor;
  const condicao =
    ctx.forma === "avista"
      ? `O pagamento será realizado à vista, em ${quantidadeParcelasRedacao(1)} de ${formatMoedaComExtenso(ctx.valor)}, conforme a seguinte condição:`
      : valoresIguais
        ? `O pagamento será realizado em ${quantidadeParcelasRedacao(n)} de ${formatMoedaComExtenso(valorParcelaRef)}, conforme a seguinte condição:`
        : `O pagamento será realizado em ${quantidadeParcelasRedacao(n)}, conforme a seguinte condição:`;

  return [
    {
      numero: "1",
      titulo: "DO OBJETO",
      paragrafos: [
        `O presente contrato tem por objeto a prestação de assistência técnica em perícia oriunda de ação trabalhista, destinada à avaliação técnica de trabalho em condições insalubres, conforme a Proposta Comercial nº ${numero}, que integra este instrumento.`,
        "A CONTRATADA atua como assistente técnica da CONTRATANTE. O parecer técnico elaborado nos termos deste contrato não equivale ao laudo do perito nomeado pelo juízo.",
        "As conclusões técnicas decorrerão da avaliação realizada e das informações disponibilizadas pela CONTRATANTE. Este contrato não assegura resultado favorável na ação, nem o reconhecimento ou o afastamento de insalubridade.",
      ],
    },
    {
      numero: "2",
      titulo: "DOS SERVIÇOS INCLUSOS",
      paragrafos: [
        "O escopo contratado compreende exclusivamente:",
      ],
      itens: [...PARECER_TECNICO_INCLUSOS_ITENS],
      paragrafosApos: [
        `Não integram este contrato, salvo se expressamente previstos na Proposta Comercial nº ${numero}: novas perícias, impugnações, esclarecimentos posteriores e avaliações complementares.`,
      ],
    },
    {
      numero: "3",
      titulo: "DA PERÍCIA",
      paragrafos: [
        "A CONTRATANTE deverá fornecer os documentos e as informações necessários à execução dos serviços e comunicar à CONTRATADA as datas da perícia tão logo as conheça.",
        "O acompanhamento da perícia observará a data, o local e as demais informações processuais comunicados pela CONTRATANTE.",
        "Caso a perícia não ocorra na data informada, as partes ajustarão o acompanhamento conforme o novo calendário comunicado pela CONTRATANTE.",
      ],
    },
    {
      numero: "4",
      titulo: "DAS OBRIGAÇÕES DA CONTRATADA",
      paragrafos: [
        "Compete à CONTRATADA:",
        "a) executar os serviços previstos neste contrato e na proposta comercial;",
        "b) elaborar os quesitos técnicos abrangidos pelo escopo contratado;",
        "c) acompanhar a perícia trabalhista abrangida por este contrato;",
        "d) elaborar o laudo de parecer técnico;",
        "e) atuar como assistente técnica da CONTRATANTE, sem substituir o perito nomeado pelo juízo;",
        "f) entregar o documento final em formato digital.",
      ],
    },
    {
      numero: "5",
      titulo: "DAS OBRIGAÇÕES DA CONTRATANTE",
      paragrafos: [
        "Compete à CONTRATANTE:",
        "a) fornecer documentos e informações verdadeiros e suficientes para a execução dos serviços;",
        "b) disponibilizar os documentos e as informações solicitados pela CONTRATADA;",
        "c) comunicar as datas da perícia e as informações de local e de prazo processual assim que as conhecer;",
        "d) indicar pessoa de contato para os esclarecimentos necessários à execução;",
        "e) efetuar os pagamentos nas condições estabelecidas neste contrato.",
      ],
    },
    {
      numero: "6",
      titulo: "DO VALOR E DA FORMA DE PAGAMENTO",
      paragrafos: [
        "Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor de:",
        `${formatMoedaComExtenso(ctx.valor)}.`,
        condicao,
      ],
      tabela: {
        colunas: ["PARCELA", "VALOR", "VENCIMENTO"],
        linhas: parcelas.map((p) => [
          String(p.indice),
          formatCurrency(p.valor),
          formatDateIsoToBR(p.dataIso),
        ]),
      },
      paragrafosApos: [
        "Em caso de atraso, incidirão multa de 2% sobre o valor em atraso e juros de 1% ao mês, calculados proporcionalmente ao período de inadimplência.",
      ],
    },
    {
      numero: "7",
      titulo: "DO PRAZO DE EXECUÇÃO",
      paragrafos: [
        "A elaboração dos quesitos, o acompanhamento da perícia e a entrega do parecer observarão as datas da perícia e os prazos processuais comunicados pela CONTRATANTE.",
        "Este contrato não fixa prazo de entrega em dias, porque a execução depende do calendário da perícia e do prazo processual informados pela CONTRATANTE.",
        "A falta de documentos, de informações ou da comunicação tempestiva das datas da perícia pode alterar o tempo de execução.",
      ],
    },
    {
      numero: "8",
      titulo: "DAS ALTERAÇÕES DE ESCOPO",
      paragrafos: [
        "Este contrato contempla exclusivamente o escopo definido na proposta comercial aprovada.",
        "Novas perícias, impugnações, esclarecimentos posteriores, avaliações complementares ou outros serviços não previstos na proposta comercial poderão ser objeto de orçamento complementar.",
      ],
    },
    {
      numero: "9",
      titulo: "DA RESPONSABILIDADE PELAS INFORMAÇÕES",
      paragrafos: [
        "As conclusões técnicas serão elaboradas com base na avaliação realizada e nas informações e documentos disponibilizados pela CONTRATANTE.",
        "A CONTRATADA não responde pelo resultado da ação, pelo reconhecimento ou pelo afastamento de insalubridade, nem pelas decisões do juízo ou do perito nomeado.",
      ],
    },
    {
      numero: "10",
      titulo: "DA CONFIDENCIALIDADE E PROTEÇÃO DE DADOS",
      paragrafos: [
        "As partes comprometem-se a manter a confidencialidade das informações técnicas, comerciais e demais dados a que tiverem acesso em razão da execução deste contrato.",
        "Quando houver tratamento de dados pessoais durante a prestação dos serviços, as partes deverão observar a legislação aplicável à proteção de dados pessoais, inclusive a Lei nº 13.709/2018 – Lei Geral de Proteção de Dados Pessoais (LGPD).",
      ],
    },
    {
      numero: "11",
      titulo: "DA RESCISÃO",
      paragrafos: [
        "O contrato poderá ser rescindido por qualquer das partes em caso de descumprimento das obrigações assumidas, sem prejuízo da cobrança dos valores correspondentes aos serviços já executados.",
        "Caso a CONTRATANTE solicite o cancelamento após o início da execução dos serviços, os serviços efetivamente realizados até a data do cancelamento poderão ser cobrados proporcionalmente.",
      ],
    },
    {
      numero: "12",
      titulo: "DAS DISPOSIÇÕES GERAIS",
      paragrafos: [
        "A atuação da CONTRATADA como assistente técnica não a substitui no polo da ação e não transfere à CONTRATADA a responsabilidade pelas providências processuais, administrativas ou de cumprimento de decisão que caibam à CONTRATANTE.",
        "Serviços, avaliações ou atividades não expressamente previstos na proposta comercial não integram automaticamente o objeto deste contrato.",
        `A Proposta Comercial nº ${numero} integra o presente instrumento e deverá ser considerada em conjunto com estas cláusulas.`,
      ],
    },
    {
      numero: "13",
      titulo: "DO FORO",
      paragrafos: [
        "Fica eleito o foro da Comarca de São Paulo/SP, com renúncia a qualquer outro, por mais privilegiado que seja, para dirimir questões decorrentes deste contrato.",
      ],
    },
  ];
}

export const CONTRATO_PARECER_FECHO = CONTRATO_AET_FECHO;
export const NAVARRO_CONTRATO_PARECER = NAVARRO_CONTRATO_AET;
