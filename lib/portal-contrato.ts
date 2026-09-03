/**
 * Portal do Cliente — card Contrato e acesso aos serviços.
 * Reutiliza regras já existentes; não cria lógica financeira/contratual paralela.
 */

import { getContratoAtual } from "@/lib/cliente-contrato-mappers";
import { isClienteDisponivelAgendamento } from "@/lib/cliente-disponivel-agendamento";
import { contratoLiberaAgendamento } from "@/lib/cliente-pode-agendar";
import {
  formatProcuracaoStatusLabel,
  normalizeProcuracaoStatus,
  type ProcuracaoStatus,
} from "@/lib/cliente-procuracao";
import { formatDateBR } from "@/lib/format";
import type { ClienteContratoRecord, ClienteRecord } from "@/lib/types";

export const PORTAL_CONTRATO_FALLBACK = "Não informado";

export type PortalContratoBadgeTone = "ok" | "pendente" | "neutro" | "bloqueio";

export type PortalContratoResumo = {
  temContrato: boolean;
  vigenciaLabel: string;
  procuracaoStatus: ProcuracaoStatus;
  procuracaoLabel: string;
  procuracaoTone: PortalContratoBadgeTone;
  disponivelAgendamento: boolean | null;
  disponivelAgendamentoLabel: string;
  disponivelAgendamentoTone: PortalContratoBadgeTone;
  agendamentoLiberado: boolean | null;
  agendamentoLiberadoLabel: string;
  agendamentoLiberadoTone: PortalContratoBadgeTone;
};

const CONTRATO_SELECT_FIELDS = [
  "id",
  "cliente_id",
  "status",
  "data_inicio",
  "data_fim",
  "orcamento_id",
  "boleto_pago",
  "liberado_para_agendamento",
  "encerrado_em",
  "aprovado_em",
  "created_at",
] as const;

export const PORTAL_CONTRATO_SELECT = CONTRATO_SELECT_FIELDS.join(", ");

export type PortalContratoFonte = Pick<
  ClienteContratoRecord,
  (typeof CONTRATO_SELECT_FIELDS)[number]
>;

export type PortalClienteContratoFonte = Pick<
  ClienteRecord,
  "id" | "procuracao" | "agendamento_bloqueio_manual"
> & {
  disponivel_agendamento?: boolean | null;
};

export function portalContratoResumoVazio(): PortalContratoResumo {
  return {
    temContrato: false,
    vigenciaLabel: PORTAL_CONTRATO_FALLBACK,
    procuracaoStatus: "pendente",
    procuracaoLabel: PORTAL_CONTRATO_FALLBACK,
    procuracaoTone: "neutro",
    disponivelAgendamento: null,
    disponivelAgendamentoLabel: PORTAL_CONTRATO_FALLBACK,
    disponivelAgendamentoTone: "neutro",
    agendamentoLiberado: null,
    agendamentoLiberadoLabel: PORTAL_CONTRATO_FALLBACK,
    agendamentoLiberadoTone: "neutro",
  };
}

/** Isolamento: descarta contratos de outro cliente_id. */
export function filtrarContratosDoClientePortal(
  contratos: PortalContratoFonte[],
  clienteId: string
): PortalContratoFonte[] {
  const id = clienteId.trim();
  if (!id) return [];
  return contratos.filter((c) => String(c.cliente_id ?? "").trim() === id);
}

/**
 * Vigência a partir das datas persistidas do contrato atual.
 * Sem datas → fallback. Sem data fim → "Indeterminado" (mesma ideia de formatVigenciaContrato).
 */
export function formatVigenciaPortalContrato(
  inicio: string | null | undefined,
  fim: string | null | undefined
): string {
  const startRaw = String(inicio ?? "").trim();
  if (!startRaw) return PORTAL_CONTRATO_FALLBACK;
  const start = formatDateBR(startRaw);
  if (start === "—") return PORTAL_CONTRATO_FALLBACK;
  const fimRaw = String(fim ?? "").trim();
  if (!fimRaw) return `${start} a Indeterminado`;
  const end = formatDateBR(fimRaw);
  if (end === "—") return `${start} a Indeterminado`;
  return `${start} a ${end}`;
}

function toneProcuracao(status: ProcuracaoStatus): PortalContratoBadgeTone {
  if (status === "ativa") return "ok";
  if (status === "pendente") return "pendente";
  return "neutro";
}

function toneBool(
  value: boolean | null,
  opts?: { bloqueioImportante?: boolean }
): PortalContratoBadgeTone {
  if (value == null) return "neutro";
  if (value) return "ok";
  if (opts?.bloqueioImportante) return "bloqueio";
  return "neutro";
}

export function montarPortalContratoResumo(input: {
  clienteId: string;
  cliente: PortalClienteContratoFonte | null;
  contratos: PortalContratoFonte[];
}): PortalContratoResumo {
  const vazio = portalContratoResumoVazio();
  const clienteId = input.clienteId.trim();
  if (!clienteId) return vazio;

  const contratos = filtrarContratosDoClientePortal(
    input.contratos,
    clienteId
  );
  const contratoAtual = getContratoAtual(
    contratos as ClienteContratoRecord[]
  );

  const cliente =
    input.cliente && String(input.cliente.id ?? "").trim() === clienteId
      ? input.cliente
      : null;

  const procuracaoInformada =
    cliente != null &&
    cliente.procuracao != null &&
    String(cliente.procuracao).trim() !== "";
  const procuracaoStatus = procuracaoInformada
    ? normalizeProcuracaoStatus(cliente.procuracao)
    : "pendente";

  const disponivelRaw = cliente?.disponivel_agendamento;
  const disponivelInformado = disponivelRaw === true || disponivelRaw === false;
  const disponivel = disponivelInformado
    ? isClienteDisponivelAgendamento(disponivelRaw)
    : null;
  const bloqueioManual = cliente?.agendamento_bloqueio_manual === true;

  const temContrato = Boolean(contratoAtual);
  const liberado = contratoAtual
    ? contratoLiberaAgendamento(contratoAtual)
    : null;

  return {
    temContrato,
    vigenciaLabel: contratoAtual
      ? formatVigenciaPortalContrato(
          contratoAtual.data_inicio,
          contratoAtual.data_fim
        )
      : PORTAL_CONTRATO_FALLBACK,
    procuracaoStatus,
    procuracaoLabel: procuracaoInformada
      ? formatProcuracaoStatusLabel(procuracaoStatus)
      : PORTAL_CONTRATO_FALLBACK,
    procuracaoTone: procuracaoInformada
      ? toneProcuracao(procuracaoStatus)
      : "neutro",
    disponivelAgendamento: disponivel,
    disponivelAgendamentoLabel:
      disponivel == null
        ? PORTAL_CONTRATO_FALLBACK
        : disponivel
          ? "Disponível"
          : "Indisponível",
    disponivelAgendamentoTone: toneBool(disponivel, {
      bloqueioImportante: bloqueioManual && disponivel === false,
    }),
    agendamentoLiberado: liberado,
    agendamentoLiberadoLabel:
      liberado == null
        ? PORTAL_CONTRATO_FALLBACK
        : liberado
          ? "Liberado"
          : "Não liberado",
    agendamentoLiberadoTone: toneBool(liberado),
  };
}
