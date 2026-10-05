import {
  formatDateIsoSaoPaulo,
  formatDateIsoToBR,
  todayIsoSaoPaulo,
} from "@/lib/agendamento-datetime";
import { isEmailValido } from "@/lib/email-validacao";
import { formatCurrency } from "@/lib/money";
import type { FaturaRecord, FaturaStatus, FaturaTipo } from "@/lib/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const FATURA_LEMBRETE_ASSUNTO_MAX = 180;
export const FATURA_LEMBRETE_MENSAGEM_MAX = 4000;

export type FaturaLembreteSituacao = "aceito_resend";

export interface FaturaLembreteRegistro {
  id: string;
  fatura_id: string;
  enviado_em: string;
  destinatario: string;
  usuario_id: string | null;
  usuario_nome: string;
  assunto: string;
  mensagem: string;
  resend_message_id: string | null;
  situacao: FaturaLembreteSituacao;
}

export const FATURA_LEMBRETE_SITUACAO_LABEL: Record<FaturaLembreteSituacao, string> =
  {
    aceito_resend: "Aceito pelo Resend",
  };

export const FATURA_LEMBRETE_ENTREGA_NAO_CONFIRMADA =
  "A entrega ao destinatário não é confirmada por este registro.";

type FaturaLembreteElegibilidade = Pick<
  FaturaRecord,
  "tipo" | "status" | "pago"
>;

/** Fatura de cliente emitida ou vencida, ainda sem pagamento. */
export function faturaPermiteLembrete(
  fatura: FaturaLembreteElegibilidade
): boolean {
  return motivoBloqueioLembrete(fatura) === null;
}

export function motivoBloqueioLembrete(
  fatura: FaturaLembreteElegibilidade
): string | null {
  if (fatura.tipo !== "cliente") {
    return "Lembrete disponível apenas para faturas de cliente.";
  }
  if (fatura.status === "cancelada") {
    return "Não é possível enviar lembrete de fatura cancelada.";
  }
  if (fatura.pago) {
    return "Não é possível enviar lembrete de fatura paga.";
  }
  if (fatura.status !== "emitida" && fatura.status !== "vencida") {
    return "Esta fatura não está em aberto. O lembrete só pode ser enviado para faturas emitidas ou vencidas.";
  }
  return null;
}

export function dataIsoCivil(value: string | null | undefined): string {
  return String(value ?? "").trim().slice(0, 10);
}

/**
 * Dia civil do vencimento, sem converter o campo date pelo fuso.
 * `2026-10-05` e `2026-10-05T00:00:00.000Z` permanecem 2026-10-05.
 * Não usar `formatDateIsoSaoPaulo` aqui: meia-noite UTC cairia no dia anterior.
 */
export function dataVencimentoCivil(value: string | null | undefined): string {
  return dataIsoCivil(value);
}

export type MomentoLembreteFatura = "hoje" | "futuro" | "vencido";

/**
 * Compara o dia civil do vencimento com o dia de hoje em America/Sao_Paulo.
 * O "hoje" vem de `todayIsoSaoPaulo`; o vencimento não é deslocado.
 */
export function classificarVencimentoLembrete(
  dataVencimento: string,
  hojeIso: string
): MomentoLembreteFatura {
  const vencimento = dataVencimentoCivil(dataVencimento);
  const hoje = dataIsoCivil(hojeIso);
  if (!ISO_DATE.test(vencimento) || !ISO_DATE.test(hoje)) {
    throw new Error("Data de vencimento inválida para o lembrete.");
  }
  if (vencimento === hoje) return "hoje";
  if (vencimento < hoje) return "vencido";
  return "futuro";
}

/**
 * Vencida somente quando a data civil de vencimento é anterior a hoje
 * em America/Sao_Paulo. Vencimento no próprio dia ainda não está vencido.
 */
export function faturaEstaVencidaParaLembrete(
  dataVencimento: string,
  hojeIso: string
): boolean {
  return classificarVencimentoLembrete(dataVencimento, hojeIso) === "vencido";
}

const MESES_COMPETENCIA = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/**
 * Competência gravada na fatura, como “setembro/2026”.
 * Usa `mes_referencia` e, na falta dele, `periodo_inicio`.
 * Não deriva o mês da data de envio nem do vencimento.
 */
export function competenciaLembreteExtenso(params: {
  mesReferencia?: string | null;
  periodoInicio?: string | null;
}): string | null {
  const bruto = params.mesReferencia?.trim() || params.periodoInicio?.trim() || "";
  const match = bruto.split("T")[0]?.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const mes = Number(match[2]);
  const nome = MESES_COMPETENCIA[mes - 1];
  if (!nome) return null;
  return `${nome}/${match[1]}`;
}

export type EscopoLembreteFatura = "exames_ocupacionais" | "outro";

function fraseCorpoLembrete(params: {
  momento: MomentoLembreteFatura;
  numero: string;
  valor: string;
  data: string;
  competencia: string | null;
}): string {
  if (params.competencia) {
    const referencia = `a fatura referente aos exames ocupacionais realizados no mês de ${params.competencia}, no valor de ${params.valor}`;
    if (params.momento === "hoje") {
      return `Passando para lembrar que ${referencia}, vence na data de hoje.`;
    }
    if (params.momento === "vencido") {
      return `Até o momento, não identificamos o pagamento d${referencia}, com vencimento em ${params.data}.`;
    }
    return `Passando para lembrar que ${referencia}, tem vencimento em ${params.data}.`;
  }

  if (params.momento === "hoje") {
    return `Lembramos que a fatura ${params.numero}, no valor de ${params.valor}, vence na data de hoje.`;
  }
  if (params.momento === "vencido") {
    return `Até o momento, não identificamos o pagamento da fatura ${params.numero}, no valor de ${params.valor}, com vencimento em ${params.data}.`;
  }
  return `Passando para lembrar que a fatura ${params.numero}, no valor de ${params.valor}, tem vencimento em ${params.data}.`;
}

export function buildLembreteFaturaTexto(params: {
  numero: string;
  clienteNome: string;
  valor: number;
  dataVencimento: string;
  hojeIso?: string;
  mesReferencia?: string | null;
  periodoInicio?: string | null;
  escopo?: EscopoLembreteFatura;
}): { assunto: string; mensagem: string; vencida: boolean } {
  const numero = params.numero.trim() || "—";
  const cliente = params.clienteNome.trim() || "cliente";
  const valor = formatCurrency(Number(params.valor));
  const data = formatDateIsoToBR(dataIsoCivil(params.dataVencimento));
  if (!data) {
    throw new Error("Data de vencimento inválida para o lembrete.");
  }

  const hoje = params.hojeIso?.trim() || todayIsoSaoPaulo();
  const momento = classificarVencimentoLembrete(params.dataVencimento, hoje);
  const competencia =
    params.escopo === "exames_ocupacionais"
      ? competenciaLembreteExtenso({
          mesReferencia: params.mesReferencia,
          periodoInicio: params.periodoInicio,
        })
      : null;
  const corpo = fraseCorpoLembrete({
    momento,
    numero,
    valor,
    data,
    competencia,
  });
  const encerramento = [
    "Caso o pagamento já tenha sido realizado, por favor, desconsidere este lembrete e encaminhe o comprovante para conferência.",
    "",
    "Atenciosamente,",
    "Navarro Engenharia",
  ].join("\n");

  if (momento === "hoje") {
    return {
      vencida: false,
      assunto: `Sua fatura vence hoje — Fatura ${numero} | Navarro Engenharia`,
      mensagem: [
        `Olá, ${cliente}.`,
        "",
        corpo,
        "",
        "Os dados para pagamento estão disponíveis abaixo.",
        "",
        encerramento,
      ].join("\n"),
    };
  }

  if (momento === "vencido") {
    return {
      vencida: true,
      assunto: `Lembrete de pagamento — Fatura ${numero} em aberto | Navarro Engenharia`,
      mensagem: [
        `Olá, ${cliente}.`,
        "",
        corpo,
        "",
        "Pedimos, por gentileza, a regularização do pagamento. Os dados para pagamento estão disponíveis abaixo.",
        "",
        encerramento,
      ].join("\n"),
    };
  }

  return {
    vencida: false,
    assunto: `Lembrete de vencimento — Fatura ${numero} | Navarro Engenharia`,
    mensagem: [
      `Olá, ${cliente}.`,
      "",
      corpo,
      "",
      "Os dados para pagamento estão disponíveis abaixo.",
      "",
      encerramento,
    ].join("\n"),
  };
}

export function validarConteudoLembrete(params: {
  assunto: string;
  mensagem: string;
}): { assunto: string; mensagem: string } {
  const assunto = params.assunto.replace(/\u0000/g, "").trim();
  const mensagem = params.mensagem.replace(/\u0000/g, "").trim();

  if (!assunto) {
    throw new Error("Informe o assunto do lembrete.");
  }
  if (/[\r\n]/.test(assunto)) {
    throw new Error("O assunto não pode conter quebras de linha.");
  }
  if (assunto.length > FATURA_LEMBRETE_ASSUNTO_MAX) {
    throw new Error("O assunto do lembrete é longo demais.");
  }
  if (!mensagem) {
    throw new Error("Informe a mensagem do lembrete.");
  }
  if (mensagem.length > FATURA_LEMBRETE_MENSAGEM_MAX) {
    throw new Error("A mensagem do lembrete é longa demais.");
  }

  return { assunto, mensagem };
}

export function formatLembreteDataHoraSp(
  iso: string | null | undefined
): string | null {
  if (!iso?.trim()) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${data} às ${hora}`;
}

export function textoUltimoLembrete(
  iso: string | null | undefined
): string | null {
  const quando = formatLembreteDataHoraSp(iso);
  if (!quando) return null;
  return `Último lembrete enviado em ${quando}`;
}

export function emailOriginalLembrete(
  fatura: Pick<FaturaRecord, "fatura_enviada_email">,
  emailSugerido?: string | null
): string {
  return fatura.fatura_enviada_email?.trim() || emailSugerido?.trim() || "";
}

export const FATURA_LEMBRETE_LOTE_LOCK_MS = 3 * 60 * 1000;

export type FaturaLembreteHojeAlvo = {
  id: string;
  numero: string;
  tipo: FaturaTipo;
  status: FaturaStatus;
  pago: boolean;
  referencia_id: string | null;
    referencia_nome: string;
    data_vencimento: string;
    mes_referencia?: string | null;
    periodo_inicio?: string | null;
    valor_total: number;
  fatura_enviada_email?: string | null;
  fatura_enviada_em?: string | null;
};

export type EnvioFaturamentoEmpresa = {
  id: string;
  referencia_id: string | null;
  fatura_enviada_email?: string | null;
  fatura_enviada_em?: string | null;
};

/** Lembrete aceito cujo instante cai no dia civil de São Paulo. */
export function lembreteAceitoNoDia(
  enviadoEm: string | null | undefined,
  hojeIso: string
): boolean {
  const hoje = dataIsoCivil(hojeIso);
  if (!ISO_DATE.test(hoje) || !enviadoEm?.trim()) return false;
  return formatDateIsoSaoPaulo(enviadoEm) === hoje;
}

/**
 * Lote de hoje: status real `emitida`, sem pagamento, vencimento civil = hoje.
 * Não olha filtro de tela, mês ou página.
 */
export function faturaElegivelLembreteHoje(
  fatura: Pick<
    FaturaLembreteHojeAlvo,
    "tipo" | "status" | "pago" | "data_vencimento"
  >,
  hojeIso: string
): boolean {
  if (fatura.tipo !== "cliente") return false;
  if (fatura.status !== "emitida") return false;
  if (fatura.pago) return false;
  try {
    return classificarVencimentoLembrete(fatura.data_vencimento, hojeIso) === "hoje";
  } catch {
    return false;
  }
}

export function selecionarFaturasLembreteHoje<T extends FaturaLembreteHojeAlvo>(
  faturas: T[],
  hojeIso: string
): T[] {
  return faturas.filter((fatura) => faturaElegivelLembreteHoje(fatura, hojeIso));
}

/**
 * E-mail de faturamento só desta empresa: o da própria fatura ou o último
 * envio confirmado do mesmo `referencia_id`. Nunca o de outra empresa.
 */
export function resolverEmailFaturamentoEmpresa(
  fatura: Pick<
    FaturaLembreteHojeAlvo,
    "id" | "referencia_id" | "fatura_enviada_email"
  >,
  envios: EnvioFaturamentoEmpresa[]
): string {
  const proprio = fatura.fatura_enviada_email?.trim() ?? "";
  if (isEmailValido(proprio)) return proprio;

  const ref = fatura.referencia_id?.trim();
  if (!ref) return "";

  let melhor: { email: string; ts: number } | null = null;
  for (const envio of envios) {
    if (envio.referencia_id !== ref) continue;
    if (envio.id === fatura.id) continue;
    const email = envio.fatura_enviada_email?.trim() ?? "";
    const em = envio.fatura_enviada_em?.trim() ?? "";
    if (!isEmailValido(email) || !em) continue;
    const ts = new Date(em).getTime();
    if (Number.isNaN(ts)) continue;
    if (!melhor || ts > melhor.ts) melhor = { email, ts };
  }
  return melhor?.email ?? "";
}

export function chaveEmpresaLembrete(fatura: {
  referencia_id: string | null;
  referencia_nome: string;
}): string {
  const id = fatura.referencia_id?.trim();
  if (id) return `id:${id}`;
  return `nome:${fatura.referencia_nome.trim().toLowerCase()}`;
}

export type PendenteLembreteHoje = {
  id: string;
  numero: string;
  empresa: string;
  empresaChave?: string;
  valor: number;
  email: string;
};

export function montarConfirmacaoLembretesHoje(pendentes: PendenteLembreteHoje[]): {
  faturas: number;
  empresas: number;
  destinatarios: number;
  valorTotal: number;
  semEmail: PendenteLembreteHoje[];
  comEmail: PendenteLembreteHoje[];
} {
  const semEmail = pendentes.filter((item) => !isEmailValido(item.email));
  const comEmail = pendentes.filter((item) => isEmailValido(item.email));
  const empresas = new Set(
    pendentes.map(
      (item) => item.empresaChave?.trim() || item.empresa.trim().toLowerCase()
    )
  );
  const valorTotal = comEmail.reduce((soma, item) => soma + Number(item.valor), 0);
  return {
    faturas: pendentes.length,
    empresas: empresas.size,
    destinatarios: comEmail.length,
    valorTotal,
    semEmail,
    comEmail,
  };
}

export function explicacaoBotaoLembretesHoje(
  elegiveis: number,
  pendentes: number
): string {
  if (pendentes > 0) {
    return pendentes === 1
      ? "1 fatura emitida vence hoje e ainda não teve lembrete aceito pelo Resend."
      : `${pendentes} faturas emitidas vencem hoje e ainda não tiveram lembrete aceito pelo Resend.`;
  }
  if (elegiveis === 0) return "Nenhuma fatura emitida vence hoje.";
  return "Todas as faturas que vencem hoje já tiveram lembrete aceito pelo Resend.";
}

/** Trava do lote: livre, ocupada ou expirada para outra tentativa assumir. */
export function decidirReservaLote(
  existente: { iniciadoEm: string } | null,
  agoraMs: number,
  lockMs: number = FATURA_LEMBRETE_LOTE_LOCK_MS
): "livre" | "ocupado" | "expirada" {
  if (!existente) return "livre";
  const inicio = new Date(existente.iniciadoEm).getTime();
  if (Number.isNaN(inicio) || agoraMs - inicio >= lockMs) return "expirada";
  return "ocupado";
}
