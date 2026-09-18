import { NAVARRO_DADOS_BANCARIOS } from "@/lib/navarro-pagamento";
import { formatCNPJ } from "@/lib/cnpj";
import {
  formatMoedaComExtenso,
  formatNumeroComExtenso,
} from "@/lib/extenso";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  ORCAMENTO_MODALIDADE_MENSALIDADE,
  ORCAMENTO_MODALIDADE_PONTUAL,
  type OrcamentoModalidade,
} from "@/lib/orcamento-modalidade";
import type { ContratoParcela } from "@/lib/contrato-pagamento";

/** Dados institucionais oficiais da CONTRATADA — fonte única do contrato. */
export const NAVARRO_CONTRATO_INSTITUCIONAL = {
  razaoSocial: NAVARRO_DADOS_BANCARIOS.favorecido,
  cnpj: NAVARRO_DADOS_BANCARIOS.pixCnpj,
  endereco:
    "Rua Francisco Marengo, nº 500, Tatuapé, São Paulo/SP, CEP 03313-000",
  telefone: "(11) 3181-7697",
  whatsapp: "(11) 97706-5599",
  email: "contato@navarroeng.com.br",
  site: "www.navarroeng.com.br",
  foroComarca: "São Paulo, Estado de São Paulo",
  agradecimento:
    "Agradecemos a confiança em nossos serviços! Estamos à disposição para quaisquer esclarecimentos.",
} as const;

export const CONTRATO_ADICIONAL_PONTUAL = {
  admissionalCentavos: 10000,
  demissionalCentavos: 5000,
} as const;

export const CONTRATO_ADICIONAL_MENSALIDADE = {
  admissionalCentavos: 5000,
  demissionalCentavos: 5000,
} as const;

export const CONTRATO_INADIMPLENCIA = {
  multaPercentual: 2,
  jurosMesPercentual: 1,
  suspensaoAposDias: 10,
} as const;

export const CONTRATO_VIGENCIA_MENSALIDADE_MESES = 12;
export const CONTRATO_AVISO_PREVIO_DIAS = 30;

export type ContratoParteContratante = {
  razaoSocial: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  setor: string | null;
};

export type ContratoClausula = {
  numero: string;
  titulo: string;
  paragrafos: string[];
  /** Lista com marcadores (contrato AET, cláusula de inclusos). */
  itens?: string[];
};

export function rotuloClausulaContrato(
  clause: ContratoClausula,
  estilo: "sst" | "aet"
): string {
  if (estilo === "aet") {
    return `CLÁUSULA ${clause.numero}ª – ${clause.titulo}`;
  }
  return `CLÁUSULA ${clause.numero} — ${clause.titulo}`;
}

export type ContratoNavarroContexto = {
  modalidade: OrcamentoModalidade;
  numeroOrcamento: string;
  dataContrato: string;
  contratante: ContratoParteContratante;
  colaboradores: number;
  valor: number;
  condicaoPagamento: string | null;
  parcelas: ContratoParcela[];
  servicos: string[];
};

function joinExistentes(partes: Array<string | null | undefined>): string {
  return partes
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

export function redigirContratante(c: ContratoParteContratante): string {
  const nome = c.razaoSocial.trim() || "CONTRATANTE";
  const pedacos: string[] = [nome];
  if (c.endereco?.trim()) {
    pedacos.push(`com sede em ${c.endereco.trim()}`);
  }
  if (c.cnpj?.trim()) {
    pedacos.push(`inscrita no CNPJ sob nº ${formatCNPJ(c.cnpj)}`);
  }
  const contato = joinExistentes([
    c.telefone ? `telefone ${c.telefone.trim()}` : null,
    c.email ? `e-mail ${c.email.trim()}` : null,
  ]);
  if (contato) pedacos.push(`contato: ${contato}`);
  if (c.setor?.trim()) {
    pedacos.push(`atividade/setor ${c.setor.trim()}`);
  }
  return `${pedacos.join(", ")}, doravante denominada CONTRATANTE.`;
}

export function redigirContratada(): string {
  const n = NAVARRO_CONTRATO_INSTITUCIONAL;
  return `${n.razaoSocial}, inscrita no CNPJ sob nº ${n.cnpj}, com sede na ${n.endereco}, telefone ${n.telefone}, e-mail ${n.email}, doravante denominada CONTRATADA.`;
}

export function redigirObjeto(numeroOrcamento: string): string {
  return `Prestação de serviços técnicos de Saúde e Segurança do Trabalho (SST), compreendendo os serviços contratados e discriminados na Proposta Comercial nº ${numeroOrcamento}, que passa a integrar o presente instrumento para todos os fins.`;
}

function redigirColaboradores(quantidade: number): string {
  if (!Number.isFinite(quantidade) || quantidade < 1) {
    return "O valor contratado contempla o atendimento da quantidade de colaboradores prevista na proposta comercial.";
  }
  const n = Math.round(quantidade);
  const label = n === 1 ? "colaborador" : "colaboradores";
  return `O valor contratado contempla o atendimento de até ${formatNumeroComExtenso(n)} ${label}, conforme quantidade prevista na proposta comercial.`;
}

function redigirAdicionais(modalidade: OrcamentoModalidade): string[] {
  if (modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE) {
    return [
      `A inclusão de novo funcionário (admissional adicional) será cobrada no valor de ${formatMoedaComExtenso(CONTRATO_ADICIONAL_MENSALIDADE.admissionalCentavos / 100)}, por colaborador, além da mensalidade contratada.`,
      `O exame demissional adicional será cobrado no valor de ${formatMoedaComExtenso(CONTRATO_ADICIONAL_MENSALIDADE.demissionalCentavos / 100)}, por colaborador.`,
    ];
  }
  return [
    `A inclusão de novo funcionário (admissional adicional) será cobrada no valor de ${formatMoedaComExtenso(CONTRATO_ADICIONAL_PONTUAL.admissionalCentavos / 100)}, por colaborador.`,
    `O exame demissional será cobrado no valor de ${formatMoedaComExtenso(CONTRATO_ADICIONAL_PONTUAL.demissionalCentavos / 100)}, por colaborador.`,
  ];
}

function redigirPagamentoPontual(ctx: ContratoNavarroContexto): string[] {
  const total = formatMoedaComExtenso(ctx.valor);
  const n = ctx.parcelas.length;
  const intro = `A CONTRATANTE pagará à CONTRATADA o valor total de ${total}${
    ctx.condicaoPagamento?.trim()
      ? `, na condição de ${ctx.condicaoPagamento.trim()}`
      : ""
  }.`;
  if (n <= 1) {
    const unica = ctx.parcelas[0];
    return [
      intro,
      `O pagamento será realizado em parcela única no valor de ${formatMoedaComExtenso(unica?.valor ?? ctx.valor)}, com vencimento na data deste contrato (${formatDateIsoToBR(ctx.dataContrato)}).`,
    ];
  }
  const linhas = ctx.parcelas.map((p) => {
    return `${p.indice}ª parcela: ${formatMoedaComExtenso(p.valor)}, com vencimento em ${formatDateIsoToBR(p.dataIso)}.`;
  });
  return [
    intro,
    `O pagamento será realizado em ${formatNumeroComExtenso(n)} parcelas. A primeira parcela vence na data deste contrato; as demais vencem mensalmente, no mesmo dia, nos meses subsequentes, observando-se o último dia válido do mês quando o dia não existir.`,
    ...linhas,
  ];
}

function redigirPagamentoMensalidade(ctx: ContratoNavarroContexto): string[] {
  return [
    `A CONTRATANTE pagará à CONTRATADA o valor mensal de ${formatMoedaComExtenso(ctx.valor)}, mediante ${formatNumeroComExtenso(CONTRATO_VIGENCIA_MENSALIDADE_MESES)} mensalidades durante a vigência contratual.`,
    `A primeira mensalidade vence na data deste contrato (${formatDateIsoToBR(ctx.dataContrato)}). As demais mensalidades vencem mensalmente, no mesmo dia, nos meses subsequentes, observando-se o último dia válido do mês quando o dia não existir.`,
    "O presente instrumento não possui valor global anual. A remuneração devida é exclusivamente a mensalidade acima discriminada.",
  ];
}

function redigirReajuste(modalidade: OrcamentoModalidade): string {
  if (modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE) {
    return "O valor mensal será reajustado a cada período de 12 (doze) meses pelo IPCA (Índice Nacional de Preços ao Consumidor Amplo), ou por outro índice oficial que legalmente venha a substituí-lo.";
  }
  return "Havendo continuidade da prestação após 12 (doze) meses da data deste contrato, os valores então vigentes poderão ser reajustados pelo IPCA, ou por outro índice oficial que legalmente venha a substituí-lo.";
}

function redigirVigencia(modalidade: OrcamentoModalidade): string[] {
  if (modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE) {
    return [
      `O presente instrumento é celebrado pelo prazo de ${formatNumeroComExtenso(CONTRATO_VIGENCIA_MENSALIDADE_MESES)} meses, constituindo vigência mínima inicial.`,
      `Ao término do prazo inicial, o contrato será automaticamente renovado por iguais e sucessivos períodos de ${formatNumeroComExtenso(CONTRATO_VIGENCIA_MENSALIDADE_MESES)} meses, salvo manifestação de qualquer das partes em sentido contrário, mediante comunicação escrita com antecedência mínima de ${formatNumeroComExtenso(CONTRATO_AVISO_PREVIO_DIAS)} dias.`,
    ];
  }
  return [
    "O presente contrato vigorará até a conclusão dos serviços discriminados na proposta comercial que o integra, sem prejuízo das obrigações legais de guarda, disponibilização e atualização dos documentos de SST quando exigidas pela legislação.",
  ];
}

function redigirRescisao(modalidade: OrcamentoModalidade): string[] {
  const comum = [
    "Qualquer das partes poderá rescindir o presente instrumento em caso de descumprimento contratual da outra parte, mediante comunicação escrita, assegurada a possibilidade de saneamento no prazo razoável indicado na notificação, quando a natureza da obrigação o permitir.",
  ];
  if (modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE) {
    return [
      ...comum,
      "Durante a vigência inicial de 12 (doze) meses, há permanência mínima contratual. Caso a CONTRATANTE solicite a rescisão antecipada sem justa causa antes do encerramento desse período, permanecerá responsável pelo pagamento das mensalidades correspondentes até o término do período contratual vigente. Essa obrigação não se confunde com multa percentual.",
      `Após o período inicial, qualquer das partes poderá impedir a renovação seguinte mediante aviso escrito com antecedência mínima de ${formatNumeroComExtenso(CONTRATO_AVISO_PREVIO_DIAS)} dias.`,
    ];
  }
  return comum;
}

function redigirInadimplencia(modalidade: OrcamentoModalidade): string[] {
  const base = [
    `O atraso no pagamento sujeitará a CONTRATANTE à multa de ${CONTRATO_INADIMPLENCIA.multaPercentual}% (dois por cento) sobre o valor em atraso, acrescida de juros de mora de ${CONTRATO_INADIMPLENCIA.jurosMesPercentual}% (um por cento) ao mês, sem prejuízo da correção aplicável.`,
  ];
  if (modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE) {
    base.push(
      `Em caso de inadimplência superior a ${formatNumeroComExtenso(CONTRATO_INADIMPLENCIA.suspensaoAposDias)} dias, a CONTRATADA poderá suspender os serviços contratados até a regularização dos valores em aberto, sem prejuízo dos encargos aplicáveis. A suspensão não extingue a dívida nem implica cancelamento automático do contrato.`
    );
  }
  return base;
}

export const CONTRATO_TEXTOS_PROIBIDOS = [
  "Eko's",
  "Eko’s",
  "Ekos",
  "A&L",
  "A & L",
  "IPC-FIPE",
  "IPC FIPE",
  "QR Code",
  "trilha de assinatura",
] as const;

export function buildClausulasContrato(
  ctx: ContratoNavarroContexto
): ContratoClausula[] {
  const pagamento =
    ctx.modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE
      ? redigirPagamentoMensalidade(ctx)
      : redigirPagamentoPontual(ctx);

  return [
    {
      numero: "1",
      titulo: "DAS PARTES",
      paragrafos: [
        `CONTRATANTE: ${redigirContratante(ctx.contratante)}`,
        `CONTRATADA: ${redigirContratada()}`,
        "As partes acima qualificadas resolvem celebrar o presente Contrato de Prestação de Serviços de Saúde e Segurança do Trabalho, que se regerá pelas cláusulas seguintes.",
      ],
    },
    {
      numero: "2",
      titulo: "DO OBJETO",
      paragrafos: [redigirObjeto(ctx.numeroOrcamento)],
    },
    {
      numero: "3",
      titulo: "DO ATENDIMENTO",
      paragrafos: [
        "O atendimento objeto deste contrato compreende os serviços técnicos de SST discriminados na proposta comercial, observados os itens abaixo, na medida em que integrarem o escopo contratado.",
        "PCMSO. Elaboração e gestão do Programa de Controle Médico de Saúde Ocupacional, nos termos da NR-07, de acordo com as informações prestadas pela CONTRATANTE sobre suas atividades e seus colaboradores.",
        "Exames ocupacionais. Realização dos exames clínicos ocupacionais previstos no PCMSO e na proposta comercial, incluindo os ASOs correspondentes ao quantitativo contratado.",
        "Rede credenciada. Os exames ocupacionais serão realizados na rede credenciada da CONTRATADA, conforme disponibilidade e regras de atendimento vigentes.",
        "PGR. Elaboração e gerenciamento do Programa de Gerenciamento de Riscos (PGR), nos termos da NR-01, contemplando o inventário de riscos e o plano de ação do estabelecimento da CONTRATANTE, com atualizações quando houver alteração das informações necessárias à execução, devidamente comunicadas pela CONTRATANTE.",
        "LTCAT. Elaboração do Laudo Técnico das Condições do Ambiente de Trabalho, nos termos da legislação previdenciária e de SST aplicável, com base nas informações e nas condições do estabelecimento informadas pela CONTRATANTE.",
        "Avaliação de Riscos Psicossociais – NR-01, conforme metodologia e escopo previstos na proposta comercial.",
        "eSocial. Gestão e envio dos eventos de Saúde e Segurança do Trabalho no eSocial (S-2210, S-2220 e S-2240), nos termos da legislação aplicável e do escopo previsto na proposta comercial.",
        "Exames complementares não estão incluídos no valor contratado e serão cobrados à parte, mediante necessidade prevista no PCMSO e autorização da CONTRATANTE. Incluem-se, quando aplicáveis, exames tais como audiometria, espirometria, exames laboratoriais e demais exames complementares previstos no PCMSO.",
        redigirColaboradores(ctx.colaboradores),
        ...redigirAdicionais(ctx.modalidade),
      ],
    },
    {
      numero: "4",
      titulo: "DO PAGAMENTO",
      paragrafos: [...pagamento, redigirReajuste(ctx.modalidade)],
    },
    {
      numero: "5",
      titulo: "DAS OBRIGAÇÕES DAS PARTES",
      paragrafos: [
        "Compete à CONTRATADA executar os serviços contratados com diligência técnica, observadas a legislação de SST e as informações efetivamente fornecidas pela CONTRATANTE.",
        "Compete à CONTRATANTE fornecer, de forma correta, completa e atualizada, as informações necessárias à execução dos serviços, inclusive quanto à atividade econômica, aos riscos ocupacionais, aos agentes presentes no ambiente de trabalho, aos funcionários e às alterações cadastrais relevantes.",
        "A CONTRATANTE comunicará tempestivamente admissões, demissões, mudanças de função, alterações de estabelecimento e quaisquer fatos que impactem o PCMSO, o PGR, o LTCAT, os exames ocupacionais ou os eventos de eSocial.",
        "A omissão, a inexatidão ou o atraso nas informações da CONTRATANTE podem impedir ou atrasar a regular execução dos serviços, sem que isso caracterize inadimplemento da CONTRATADA.",
      ],
    },
    {
      numero: "6",
      titulo: "DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)",
      paragrafos: [
        "As PARTES comprometem-se a observar a legislação vigente de proteção de dados pessoais, em especial a Lei nº 13.709/2018 (LGPD), no tratamento das informações compartilhadas para a execução deste contrato.",
        "Os dados pessoais eventualmente tratados em razão deste instrumento serão utilizados apenas para as finalidades da prestação de serviços de SST, com medidas razoáveis de segurança da informação, vedado o uso para finalidade incompatível.",
        "Cada parte informará a outra, tão logo tenha conhecimento, sobre incidente de segurança que possa afetar dados pessoais tratados no âmbito deste contrato.",
        "As obrigações desta cláusula não afastam os deveres legais específicos de SST, tampouco criam, por si sós, novas figuras de encarregado ou bases legais não previstas na legislação.",
      ],
    },
    {
      numero: "7",
      titulo: "DO PRAZO DE VIGÊNCIA E DA RESCISÃO",
      paragrafos: [
        ...redigirVigencia(ctx.modalidade),
        ...redigirRescisao(ctx.modalidade),
        ...redigirInadimplencia(ctx.modalidade),
      ],
    },
    {
      numero: "8",
      titulo: "DO FORO",
      paragrafos: [
        `Fica eleito o foro da Comarca de ${NAVARRO_CONTRATO_INSTITUCIONAL.foroComarca}, com renúncia de qualquer outro, por mais privilegiado que seja, para dirimir as questões oriundas deste contrato.`,
      ],
    },
  ];
}

export function textoPlanoContrato(
  clausulas: ContratoClausula[],
  estilo: "sst" | "aet" = "sst"
): string {
  return clausulas
    .map((c) => {
      const itens = (c.itens ?? []).map((item) => `• ${item}`).join("\n");
      const corpo = [...c.paragrafos, itens].filter(Boolean).join("\n");
      return `${rotuloClausulaContrato(c, estilo)}\n${corpo}`;
    })
    .join("\n\n");
}
