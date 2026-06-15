/** Identidade visual — Proposta Comercial SST (referência aprovada). */

export const ORC_PDF_COLORS = {
  navy: [13, 27, 76] as [number, number, number],
  gold: [199, 160, 74] as [number, number, number],
  grayBlock: [247, 246, 242] as [number, number, number],
  grayBorder: [217, 217, 217] as [number, number, number],
  grayLight: [245, 245, 245] as [number, number, number],
  textPrimary: [34, 34, 34] as [number, number, number],
  textSecondary: [85, 85, 85] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
} as const;

export const ORC_PDF_PAGE = {
  width: 210,
  height: 297,
  marginLeft: 20,
  marginRight: 20,
  marginTop: 15,
  marginBottom: 15,
} as const;

export const ORC_PDF_FONT = {
  family: "helvetica" as const,
  title: 22.5,
  logo: 15,
  subtitle: 10.5,
  body: 8.25,
  table: 7.5,
  footer: 7.5,
  totalValue: 18,
  small: 7,
} as const;

export const ORC_PDF_LAYOUT = {
  headerHeight: 22.5,
  logoMax: 17,
  spaceAfterHeader: 5.3,
  spaceAfterTitle: 6.6,
  spaceDescTop: 4,
  spaceDescBottom: 4,
  tableHeadHeight: 10.6,
  tableRowMinHeight: 10.6,
  cardGapRatio: 0.04,
  cardWidthRatio: 0.48,
  footerHeight: 10.6,
  goldLineWidth: 0.35,
} as const;

export const NAVARRO_ORC_PDF = {
  razaoSocial: "NAVARRO",
  subtituloLinha1: "ENGENHARIA DE SEGURANÇA",
  subtituloLinha2: "E MEDICINA OCUPACIONAL",
  cnpj: "45.206.250/0001-10",
  responsavel: "Pedro Navarro",
  cargo: "Engenheiro de Segurança do Trabalho",
  crea: "CREA 5069206790",
  celular: "(11) 97706-5599",
  telefone: "(11) 3181-7697",
  email: "contato@navarroeng.com.br",
  site: "www.navarroeng.com.br",
  instagram: "@navarroeng",
} as const;

export const ORC_PDF_DESCRICAO_PADRAO =
  "Apresentamos a proposta comercial para prestação de serviços de assistência técnica especializada em engenharia de segurança e medicina do trabalho. Os serviços têm como objetivo garantir o cumprimento das Normas Regulamentadoras, promovendo a saúde e a integridade física dos colaboradores, além da emissão dos eventos do e-Social (S-2210, S-2220, S-2240) e NR-01.";

export const ORC_PDF_DESCRICAO_NOTA =
  "(Laudos obrigatórios por lei sujeito a multa do Ministério do trabalho MTE)";

export const ORC_PDF_INCLUSO_ITENS = [
  "Apresentação dos serviços contratados (online ou presencial);",
  "Treinamentos a cargo da empresa;",
  "Agendamento de exames, controle de vencimentos periódicos e ASO;",
  "Auxílio na admissão e demissão dos colaboradores;",
  "Encaminhamento de documentação e laudos, com foco na entrega dos exames ao final do prazo (conforme agenda);",
] as const;

export const ORC_PDF_INCLUSO_OBS = [
  "O valor dos serviços contempla a quantidade de CNPJs vinculadas ao contrato;",
  "Após o primeiro mês, deverá ser reajustado conforme alteração na quantidade de CNPJs vinculadas;",
] as const;

export function orcPdfContentWidth(): number {
  return (
    ORC_PDF_PAGE.width -
    ORC_PDF_PAGE.marginLeft -
    ORC_PDF_PAGE.marginRight
  );
}
