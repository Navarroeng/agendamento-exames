import {
  formatDateIsoToBR,
  todayIsoSaoPaulo,
} from "@/lib/agendamento-datetime";
import { formatCurrency } from "@/lib/money";
import type { FaturaRecord } from "@/lib/types";

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
 * Vencida somente quando a data civil de vencimento é anterior a hoje
 * em America/Sao_Paulo. Vencimento no próprio dia ainda não está vencido.
 */
export function faturaEstaVencidaParaLembrete(
  dataVencimento: string,
  hojeIso: string
): boolean {
  const vencimento = dataIsoCivil(dataVencimento);
  const hoje = dataIsoCivil(hojeIso);
  if (!ISO_DATE.test(vencimento) || !ISO_DATE.test(hoje)) {
    throw new Error("Data de vencimento inválida para o lembrete.");
  }
  return vencimento < hoje;
}

export function buildLembreteFaturaTexto(params: {
  numero: string;
  clienteNome: string;
  valor: number;
  dataVencimento: string;
  hojeIso?: string;
}): { assunto: string; mensagem: string; vencida: boolean } {
  const numero = params.numero.trim() || "—";
  const cliente = params.clienteNome.trim() || "cliente";
  const valor = formatCurrency(Number(params.valor));
  const data = formatDateIsoToBR(dataIsoCivil(params.dataVencimento));
  if (!data) {
    throw new Error("Data de vencimento inválida para o lembrete.");
  }

  const hoje = params.hojeIso?.trim() || todayIsoSaoPaulo();
  const vencida = faturaEstaVencidaParaLembrete(params.dataVencimento, hoje);
  const encerramento = [
    "Caso o pagamento já tenha sido realizado, por favor, desconsidere este lembrete e encaminhe o comprovante para conferência.",
    "",
    "Atenciosamente,",
    "Navarro Engenharia",
  ].join("\n");

  if (vencida) {
    return {
      vencida: true,
      assunto: `Lembrete de pagamento — Fatura ${numero} em aberto | Navarro Engenharia`,
      mensagem: [
        `Olá, ${cliente}.`,
        "",
        `Até o momento, não identificamos o pagamento da fatura ${numero}, no valor de ${valor}, com vencimento em ${data}.`,
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
      `Passando para lembrar que a fatura ${numero}, no valor de ${valor}, tem vencimento em ${data}.`,
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
