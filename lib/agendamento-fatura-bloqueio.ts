import type { FaturaRecord, FaturaTipo } from "@/lib/types";

export const AGENDAMENTO_BLOQUEADO_FATURA_MSG =
  "Este agendamento não pode ser alterado porque já está vinculado a uma fatura emitida/paga/vencida.";

export { AGENDAMENTO_FATURA_SOMENTE_DOCUMENTACAO_MSG } from "@/lib/agendamento-documentacao";

export type FaturaClienteStatusExibicao =
  | "Aberta para emissão"
  | "Cancelada"
  | "Emitida"
  | "Paga"
  | "Vencida"
  | "Em aberto";

export interface AgendamentoFaturaBloqueio {
  bloqueado: boolean;
  faturaId?: string;
  faturaNumero?: string;
  faturaStatusLabel?: FaturaClienteStatusExibicao;
}

export type FaturaVinculoAgendamento = Pick<
  FaturaRecord,
  "id" | "numero" | "status" | "pago" | "data_vencimento" | "tipo"
>;

export function deriveFaturaClienteStatusExibicao(
  fatura: Pick<FaturaRecord, "status" | "pago" | "data_vencimento">
): FaturaClienteStatusExibicao {
  if (fatura.status === "cancelada") return "Cancelada";
  if (fatura.status === "rascunho") return "Aberta para emissão";
  if (fatura.status === "emitida") {
    if (fatura.pago) return "Paga";

    const hoje = new Date().toISOString().split("T")[0];
    const vencimento = fatura.data_vencimento.split("T")[0];
    if (vencimento < hoje) return "Vencida";

    return "Em aberto";
  }

  return "Emitida";
}

export function faturaClienteBloqueiaEdicaoAgendamento(
  fatura: Pick<FaturaRecord, "status" | "tipo">
): boolean {
  return fatura.tipo === "cliente" && fatura.status === "emitida";
}

export function podeCancelarExcepcionalAdminPorFatura(
  bloqueio: AgendamentoFaturaBloqueio,
  isAdmin: boolean
): boolean {
  return Boolean(bloqueio.bloqueado && isAdmin);
}

export const CANCELAMENTO_EXCEPCIONAL_POS_CANCEL_TOAST =
  "Agendamento cancelado. Reemita ou ajuste a fatura do cliente para gerar o PDF correto.";

export function resolverBloqueioAgendamentoFatura(
  faturas: FaturaVinculoAgendamento[]
): AgendamentoFaturaBloqueio {
  const faturasCliente = faturas.filter((f) => f.tipo === ("cliente" as FaturaTipo));
  const bloqueadora = faturasCliente.find((f) => f.status === "emitida");

  if (!bloqueadora) {
    return { bloqueado: false };
  }

  return {
    bloqueado: true,
    faturaId: bloqueadora.id,
    faturaNumero: bloqueadora.numero,
    faturaStatusLabel: deriveFaturaClienteStatusExibicao(bloqueadora),
  };
}

export class AgendamentoBloqueadoFaturaError extends Error {
  readonly code = "AGENDAMENTO_BLOQUEADO_FATURA" as const;

  constructor(readonly bloqueio: AgendamentoFaturaBloqueio) {
    super(AGENDAMENTO_BLOQUEADO_FATURA_MSG);
    this.name = "AgendamentoBloqueadoFaturaError";
  }
}

export function isAgendamentoBloqueadoFaturaError(
  err: unknown
): err is AgendamentoBloqueadoFaturaError {
  return err instanceof AgendamentoBloqueadoFaturaError;
}
