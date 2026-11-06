import { DISPENSA_DEMISSIONAL_NR7 } from "@/lib/cobertura-exame-clinico";
import { NAVARRO_DADOS_BANCARIOS } from "@/lib/navarro-pagamento";
import { resolveItensInclusosServico } from "@/lib/servico-sst-pacote";
import { formatCNPJ } from "@/lib/cnpj";
import {
  formatMoedaComExtenso,
  formatNumeroComExtenso,
} from "@/lib/extenso";
import { formatCurrency } from "@/lib/money";
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

/** Mensalidade da Gestão SST na renovação: 130 + 10 × max(colaboradores − 1, 0). */
export const GESTAO_SST_RENOVACAO_BASE_REAIS = 130;
export const GESTAO_SST_RENOVACAO_INCREMENTO_REAIS = 10;

export const DIAS_VENCIMENTO_MENSALIDADE = [10, 20] as const;
export type DiaVencimentoMensalidade =
  (typeof DIAS_VENCIMENTO_MENSALIDADE)[number];

/** Identificador da mensalidade no 5º dia útil. Não é o dia 05. */
export const MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL = "quinto_dia_util" as const;

export const DIA_VENCIMENTO_MENSALIDADE_PENDENTE_MSG =
  "Selecione o vencimento das mensalidades (dia 10, dia 20 ou 5º dia útil) antes de gerar o contrato.";

export function vencimentoMensalidadeQuintoDiaUtil(
  value: unknown
): boolean {
  return value === MENSALIDADE_VENCIMENTO_QUINTO_DIA_UTIL;
}

/** Escolha gravada na contratação. Null não é renovação automática. */
export type RenovacaoContratoGestao = "automatica" | "nao_automatica";

export const RENOVACAO_CONTRATO_OPCOES: readonly {
  id: RenovacaoContratoGestao;
  label: string;
}[] = [
  { id: "automatica", label: "Automática" },
  { id: "nao_automatica", label: "Sem renovação automática" },
] as const;

export const RENOVACAO_CONTRATO_PENDENTE_MSG =
  "Selecione a renovação do contrato antes de gerar o PDF.";

export const RENOVACAO_CONTRATO_MIGRATION_MSG =
  "A coluna mensalidade_renovacao_automatica ainda não existe no banco. Execute a migration 145_mensalidade_renovacao_automatica.sql no Supabase. A opção permanece visível, mas ainda não pode ser gravada.";

export const RENOVACAO_CONTRATO_NOVA_VERSAO_MSG =
  "O PDF já gerado não muda sozinho. Depois de alterar a opção, gere o PDF novamente para a cláusula 7 usar a escolha. O arquivo anterior permanece no histórico.";

export function renovacaoContratoSalva(
  value: boolean | null | undefined
): RenovacaoContratoGestao | null {
  if (value === true) return "automatica";
  if (value === false) return "nao_automatica";
  return null;
}

/** Rótulo da listagem e do modal. Não infere pela modalidade nem pelo pagamento. */
export function labelRenovacaoContratoListagem(
  value: boolean | null | undefined
): "Automática" | "Não automática" | "—" {
  const modo = renovacaoContratoSalva(value);
  if (modo === "automatica") return "Automática";
  if (modo === "nao_automatica") return "Não automática";
  return "—";
}

export function diaVencimentoMensalidadeValido(
  value: unknown
): DiaVencimentoMensalidade | null {
  const dia = Number(value);
  return dia === 10 || dia === 20 ? dia : null;
}

export function valorMensalidadeRenovacaoGestaoSst(
  colaboradores: number,
  params?: { baseReais?: number; incrementoReais?: number }
): number {
  const base = Number(params?.baseReais);
  const incremento = Number(params?.incrementoReais);
  const baseReais =
    Number.isFinite(base) && base > 0 ? base : GESTAO_SST_RENOVACAO_BASE_REAIS;
  const incrementoReais =
    Number.isFinite(incremento) && incremento > 0
      ? incremento
      : GESTAO_SST_RENOVACAO_INCREMENTO_REAIS;
  const quantidade = Math.max(0, Math.floor(Number(colaboradores) || 0));
  const extras = Math.max(quantidade - 1, 0);
  return Math.round((baseReais + incrementoReais * extras) * 100) / 100;
}

export type ContratoParteContratante = {
  razaoSocial: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  setor: string | null;
};

export type ContratoClausulaTabela = {
  colunas: string[];
  linhas: string[][];
};

export type ContratoDadoPagamento = {
  rotulo: string;
  valor: string;
};

export type ContratoBlocoPagamento = {
  introducao: string;
  linhas: ContratoDadoPagamento[];
};

export type ContratoClausula = {
  numero: string;
  titulo: string;
  paragrafos: string[];
  /** Lista com marcadores (contrato AET, cláusula de inclusos). */
  itens?: string[];
  tabela?: ContratoClausulaTabela;
  blocoPagamento?: ContratoBlocoPagamento;
  paragrafosApos?: string[];
  /** Quando preenchido, substitui o rótulo "CLÁUSULA n". Usado no Anexo I. */
  rotulo?: string;
};

/** Campo pedido no contrato e ausente na fonte oficial de pagamento. */
export const CAMPOS_PAGAMENTO_CONTRATO_AUSENTES = ["Tipo de conta"] as const;

function valorPagamentoCadastrado(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

/** Linhas disponíveis em NAVARRO_DADOS_BANCARIOS. Omite campo vazio. */
export function linhasDadosPagamentoContrato(): ContratoDadoPagamento[] {
  const d = NAVARRO_DADOS_BANCARIOS;
  const linhas: ContratoDadoPagamento[] = [];
  const incluir = (rotulo: string, valor: string | null | undefined) => {
    const texto = valorPagamentoCadastrado(valor);
    if (texto) linhas.push({ rotulo, valor: texto });
  };
  incluir("Banco", d.banco);
  incluir("Agência", d.agencia);
  incluir("Conta", d.conta);
  incluir("Titular", d.favorecido);
  incluir("CNPJ", d.pixCnpj);
  incluir("Chave Pix", d.pixCnpj);
  return linhas;
}

function fraseMeiosPagamentoContrato(): string | null {
  const d = NAVARRO_DADOS_BANCARIOS;
  const transferencia = [d.banco, d.agencia, d.conta].every((item) =>
    Boolean(valorPagamentoCadastrado(item))
  );
  const pix = Boolean(valorPagamentoCadastrado(d.pixCnpj));
  if (transferencia && pix) return "por Pix ou transferência bancária";
  if (pix) return "por Pix";
  if (transferencia) return "por transferência bancária";
  return null;
}

export function rotuloClausulaContrato(
  clause: ContratoClausula,
  estilo: "sst" | "aet"
): string {
  if (clause.rotulo?.trim()) return clause.rotulo.trim();
  if (estilo === "aet") {
    return `CLÁUSULA ${clause.numero}ª – ${clause.titulo}`;
  }
  return `CLÁUSULA ${clause.numero} — ${clause.titulo}`;
}

export type ContratoPagamentoMensalidade = {
  forma: "mensal" | "avista";
  meses: number;
  valorMensal: number;
  valorBruto?: number;
  desconto?: number;
  valorFinal?: number;
  vencimentoIso?: string;
  valorPontual?: number;
};

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
  pagamentoMensalidade?: ContratoPagamentoMensalidade | null;
  /** Exame clínico avulso desta contratação. Nulo quando o valor não está configurado. */
  valorExameClinicoAvulso?: number | null;
  /** Quando o demissional avulso tem preço próprio, distinto do admissional. */
  valorExameClinicoDemissional?: number | null;
  /** Datas da vigência já gravadas na contratação. A emissão do PDF não as substitui. */
  vigenciaInicioIso?: string | null;
  vigenciaFimIso?: string | null;
  /** Dia do mês das mensalidades do plano. Não é o vencimento da fatura de exames. */
  diaVencimentoMensalidade?: number | null;
  /** Parâmetros da fórmula de renovação gravados nesta contratação. */
  renovacaoBaseReais?: number | null;
  renovacaoIncrementoReais?: number | null;
  /**
   * false quando a contratação gravou a ausência de renovação automática.
   * Ausente ou true mantém o modelo de renovação automática.
   */
  renovacaoAutomatica?: boolean;
  /**
   * 2 = condições novas da Gestão SST. Ausente ou outro valor preserva o texto anterior.
   */
  modeloVersao?: number | null;
  /** `quinto_dia_util` quando a mensalidade vence no 5º dia útil. Não é o dia 05. */
  vencimentoRegraMensalidade?: string | null;
  /**
   * Alteração de quantidade/mensalidade no meio da vigência já contratada.
   * Só entra no texto quando a vigência do PDF é a mesma da alteração.
   */
  alteracaoContratacao?: {
    vigenciaInicioIso: string;
    numeroParcela: number;
    vencimentoIso: string;
    quantidadeAnterior: number;
    valorAnterior: number;
  } | null;
};

const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Início e término só entram no contrato quando os dois já existem e o término é posterior. */
export function vigenciaContratualConfiavel(
  inicio: string | null | undefined,
  fim: string | null | undefined
): { inicio: string; fim: string } | null {
  const inicioIso = (inicio ?? "").trim().slice(0, 10);
  const fimIso = (fim ?? "").trim().slice(0, 10);
  if (!ISO_DATA.test(inicioIso) || !ISO_DATA.test(fimIso)) return null;
  if (fimIso <= inicioIso) return null;
  return { inicio: inicioIso, fim: fimIso };
}

/** Preço do exame clínico avulso da Gestão SST mensal, a partir da configuração recebida. */
export function valorExameClinicoAvulsoMensalidade(
  config: {
    admissionalCentavos: number;
    demissionalCentavos: number;
  } = CONTRATO_ADICIONAL_MENSALIDADE
): { admissional: number; demissional: number } | null {
  const admissional = centavosParaReaisExame(config.admissionalCentavos);
  const demissional = centavosParaReaisExame(config.demissionalCentavos);
  if (admissional == null || demissional == null) return null;
  return { admissional, demissional };
}

function centavosParaReaisExame(centavos: number): number | null {
  if (!Number.isFinite(centavos) || centavos <= 0) return null;
  return Math.round(centavos) / 100;
}

export function centavosSalvosParaReais(
  centavos: number | null | undefined
): number | null {
  const valor = Number(centavos);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return Math.round(valor) / 100;
}

/**
 * Descrição da proposta comercial de Gestão SST mensal.
 * Não compõe cláusulas nem o PDF do contrato.
 * O preço do exame avulso sai do parâmetro gravado na contratação, ou da
 * configuração da modalidade quando a contratação ainda não o registrou.
 */
export function propostaIncluiEscopoGestaoCompleta(
  textos: readonly string[]
): boolean {
  const blob = textos.join("\n");
  return (
    /\bpgr\b/i.test(blob) &&
    /ltcat/i.test(blob) &&
    /pcmso/i.test(blob) &&
    /psicossocia/i.test(blob) &&
    /s-2210/i.test(blob) &&
    /s-2220/i.test(blob) &&
    /s-2240/i.test(blob)
  );
}

export function paragrafosPropostaGestaoMensal(params?: {
  exameAdmissional?: number | null;
  exameDemissional?: number | null;
  /** 2 = cobertura por tipo. Ausente ou outro valor preserva a proposta anterior. */
  modeloVersao?: number | null;
  /**
   * O texto que lista PGR, LTCAT, PCMSO, riscos psicossociais e eSocial
   * só entra quando a proposta inclui todos esses serviços.
   */
  escopoCompleto?: boolean | null;
}): readonly string[] {
  const catalogo = valorExameClinicoAvulsoMensalidade();
  const admissional =
    Number(params?.exameAdmissional) > 0
      ? Number(params?.exameAdmissional)
      : catalogo?.admissional;
  const demissional =
    Number(params?.exameDemissional) > 0
      ? Number(params?.exameDemissional)
      : catalogo?.demissional;
  const preco =
    admissional != null && demissional != null
      ? admissional === demissional
        ? params?.modeloVersao === 2
          ? `O exame clínico avulso custa ${formatCurrency(admissional)} por exame, com ASO, para todos os tipos clínicos. Exames complementares são cobrados à parte.`
          : `Exames clínicos avulsos admissionais e demissionais custam ${formatCurrency(admissional)} cada. Exames complementares são cobrados à parte.`
        : params?.modeloVersao === 2
          ? `O exame clínico avulso custa ${formatCurrency(admissional)} por exame, com ASO. O demissional avulso desta proposta permanece em ${formatCurrency(demissional)}. Exames complementares são cobrados à parte.`
          : `Exames clínicos avulsos admissionais custam ${formatCurrency(admissional)} cada e demissionais custam ${formatCurrency(demissional)} cada. Exames complementares são cobrados à parte.`
      : "O valor dos exames clínicos avulsos desta modalidade ainda não está configurado e deverá constar do contrato antes da assinatura. Exames complementares são cobrados à parte.";
  if (params?.modeloVersao === 2 && params.escopoCompleto === true) {
    const precoCompleto =
      admissional == null
        ? "O valor dos exames clínicos avulsos desta modalidade ainda não está configurado e deverá constar do contrato antes da assinatura. Exames complementares são cobrados à parte."
        : demissional != null && demissional !== admissional
          ? `Repetições do mesmo tipo e exames clínicos de funcionários admitidos durante a vigência custam ${formatCurrency(admissional)} cada. O demissional avulso desta proposta permanece em ${formatCurrency(demissional)}. Exames complementares são cobrados à parte.`
          : `Repetições do mesmo tipo e exames clínicos de funcionários admitidos durante a vigência custam ${formatCurrency(admissional)} cada. Exames complementares são cobrados à parte.`;
    return [
      "A proposta contempla a Gestão Completa de Saúde e Segurança do Trabalho por 12 meses, incluindo PGR, LTCAT, PCMSO, Avaliação de Riscos Psicossociais e gestão dos eventos de SST no eSocial (S-2210, S-2220 e S-2240).",
      "Para cada colaborador abrangido no início da vigência, o plano inclui um exame clínico de cada tipo, quando necessário, com emissão do ASO: admissional, periódico, demissional, retorno ao trabalho e mudança de risco ocupacional.",
      precoCompleto,
      "O compromisso é anual. A cada renovação, a mensalidade é recalculada conforme os colaboradores ativos, e a cobertura dos exames é renovada.",
    ];
  }
  if (params?.modeloVersao === 2) {
    return [
      "Cada colaborador abrangido no início da vigência tem um exame clínico de cada tipo, quando indicado: admissional, periódico, demissional, retorno ao trabalho e mudança de risco ocupacional, com ASO. A utilização de um tipo não consome outro.",
      "A repetição do mesmo tipo e os exames clínicos de colaboradores admitidos durante a vigência são avulsos. " +
        preco,
      "A contratação tem compromisso anual. Na renovação automática, a mensalidade é recalculada e a cobertura recomeça para a nova lista de abrangidos.",
    ];
  }
  return [
    "A proposta contempla a Gestão Completa de Saúde e Segurança do Trabalho por 12 meses, incluindo PGR, LTCAT, PCMSO, Avaliação de Riscos Psicossociais e gestão dos eventos de SST no eSocial (S-2210, S-2220 e S-2240).",
    "Inclui um exame clínico periódico por colaborador abrangido pelo plano, com ASO, ou demissional quando o desligamento ocorrer antes da realização do periódico.",
    preco,
    "A contratação tem compromisso anual e renovação automática, salvo aviso escrito com antecedência mínima de 30 dias do término.",
  ];
}

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

function redigirAdicionaisPontual(): string[] {
  return [
    `A inclusão de novo funcionário (admissional adicional) será cobrada no valor de ${formatMoedaComExtenso(CONTRATO_ADICIONAL_PONTUAL.admissionalCentavos / 100)}, por colaborador.`,
    `O exame demissional será cobrado no valor de ${formatMoedaComExtenso(CONTRATO_ADICIONAL_PONTUAL.demissionalCentavos / 100)}, por colaborador.`,
  ];
}

function fraseQuantitativoColaboradores(quantidade: number): string {
  if (!Number.isFinite(quantidade) || quantidade < 1) {
    return "o quantitativo de colaboradores previsto na proposta comercial";
  }
  const n = Math.round(quantidade);
  const label = n === 1 ? "colaborador" : "colaboradores";
  return `${formatNumeroComExtenso(n)} ${label}`;
}

function redigirValorExameClinicoAvulso(ctx: ContratoNavarroContexto): string {
  const admissional = ctx.valorExameClinicoAvulso;
  const demissional = ctx.valorExameClinicoDemissional ?? admissional;
  const admissionalOk =
    admissional != null && Number.isFinite(admissional) && admissional > 0;
  const demissionalOk =
    demissional != null && Number.isFinite(demissional) && demissional > 0;
  if (!admissionalOk || !demissionalOk) {
    return "O valor do exame clínico avulso, admissional ou demissional, com emissão do respectivo ASO, não está registrado nesta contratação e deverá ser ajustado por escrito antes da assinatura.";
  }
  if (admissional === demissional) {
    return `Para esta contratação, o valor do exame clínico avulso é de ${formatMoedaComExtenso(admissional)}, por exame, tanto admissional quanto demissional, com emissão do respectivo ASO.`;
  }
  return `Para esta contratação, o exame clínico admissional avulso é de ${formatMoedaComExtenso(admissional)} e o exame clínico demissional avulso é de ${formatMoedaComExtenso(demissional)}, com emissão do respectivo ASO.`;
}

function redigirExamesGestaoMensalidade(ctx: ContratoNavarroContexto): string[] {
  const meses = mesesVigenciaContexto(ctx);
  const quantitativo = fraseQuantitativoColaboradores(ctx.colaboradores);
  return [
    "Exames incluídos e avulsos.",
    `Cada colaborador abrangido pelo quantitativo contratado de ${quantitativo} tem direito a 1 (um) exame clínico periódico durante a vigência de ${formatNumeroComExtenso(meses)} meses, com emissão do ASO.`,
    "Se esse colaborador for desligado antes de realizar o periódico, o exame clínico demissional, quando necessário, será realizado utilizando essa cobertura, sem cobrança adicional.",
    "A cobertura é de um único exame clínico por colaborador contratado em cada vigência: periódico ou demissional nas condições acima.",
    "Se o periódico já tiver sido realizado, o exame clínico demissional será cobrado separadamente.",
    "Os exames clínicos admissionais de novos colaboradores durante a vigência serão cobrados separadamente. A admissão de novo colaborador durante a vigência não lhe atribui, por si só, direito a exame clínico incluído no plano nesse período.",
    "O exame clínico demissional desses novos colaboradores também será cobrado separadamente durante a mesma vigência.",
    redigirValorExameClinicoAvulso(ctx),
    "Exames complementares são sempre cobrados à parte, inclusive quando o exame clínico estiver incluído no plano, conforme necessidade prevista no PCMSO e autorização da CONTRATANTE.",
    semRenovacaoAutomatica(ctx)
      ? "Em uma nova contratação ajustada por escrito, a cobertura será aplicada aos colaboradores abrangidos pelo novo acordo. Não há renovação automática desta cobertura."
      : "Nas renovações, a cobertura será aplicada aos colaboradores abrangidos pelo plano renovado.",
    "Essa regra comercial de cobertura não altera a indicação nem a periodicidade médica dos exames.",
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

function mesesVigenciaContexto(ctx: ContratoNavarroContexto): number {
  const meses = Math.floor(Number(ctx.pagamentoMensalidade?.meses));
  if (Number.isInteger(meses) && meses >= 1) return meses;
  return CONTRATO_VIGENCIA_MENSALIDADE_MESES;
}

function redigirInstrucaoPagamentoAvista(
  valorFinal: number,
  vencimentoIso: string,
  temDesconto: boolean
): string {
  const valor = formatMoedaComExtenso(valorFinal);
  const vencimento = formatDateIsoToBR(vencimentoIso);
  const nucleo = temDesconto
    ? `O valor total contratado, após o desconto concedido, é de ${valor}`
    : `O valor total contratado é de ${valor}`;
  const meios = fraseMeiosPagamentoContrato();
  const complemento = meios
    ? `, ${meios}, conforme os dados abaixo`
    : "";
  return `${nucleo}, a ser pago à vista até ${vencimento}${complemento}.`;
}

const FATURAMENTO_EXAMES_MENSALIDADE = [
  "Os exames clínicos avulsos e os exames complementares serão apurados mensalmente, considerando os atendimentos efetivamente realizados entre o primeiro e o último dia de cada mês.",
  "A cobrança será realizada mediante emissão de fatura discriminada, encaminhada à CONTRATANTE, com vencimento no quinto dia útil do mês seguinte ao da realização dos exames.",
  "Essas cobranças são independentes da remuneração do plano de gestão SST e permanecem devidas mesmo quando o plano tiver sido pago antecipadamente. Os exames clínicos incluídos na cobertura contratada não serão cobrados novamente na fatura.",
  "Esse vencimento refere-se às faturas dos exames e não ao vencimento das mensalidades do plano.",
] as const;

function parametrosRenovacao(ctx: ContratoNavarroContexto): {
  baseReais: number;
  incrementoReais: number;
} {
  const base = Number(ctx.renovacaoBaseReais);
  const incremento = Number(ctx.renovacaoIncrementoReais);
  return {
    baseReais:
      Number.isFinite(base) && base > 0 ? base : GESTAO_SST_RENOVACAO_BASE_REAIS,
    incrementoReais:
      Number.isFinite(incremento) && incremento > 0
        ? incremento
        : GESTAO_SST_RENOVACAO_INCREMENTO_REAIS,
  };
}

function semRenovacaoAutomatica(ctx: ContratoNavarroContexto): boolean {
  return ctx.renovacaoAutomatica === false;
}

function redigirCalculoRenovacao(ctx: ContratoNavarroContexto): string[] {
  const params = parametrosRenovacao(ctx);
  const base = formatCurrency(params.baseReais);
  const incremento = formatCurrency(params.incrementoReais);
  const exemplo = (quantidade: number) =>
    formatCurrency(valorMensalidadeRenovacaoGestaoSst(quantidade, params));
  const criterio = `Para zero ou um colaborador, a mensalidade será de ${base}. A partir do segundo, serão acrescentados ${incremento} por colaborador. Por exemplo: 2 colaboradores, ${exemplo(2)}; 10 colaboradores, ${exemplo(10)}; e 15 colaboradores, ${exemplo(15)} mensais.`;
  if (semRenovacaoAutomatica(ctx)) {
    return [
      "A continuidade dos serviços após o término desta vigência depende de novo acordo escrito entre as partes. Não há renovação automática nem cobrança automática de novo período.",
      `Se as partes ajustarem uma nova contratação por escrito, o valor mensal será calculado conforme a quantidade de colaboradores ativos no início do novo período, considerando as admissões e os desligamentos informados pela CONTRATANTE. ${criterio} Esse critério não altera as cobranças do período em andamento.`,
      "O pagamento antecipado e o desconto são válidos somente para o período contratado. Em uma nova contratação ajustada por escrito, o pagamento será mensal por boleto bancário, salvo acordo escrito de pagamento antecipado.",
    ];
  }
  return [
    "Na renovação, o valor mensal será calculado conforme a quantidade de colaboradores ativos no início do novo período, considerando as admissões e os desligamentos informados pela CONTRATANTE.",
    `${criterio} O novo valor será aplicado somente na renovação, sem alterar as cobranças do período em andamento.`,
    "O pagamento antecipado e o desconto são válidos somente para o período contratado. Na renovação, o pagamento será mensal por boleto bancário, salvo novo acordo escrito para pagamento antecipado.",
  ];
}

function redigirRenovacaoSimplificada(
  ctx: ContratoNavarroContexto,
  avista: boolean
): string[] {
  const paragrafos: string[] = [];
  if (avista) {
    paragrafos.push(
      semRenovacaoAutomatica(ctx)
        ? "Não haverá mensalidades no período já pago antecipadamente. A continuidade dos serviços, se houver, dependerá de novo acordo escrito, no qual será definido o dia de vencimento. Não há cobrança automática de novo período."
        : "O dia de vencimento será definido na preparação da renovação. Não haverá mensalidades no período já pago antecipadamente. Quando houver cobrança mensal, serão 12 mensalidades por vigência, e a primeira vencerá no mês seguinte ao início da vigência renovada."
    );
  } else {
    const dia = diaVencimentoMensalidadeValido(ctx.diaVencimentoMensalidade);
    if (dia) {
      paragrafos.push(
        `As mensalidades vencerão no dia ${dia} de cada mês. A primeira vencerá no mês seguinte ao início do período cobrado mensalmente, totalizando 12 mensalidades por vigência.`
      );
    }
  }
  paragrafos.push(
    "As faturas dos exames continuam com vencimento no quinto dia útil do mês seguinte à realização dos atendimentos."
  );
  return paragrafos;
}

function redigirPagamentoMensalidadeAvista(ctx: ContratoNavarroContexto): {
  paragrafos: string[];
  bloco: ContratoBlocoPagamento | null;
  depois: string[];
} {
  const pagamento = ctx.pagamentoMensalidade;
  const meses = mesesVigenciaContexto(ctx);
  const bruto = pagamento?.valorBruto ?? 0;
  const desconto = pagamento?.desconto ?? 0;
  const final = pagamento?.valorFinal ?? 0;
  const vencimento = (ctx.dataContrato ?? "").trim().slice(0, 10);
  const paragrafos = [
    `A CONTRATANTE pagará à CONTRATADA, em pagamento antecipado, a remuneração da vigência de ${formatNumeroComExtenso(meses)} meses.`,
    `O valor mensal de referência é de ${formatMoedaComExtenso(ctx.valor)}, considerado o quantitativo de ${fraseQuantitativoColaboradores(ctx.colaboradores)}.`,
    `O valor bruto do período é de ${formatMoedaComExtenso(bruto)}.`,
  ];
  if (desconto > 0) {
    paragrafos.push(
      `Foi concedido desconto de ${formatMoedaComExtenso(desconto)}.`
    );
    paragrafos.push(
      "Esse desconto refere-se apenas ao pagamento antecipado desta vigência."
    );
  }
  paragrafos.push(
    "Admissões durante essa vigência não alteram o valor do plano já contratado. Os exames clínicos avulsos e os exames complementares permanecem sujeitos à cobrança separada."
  );
  const prazoRegistrado = ISO_DATA.test(vencimento);
  const introducaoPrazo = prazoRegistrado
    ? redigirInstrucaoPagamentoAvista(final, vencimento, desconto > 0)
    : "O prazo para o pagamento antecipado não está registrado nesta contratação e deverá ser ajustado por escrito antes da assinatura.";
  const linhas = linhasDadosPagamentoContrato();
  const bloco =
    linhas.length > 0
      ? {
          introducao: introducaoPrazo,
          linhas,
        }
      : null;
  if (!bloco) paragrafos.push(introducaoPrazo);
  const depois = [
    "A quitação depende da confirmação do pagamento.",
    ...FATURAMENTO_EXAMES_MENSALIDADE,
    ...redigirRenovacaoSimplificada(ctx, true),
  ];
  if ((pagamento?.valorPontual ?? 0) > 0) {
    depois.splice(
      1,
      0,
      `Serviços pontuais adicionais, no valor de ${formatMoedaComExtenso(pagamento?.valorPontual ?? 0)}, integram o total bruto uma única vez e não recebem desconto automático.`
    );
  }
  return { paragrafos, bloco, depois };
}

function paragrafoAlteracaoMeioVigencia(
  ctx: ContratoNavarroContexto
): string | null {
  const alt = ctx.alteracaoContratacao;
  if (!alt || alt.numeroParcela < 2) return null;
  const inicio = (ctx.vigenciaInicioIso ?? "").trim().slice(0, 10);
  const efeito = (alt.vigenciaInicioIso ?? "").trim().slice(0, 10);
  const vencimento = (alt.vencimentoIso ?? "").trim().slice(0, 10);
  if (!inicio || inicio !== efeito || !ISO_DATA.test(vencimento)) return null;
  return `A partir de ${formatDateIsoToBR(vencimento)} (mensalidade ${alt.numeroParcela}), o valor mensal contratado passa a ser ${formatMoedaComExtenso(ctx.valor)}, considerado o quantitativo de ${fraseQuantitativoColaboradores(ctx.colaboradores)}. As mensalidades com vencimento anterior a essa data permanecem nos valores já lançados. Esta alteração não retroage ao início da vigência.`;
}

function redigirPagamentoMensalidade(ctx: ContratoNavarroContexto): string[] {
  const meses = mesesVigenciaContexto(ctx);
  const efeito = paragrafoAlteracaoMeioVigencia(ctx);
  return [
    efeito ??
      `A CONTRATANTE pagará à CONTRATADA o valor mensal de ${formatMoedaComExtenso(ctx.valor)}, mediante ${formatNumeroComExtenso(meses)} mensalidades durante a vigência contratual, considerado o quantitativo de ${fraseQuantitativoColaboradores(ctx.colaboradores)}.`,
    "O pagamento mensal é a forma de pagamento de um compromisso anual correspondente à vigência contratada. Não há cobrança única do saldo nem antecipação automática das mensalidades.",
    ...FATURAMENTO_EXAMES_MENSALIDADE,
    ...redigirRenovacaoSimplificada(ctx, false),
  ];
}

function redigirReajustePontual(): string {
  return "Havendo continuidade da prestação após 12 (doze) meses da data deste contrato, os valores então vigentes poderão ser reajustados pelo IPCA, ou por outro índice oficial que legalmente venha a substituí-lo.";
}

function redigirVigencia(ctx: ContratoNavarroContexto): string[] {
  if (ctx.modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE) {
    const meses = mesesVigenciaContexto(ctx);
    const vigencia = vigenciaContratualConfiavel(
      ctx.vigenciaInicioIso,
      ctx.vigenciaFimIso
    );
    const paragrafos = [
      `O presente instrumento é celebrado pelo prazo de ${formatNumeroComExtenso(meses)} meses.`,
    ];
    if (vigencia) {
      paragrafos.push(
        `A vigência inicial tem início em ${formatDateIsoToBR(vigencia.inicio)} e término em ${formatDateIsoToBR(vigencia.fim)}.`
      );
    }
    if (semRenovacaoAutomatica(ctx)) {
      paragrafos.push(
        "A vigência deste contrato é de 12 meses. Ao término desse período, o contrato será encerrado, sem renovação automática. Caso tenha interesse na continuidade dos serviços, caberá à CONTRATANTE entrar em contato com a CONTRATADA para ajustar uma nova contratação, mediante acordo escrito entre as partes."
      );
      paragrafos.push(
        "O encerramento da vigência não afasta o pagamento de valores relativos aos serviços prestados e às parcelas da contratação, inclusive quando seus vencimentos ocorrerem após o término da vigência."
      );
    } else {
      paragrafos.push(
        `Ao término da vigência, o contrato será automaticamente renovado por períodos sucessivos de ${formatNumeroComExtenso(meses)} meses, salvo comunicação escrita de qualquer das partes com antecedência mínima de ${formatNumeroComExtenso(CONTRATO_AVISO_PREVIO_DIAS)} dias do término da vigência para impedir a próxima renovação.`
      );
    }
    paragrafos.push(...redigirCalculoRenovacao(ctx));
    paragrafos.push(
      semRenovacaoAutomatica(ctx)
        ? "O pagamento mensal é a forma de pagamento de um compromisso anual correspondente à vigência contratada."
        : "O pagamento mensal é a forma de pagamento de um compromisso anual, inclusive nas vigências renovadas."
    );
    paragrafos.push(
      "A desistência imotivada da CONTRATANTE durante uma vigência não afasta o compromisso financeiro até o término dessa vigência e não gera multa adicional de cancelamento."
    );
    if (ctx.pagamentoMensalidade?.forma === "avista") {
      paragrafos.push(
        semRenovacaoAutomatica(ctx)
          ? "No pagamento antecipado, a desistência imotivada não gera devolução do valor daquele período. A ausência de vencimentos mensais do plano limita-se ao período efetivamente pago antecipadamente. A continuidade, se houver, dependerá de novo acordo escrito. Nesse acordo, a forma de cobrança será a ajustada por escrito, sem cobrança automática de novo período."
          : "No pagamento antecipado, a desistência imotivada não gera devolução do valor daquele período. A ausência de vencimentos mensais do plano limita-se ao período efetivamente pago antecipadamente. Nas renovações, a cobrança do plano segue a forma mensal prevista na cláusula de pagamento, salvo ajuste escrito em contrário antes do início do novo período."
      );
    } else {
      paragrafos.push(
        "No pagamento mensal, permanecem devidas as mensalidades até o fim da vigência, nos vencimentos originalmente previstos, sem antecipação automática do saldo."
      );
    }
    paragrafos.push(
      "Essa regra de desistência imotivada não impede a rescisão por descumprimento da CONTRATADA nem afasta direitos de rescisão ou de restituição previstos na legislação aplicável."
    );
    return paragrafos;
  }
  return [
    "O presente contrato vigorará até a conclusão dos serviços discriminados na proposta comercial que o integra, sem prejuízo das obrigações legais de guarda, disponibilização e atualização dos documentos de SST quando exigidas pela legislação.",
  ];
}

function redigirRescisao(_ctx: ContratoNavarroContexto): string[] {
  return [
    "Qualquer das partes poderá rescindir o presente instrumento em caso de descumprimento contratual da outra parte, mediante comunicação escrita, assegurada a possibilidade de saneamento no prazo razoável indicado na notificação, quando a natureza da obrigação o permitir.",
  ];
}

function redigirInadimplencia(modalidade: OrcamentoModalidade): string[] {
  const base = [
    `O atraso no pagamento sujeitará a CONTRATANTE à multa de ${CONTRATO_INADIMPLENCIA.multaPercentual}% (dois por cento) sobre o valor em atraso, acrescida de juros de mora de ${CONTRATO_INADIMPLENCIA.jurosMesPercentual}% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso, sem prejuízo da correção aplicável.`,
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

function montarClausulasContrato(
  ctx: ContratoNavarroContexto
): ContratoClausula[] {
  const pagamentoAvista =
    ctx.modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE &&
    ctx.pagamentoMensalidade?.forma === "avista"
      ? redigirPagamentoMensalidadeAvista(ctx)
      : null;
  const pagamento = pagamentoAvista
    ? pagamentoAvista.paragrafos
    : ctx.modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE
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
        "Rede credenciada. Os exames ocupacionais serão realizados na rede credenciada da CONTRATADA, conforme disponibilidade e regras de atendimento vigentes.",
        "PGR. Elaboração e gerenciamento do Programa de Gerenciamento de Riscos (PGR), nos termos da NR-01, contemplando o inventário de riscos e o plano de ação do estabelecimento da CONTRATANTE, com atualizações quando houver alteração das informações necessárias à execução, devidamente comunicadas pela CONTRATANTE.",
        "LTCAT. Elaboração do Laudo Técnico das Condições do Ambiente de Trabalho, nos termos da legislação previdenciária e de SST aplicável, com base nas informações e nas condições do estabelecimento informadas pela CONTRATANTE.",
        "Avaliação de Riscos Psicossociais – NR-01, conforme metodologia e escopo previstos na proposta comercial.",
        "eSocial. Gestão e envio dos eventos de Saúde e Segurança do Trabalho no eSocial (S-2210, S-2220 e S-2240), nos termos da legislação aplicável e do escopo previsto na proposta comercial.",
        ...(ctx.modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE
          ? redigirExamesGestaoMensalidade(ctx)
          : [
              "Exames ocupacionais. Realização dos exames clínicos ocupacionais previstos no PCMSO e na proposta comercial, incluindo os ASOs correspondentes ao quantitativo contratado.",
              "Exames complementares não estão incluídos no valor contratado e serão cobrados à parte, mediante necessidade prevista no PCMSO e autorização da CONTRATANTE. Incluem-se, quando aplicáveis, exames tais como audiometria, espirometria, exames laboratoriais e demais exames complementares previstos no PCMSO.",
              redigirColaboradores(ctx.colaboradores),
              ...redigirAdicionaisPontual(),
            ]),
      ],
    },
    {
      numero: "4",
      titulo: "DO PAGAMENTO",
      paragrafos:
        ctx.modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE
          ? pagamento
          : [...pagamento, redigirReajustePontual()],
      blocoPagamento: pagamentoAvista?.bloco ?? undefined,
      paragrafosApos: pagamentoAvista?.depois,
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
        ...redigirVigencia(ctx),
        ...redigirRescisao(ctx),
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

function servicoContratado(
  servicos: string[],
  teste: RegExp
): boolean {
  return servicos.some((item) => teste.test(item));
}

export function servicosEfetivamenteContratados(nomes: string[]): string[] {
  const saida: string[] = [];
  const vistos = new Set<string>();
  for (const nome of nomes) {
    const texto = nome.trim();
    if (!texto) continue;
    const inclusos = resolveItensInclusosServico({ nome: texto });
    const itens = inclusos.length > 0 ? inclusos : [texto];
    for (const item of itens) {
      const limpo = item.trim();
      const chave = limpo.toLocaleLowerCase("pt-BR");
      if (!chave || vistos.has(chave)) continue;
      vistos.add(chave);
      saida.push(limpo);
    }
  }
  return saida;
}

function redigirValorExameClinicoAvulsoV2(ctx: ContratoNavarroContexto): string {
  const admissional = ctx.valorExameClinicoAvulso;
  const demissional = ctx.valorExameClinicoDemissional ?? admissional;
  const admissionalOk =
    admissional != null && Number.isFinite(admissional) && admissional > 0;
  const demissionalOk =
    demissional != null && Number.isFinite(demissional) && demissional > 0;
  if (!admissionalOk || !demissionalOk) {
    return "O valor do exame clínico avulso, com emissão do respectivo ASO, não está registrado nesta contratação e deverá ser ajustado por escrito antes da assinatura.";
  }
  const tipos =
    "admissional, periódico, demissional, retorno ao trabalho e mudança de risco ocupacional";
  if (admissional === demissional) {
    return `Para esta contratação, o exame clínico avulso é de ${formatMoedaComExtenso(admissional)}, por exame, com emissão do ASO, para ${tipos}.`;
  }
  return `Para esta contratação, o exame clínico avulso é de ${formatMoedaComExtenso(admissional)}, por exame, com emissão do ASO. O exame clínico demissional avulso desta contratação permanece em ${formatMoedaComExtenso(demissional)}, com emissão do ASO.`;
}

function redigirExamesGestaoMensalidadeV2(ctx: ContratoNavarroContexto): string[] {
  const quantitativo = fraseQuantitativoColaboradores(ctx.colaboradores);
  return [
    "Exames incluídos e avulsos.",
    `Cada colaborador abrangido pelo plano no início da vigência, dentro do quantitativo de ${quantitativo}, tem direito a um exame clínico de cada tipo por vigência, quando indicado: admissional, periódico, demissional, retorno ao trabalho e mudança de risco ocupacional, com emissão do ASO.`,
    "A utilização de um tipo não consome a cobertura de outro tipo.",
    "A repetição do mesmo tipo na mesma vigência é avulsa e será cobrada pelo preço do exame clínico avulso previsto na cláusula de valores.",
    "Exames complementares continuam cobrados separadamente, inclusive quando o exame clínico estiver incluído, conforme necessidade prevista no PCMSO e autorização da CONTRATANTE.",
    "Essa cobertura comercial não altera a indicação nem a periodicidade médica dos exames.",
    "O colaborador admitido durante a vigência passa a integrar a gestão de SST após a comunicação da admissão. Seus exames clínicos são avulsos durante essa vigência, pelo preço contratado para exame clínico avulso.",
    semRenovacaoAutomatica(ctx)
      ? "Em uma nova contratação ajustada por escrito, os colaboradores que permanecerem ativos e forem abrangidos pelo novo plano passam a ter a cobertura do novo ciclo. Não há renovação automática desta cobertura."
      : "Na renovação, os colaboradores que permanecerem ativos e forem abrangidos pelo plano renovado passam a ter a cobertura do novo ciclo.",
    `A dispensa do exame demissional, quando aplicável, segue a NR-7: menos de ${DISPENSA_DEMISSIONAL_NR7.graus1e2Dias} dias para os graus de risco 1 e 2 e menos de ${DISPENSA_DEMISSIONAL_NR7.graus3e4Dias} dias para os graus 3 e 4, contados do exame clínico ocupacional mais recente. A dispensa do exame não se confunde com a cobertura financeira nem a substitui.`,
  ];
}

function redigirAtendimentoV2(ctx: ContratoNavarroContexto): string[] {
  const servicos = servicosEfetivamenteContratados(ctx.servicos);
  const paragrafos = [
    "O atendimento objeto deste contrato compreende os serviços técnicos de SST discriminados no Anexo I, observados os itens abaixo somente quando integrarem esse anexo.",
  ];
  if (servicoContratado(servicos, /pcmso/i)) {
    paragrafos.push(
      "PCMSO. Elaboração e gestão do Programa de Controle Médico de Saúde Ocupacional, nos termos da NR-07, de acordo com as informações prestadas pela CONTRATANTE sobre suas atividades e seus colaboradores."
    );
  }
  paragrafos.push(
    "Rede credenciada. Os exames ocupacionais serão realizados na rede credenciada da CONTRATADA, conforme disponibilidade.",
    "Exames clínicos. Os exames clínicos ocupacionais serão realizados em até 3 (três) dias úteis após o recebimento da solicitação por e-mail com os dados completos do colaborador. Esse prazo não abrange exames complementares."
  );
  if (servicoContratado(servicos, /\bpgr\b/i)) {
    paragrafos.push(
      "PGR. Elaboração e gerenciamento do Programa de Gerenciamento de Riscos (PGR), nos termos da NR-01, contemplando o inventário de riscos e o plano de ação do estabelecimento da CONTRATANTE, com atualizações quando houver alteração das informações necessárias à execução, devidamente comunicadas pela CONTRATANTE."
    );
  }
  if (servicoContratado(servicos, /ltcat/i)) {
    paragrafos.push(
      "LTCAT. Elaboração do Laudo Técnico das Condições do Ambiente de Trabalho, nos termos da legislação previdenciária e de SST aplicável, com base nas informações e nas condições do estabelecimento informadas pela CONTRATANTE."
    );
  }
  if (servicoContratado(servicos, /psicossocia/i)) {
    paragrafos.push(
      "Avaliação de riscos psicossociais. O escopo e a metodologia constam do Anexo I."
    );
  }
  if (servicoContratado(servicos, /esocial/i)) {
    paragrafos.push(
      "eSocial. Gestão e envio dos eventos de Saúde e Segurança do Trabalho no eSocial (S-2210, S-2220 e S-2240), nos termos da legislação aplicável e do escopo do Anexo I."
    );
  }
  paragrafos.push(...redigirExamesGestaoMensalidadeV2(ctx));
  return paragrafos;
}

function redigirObjetoV2(numeroOrcamento: string): string {
  return `Prestação de serviços técnicos de Saúde e Segurança do Trabalho (SST), compreendendo exclusivamente os serviços contratados e discriminados no Anexo I deste instrumento e na Proposta Comercial nº ${numeroOrcamento}, que passam a integrar o presente contrato para todos os fins.`;
}

function clausulaAnexoI(ctx: ContratoNavarroContexto): ContratoClausula {
  const servicos = servicosEfetivamenteContratados(ctx.servicos);
  const numero = ctx.numeroOrcamento.trim() || "não informada";
  const paragrafos = [
    `Este anexo descreve os serviços efetivamente contratados e integra a Proposta Comercial nº ${numero}.`,
  ];
  if (servicos.length === 0) {
    paragrafos.push(
      "Nenhum serviço específico foi identificado além da Proposta Comercial indicada. O escopo limita-se ao que constar dessa proposta."
    );
  } else {
    paragrafos.push(
      "Serviços contratados:",
      ...servicos.map((servico, indice) => `${indice + 1}. ${servico}`)
    );
  }
  if (servicoContratado(servicos, /psicossocia/i)) {
    paragrafos.push(
      "Avaliação de riscos psicossociais. Escopo: avaliação dos fatores de riscos psicossociais relacionados ao trabalho e elaboração de relatório com resultados e recomendações.",
      "Metodologia: aplicação do questionário COPSOQ II, análise das respostas e apresentação consolidada dos resultados, preservando a confidencialidade dos participantes."
    );
  }
  return {
    numero: "I",
    titulo: "DOS SERVIÇOS CONTRATADOS",
    rotulo: "ANEXO I — DOS SERVIÇOS CONTRATADOS",
    paragrafos,
  };
}

const COBRANCA_EXAMES_SEPARADA_MENSAL =
  "As cobranças dos exames clínicos avulsos e complementares são separadas das mensalidades de gestão SST. Os exames clínicos incluídos na cobertura contratada não serão cobrados novamente.";

function faturamentoExamesV2(omitirDistincaoDeDatas: boolean): string[] {
  return FATURAMENTO_EXAMES_MENSALIDADE.filter(
    (paragrafo) =>
      !(
        omitirDistincaoDeDatas &&
        paragrafo.startsWith("Esse vencimento refere-se")
      )
  ).map((paragrafo) =>
    paragrafo.startsWith("Essas cobranças são independentes")
      ? COBRANCA_EXAMES_SEPARADA_MENSAL
      : paragrafo
  );
}

function redigirVencimentoMensalidadesV2(ctx: ContratoNavarroContexto): string[] {
  if (vencimentoMensalidadeQuintoDiaUtil(ctx.vencimentoRegraMensalidade)) {
    return [
      "As mensalidades vencem no quinto dia útil do respectivo mês. A primeira vence no mês seguinte ao início da vigência, totalizando 12 mensalidades por vigência. Essa opção não corresponde ao dia 05 fixo.",
    ];
  }
  const dia = diaVencimentoMensalidadeValido(ctx.diaVencimentoMensalidade);
  if (!dia) return [];
  return [
    `As mensalidades vencerão no dia ${dia} de cada mês. A primeira vencerá no mês seguinte ao início do período cobrado mensalmente, totalizando 12 mensalidades por vigência.`,
  ];
}

function redigirCompromissoERenovacaoPagamentoV2(
  ctx: ContratoNavarroContexto,
  avista: boolean
): string[] {
  if (!avista) {
    return [
      semRenovacaoAutomatica(ctx)
        ? "O pagamento mensal corresponde a um compromisso anual da vigência contratada. Não há cobrança única do saldo nem antecipação automática das mensalidades."
        : "O pagamento mensal corresponde a um compromisso anual, inclusive nas renovações automáticas. Não há cobrança única do saldo nem antecipação automática das mensalidades.",
    ];
  }
  return [
    semRenovacaoAutomatica(ctx)
      ? "O pagamento antecipado e o desconto, quando houver, são válidos somente para a vigência paga. Em uma nova contratação ajustada por escrito, o pagamento será mensal por boleto bancário, salvo acordo escrito de antecipação."
      : "O pagamento antecipado e o desconto, quando houver, são válidos somente para a vigência paga. Na renovação, o pagamento será mensal por boleto bancário, salvo novo acordo escrito de antecipação.",
  ];
}

function redigirPagamentoMensalidadeV2(ctx: ContratoNavarroContexto): string[] {
  const meses = mesesVigenciaContexto(ctx);
  const quinto = vencimentoMensalidadeQuintoDiaUtil(
    ctx.vencimentoRegraMensalidade
  );
  const multa = redigirInadimplencia(ctx.modalidade)[0];
  const efeito = paragrafoAlteracaoMeioVigencia(ctx);
  return [
    efeito ??
      `A CONTRATANTE pagará à CONTRATADA o valor bruto mensal de ${formatMoedaComExtenso(ctx.valor)}, mediante ${formatNumeroComExtenso(meses)} mensalidades durante a vigência contratual, considerado o quantitativo de ${fraseQuantitativoColaboradores(ctx.colaboradores)}.`,
    redigirValorExameClinicoAvulsoV2(ctx),
    ...faturamentoExamesV2(quinto),
    ...redigirVencimentoMensalidadesV2(ctx),
    ...redigirCompromissoERenovacaoPagamentoV2(ctx, false),
    multa,
  ];
}

function aplicarModeloGestaoSstV2(
  clausulas: ContratoClausula[],
  ctx: ContratoNavarroContexto
): ContratoClausula[] {
  const avista = ctx.pagamentoMensalidade?.forma === "avista";
  const quinto = vencimentoMensalidadeQuintoDiaUtil(
    ctx.vencimentoRegraMensalidade
  );
  const ajustadas = clausulas.map((clause) => {
    if (clause.numero === "2") {
      return {
        ...clause,
        paragrafos: [redigirObjetoV2(ctx.numeroOrcamento)],
      };
    }
    if (clause.numero === "3") {
      return { ...clause, paragrafos: redigirAtendimentoV2(ctx) };
    }
    if (clause.numero === "4") {
      if (avista) {
        const multa = redigirInadimplencia(ctx.modalidade)[0];
        return {
          ...clause,
          titulo: "DOS VALORES, PAGAMENTOS E VENCIMENTOS",
          paragrafos: clause.paragrafos,
          paragrafosApos: [
            ...(clause.paragrafosApos ?? []).filter(
              (paragrafo) =>
                !(
                  quinto && paragrafo.startsWith("Esse vencimento refere-se")
                )
            ),
            redigirValorExameClinicoAvulsoV2(ctx),
            ...redigirCompromissoERenovacaoPagamentoV2(ctx, true),
            multa,
          ],
        };
      }
      return {
        ...clause,
        titulo: "DOS VALORES, PAGAMENTOS E VENCIMENTOS",
        paragrafos: redigirPagamentoMensalidadeV2(ctx),
      };
    }
    if (clause.numero === "5") {
      return {
        ...clause,
        paragrafos: [
          ...clause.paragrafos,
          "Afastamentos programados serão comunicados pela CONTRATANTE assim que tiver conhecimento.",
          "Afastamentos imprevistos serão comunicados pela CONTRATANTE até o próximo dia útil após tomar conhecimento.",
          "A previsão de retorno será comunicada com antecedência, para que a CONTRATADA possa organizar eventual exame de retorno ao trabalho.",
          "Cada parte informará a outra, tão logo tenha conhecimento, sobre incidente de segurança que possa afetar dados pessoais tratados no âmbito deste contrato.",
        ],
      };
    }
    if (clause.numero === "6") {
      return {
        ...clause,
        paragrafos: clause.paragrafos.map((paragrafo) =>
          paragrafo.startsWith("Cada parte informará a outra")
            ? "A comunicação entre as partes sobre incidente de segurança que possa afetar dados pessoais tratados no âmbito deste contrato observa a obrigação prevista na cláusula das obrigações das partes."
            : paragrafo
        ),
      };
    }
    if (clause.numero === "7") {
      return {
        ...clause,
        paragrafos: clause.paragrafos
          .filter(
            (paragrafo) =>
              !paragrafo.startsWith(
                "O pagamento antecipado e o desconto são válidos somente"
              ) &&
              !paragrafo.startsWith(
                "O pagamento mensal é a forma de pagamento de um compromisso anual"
              ) &&
              !paragrafo.startsWith("O atraso no pagamento sujeitará")
          )
          .map((paragrafo) => {
            if (
              paragrafo.startsWith(
                "O presente instrumento é celebrado pelo prazo de"
              )
            ) {
              return "O presente contrato terá vigência de 12 (doze) meses contados da data de sua assinatura.";
            }
            if (
              paragrafo.startsWith("A vigência deste contrato é de 12 meses. ")
            ) {
              return paragrafo.slice(
                "A vigência deste contrato é de 12 meses. ".length
              );
            }
            if (paragrafo.includes("possibilidade de saneamento")) {
              return "Qualquer das partes poderá rescindir imediatamente o presente instrumento em caso de descumprimento contratual da outra parte, mediante comunicação escrita.";
            }
            return paragrafo;
          }),
      };
    }
    return clause;
  });
  return [...ajustadas, clausulaAnexoI(ctx)];
}

export function buildClausulasContrato(
  ctx: ContratoNavarroContexto
): ContratoClausula[] {
  const clausulas = montarClausulasContrato(ctx);
  if (
    ctx.modeloVersao === 2 &&
    ctx.modalidade === ORCAMENTO_MODALIDADE_MENSALIDADE
  ) {
    return aplicarModeloGestaoSstV2(clausulas, ctx);
  }
  return clausulas;
}

export function textoPlanoContrato(
  clausulas: ContratoClausula[],
  estilo: "sst" | "aet" = "sst"
): string {
  return clausulas
    .map((c) => {
      const itens = (c.itens ?? []).map((item) => `• ${item}`).join("\n");
      const tabela = c.tabela
        ? [
            c.tabela.colunas.join(" | "),
            ...c.tabela.linhas.map((linha) => linha.join(" | ")),
          ].join("\n")
        : "";
      const bloco = c.blocoPagamento
        ? [
            c.blocoPagamento.introducao,
            "DADOS PARA PAGAMENTO",
            ...c.blocoPagamento.linhas.map(
              (linha) => `${linha.rotulo}: ${linha.valor}`
            ),
          ].join("\n")
        : "";
      const corpo = [
        ...c.paragrafos,
        itens,
        tabela,
        bloco,
        ...(c.paragrafosApos ?? []),
      ]
        .filter(Boolean)
        .join("\n");
      return `${rotuloClausulaContrato(c, estilo)}\n${corpo}`;
    })
    .join("\n\n");
}
