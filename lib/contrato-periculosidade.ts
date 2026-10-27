/**
 * Contrato documental do Laudo Técnico de Periculosidade (NR-16).
 * Mesma estrutura dos laudos pontuais. Não gera contrato operacional SST.
 */

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCNPJ } from "@/lib/cnpj";
import type {
  ContratoClausula,
  ContratoParteContratante,
} from "@/lib/contrato-navarro";
import type { ContratoParcela } from "@/lib/contrato-pagamento";
import { formatMoedaComExtenso, numeroPorExtenso } from "@/lib/extenso";
import { formatCurrency } from "@/lib/money";
import {
  PERICULOSIDADE_INCLUSOS_ITENS,
  SERVICO_PERICULOSIDADE_NOME,
} from "@/lib/servico-periculosidade";

export const CONTRATO_PERICULOSIDADE_TITULO_LINHAS = [
  "CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS",
  "LAUDO TÉCNICO DE PERICULOSIDADE – NR-16",
] as const;

export const CONTRATO_PERICULOSIDADE_FECHO =
  "E, por estarem de acordo, as partes firmam o presente instrumento.";

export const NAVARRO_CONTRATO_PERICULOSIDADE = {
  razaoSocial:
    "NAVARRO ENGENHARIA DE SEGURANÇA DO TRABALHO E MEDICINA OCUPACIONAL LTDA",
  cnpj: "45.206.250/0001-10",
  endereco:
    "Rua Francisco Marengo, 500 – Tatuapé – São Paulo – SP – CEP 03138-010",
  telefone: "(11) 97706-5599",
  representante: "Pedro Henrique Navarro",
  representanteCpf: "385.381.338-02",
  email: "contato@navarroeng.com.br",
} as const;

export type ContratoPericulosidadeContexto = {
  numeroOrcamento: string;
  contratante: ContratoParteContratante;
  valor: number;
  quantidadeParcelas: number;
  valorParcela: number;
  parcelas: ContratoParcela[];
};

export function redigirContratadaPericulosidade(): string {
  const n = NAVARRO_CONTRATO_PERICULOSIDADE;
  return `${n.razaoSocial}, inscrita no CNPJ nº ${n.cnpj}, com sede na ${n.endereco}, neste ato representada por ${n.representante}, CPF nº ${n.representanteCpf}.`;
}

export function redigirContratantePericulosidade(
  c: ContratoParteContratante
): string {
  const razao = c.razaoSocial.trim() || "CONTRATANTE";
  const cnpj = c.cnpj?.trim() ? formatCNPJ(c.cnpj) : "—";
  const endereco = c.endereco?.trim();
  if (endereco) {
    return `${razao}, inscrita no CNPJ nº ${cnpj}, estabelecida à ${endereco}.`;
  }
  return `${razao}, inscrita no CNPJ nº ${cnpj}.`;
}

export function qualificacaoContratoPericulosidade(
  contratante: ContratoParteContratante
): { titulo: string; paragrafos: string[] } {
  return {
    titulo: "QUALIFICAÇÃO",
    paragrafos: [
      `CONTRATADA: ${redigirContratadaPericulosidade()}`,
      `CONTRATANTE: ${redigirContratantePericulosidade(contratante)}`,
      "As partes acima identificadas celebram o presente Contrato de Prestação de Serviços Técnicos, mediante as cláusulas e condições seguintes.",
    ],
  };
}

function quantidadeParcelasRedacao(quantidade: number): string {
  const n = Math.max(1, Math.floor(quantidade) || 1);
  if (n === 1) return "1 (uma) parcela";
  const extenso = numeroPorExtenso(n) === "dois" ? "duas" : numeroPorExtenso(n);
  return `${n} (${extenso}) parcelas`;
}

export function buildClausulasContratoPericulosidade(
  ctx: ContratoPericulosidadeContexto
): ContratoClausula[] {
  const numero = ctx.numeroOrcamento.trim();
  const valorTotal = `${formatMoedaComExtenso(ctx.valor)}.`;
  const parcelas = ctx.parcelas;
  const n = Math.max(1, parcelas.length || ctx.quantidadeParcelas || 1);
  const valoresIguais =
    parcelas.length > 0 &&
    parcelas.every((p) => p.valorCentavos === parcelas[0]?.valorCentavos);
  const valorParcelaRef = parcelas[0]?.valor ?? ctx.valorParcela;
  const condicaoIguais = valoresIguais
    ? `O pagamento será realizado em ${quantidadeParcelasRedacao(n)} de ${formatMoedaComExtenso(valorParcelaRef)}, conforme a seguinte condição:`
    : `O pagamento será realizado em ${quantidadeParcelasRedacao(n)}, conforme a seguinte condição:`;

  return [
    {
      numero: "1",
      titulo: "DO OBJETO",
      paragrafos: [
        `O presente contrato tem por objeto a prestação de serviços técnicos especializados para elaboração do Laudo Técnico de Periculosidade, com avaliação das atividades e condições de trabalho e verificação do enquadramento na NR-16, conforme escopo e condições estabelecidos na Proposta Comercial nº ${numero}, que passa a integrar este contrato para todos os fins.`,
        "O serviço será realizado considerando as atividades, instalações e condições de trabalho abrangidas pelo escopo contratado.",
      ],
    },
    {
      numero: "2",
      titulo: "DOS SERVIÇOS INCLUSOS",
      paragrafos: [],
      itens: [...PERICULOSIDADE_INCLUSOS_ITENS],
    },
    {
      numero: "3",
      titulo: "DA VISITA TÉCNICA",
      paragrafos: [
        "A CONTRATANTE deverá permitir o acesso dos profissionais da CONTRATADA aos ambientes, atividades e instalações necessários à execução do serviço, em data previamente acordada entre as partes.",
        "A CONTRATANTE deverá disponibilizar as informações e documentos necessários para a realização da avaliação.",
        "Caso a visita não possa ser realizada por impedimento da CONTRATANTE, será realizado novo agendamento entre as partes.",
      ],
    },
    {
      numero: "4",
      titulo: "DAS OBRIGAÇÕES DA CONTRATADA",
      paragrafos: [
        "Compete à CONTRATADA:",
        "a) executar os serviços técnicos previstos neste contrato e na proposta comercial;",
        "b) realizar a visita técnica e a avaliação das atividades, instalações e condições de trabalho abrangidas pelo escopo contratado;",
        "c) elaborar o Laudo Técnico de Periculosidade, com conclusão fundamentada quanto à caracterização ou não de condições perigosas, conforme a NR-16;",
        "d) apresentar as conclusões técnicas aplicáveis às condições avaliadas;",
        "e) entregar o documento final em formato digital.",
      ],
    },
    {
      numero: "5",
      titulo: "DAS OBRIGAÇÕES DA CONTRATANTE",
      paragrafos: [
        "Compete à CONTRATANTE:",
        "a) fornecer informações verdadeiras e suficientes para a execução dos serviços;",
        "b) disponibilizar os documentos e informações solicitados pela CONTRATADA;",
        "c) permitir acesso aos locais, atividades e instalações abrangidos pela avaliação;",
        "d) informar corretamente as atividades efetivamente desenvolvidas;",
        "e) comunicar situações ou condições relevantes que possam interferir na avaliação;",
        "f) efetuar os pagamentos nas condições estabelecidas neste contrato.",
      ],
    },
    {
      numero: "6",
      titulo: "DO VALOR E DA FORMA DE PAGAMENTO",
      paragrafos: [
        "Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor total de:",
        valorTotal,
        condicaoIguais,
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
        "O prazo para elaboração e entrega do Laudo Técnico de Periculosidade será contado após a realização da visita técnica e o recebimento das informações e documentos necessários à execução do serviço.",
        "O prazo específico de entrega será aquele acordado entre as partes, considerando o escopo e a complexidade da avaliação.",
        "Eventuais atrasos decorrentes da falta de documentos, informações, acesso aos ambientes ou disponibilidade da CONTRATANTE poderão impactar o prazo de entrega.",
      ],
    },
    {
      numero: "8",
      titulo: "DAS ALTERAÇÕES DE ESCOPO",
      paragrafos: [
        "Este contrato contempla exclusivamente o escopo definido na proposta comercial aprovada.",
        "A inclusão posterior de novas atividades, áreas, instalações, avaliações ou serviços não contemplados originalmente poderá ser objeto de orçamento complementar.",
      ],
    },
    {
      numero: "9",
      titulo: "DA RESPONSABILIDADE PELAS INFORMAÇÕES",
      paragrafos: [
        "As conclusões técnicas serão elaboradas com base nas condições observadas durante a avaliação e nas informações disponibilizadas pela CONTRATANTE.",
        "Alterações posteriores nos processos, equipamentos, instalações, atividades ou demais condições avaliadas poderão exigir nova análise ou atualização do documento.",
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
        "A elaboração e entrega do Laudo Técnico de Periculosidade não transfere à CONTRATADA a responsabilidade pela implementação das medidas corretivas, de prevenção ou de adequação eventualmente indicadas no documento.",
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

export const CONTRATO_PERICULOSIDADE_SERVICO_LABEL = SERVICO_PERICULOSIDADE_NOME;
