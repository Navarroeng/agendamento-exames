/**
 * Portal do Cliente — card Contrato e acesso aos serviços.
 * Reutiliza regras já existentes; não cria lógica financeira/contratual paralela.
 *
 * Apresentação simplificada no Portal:
 * Vigência | Procuração | Colaboradores contratados | Agendamento
 * (Agendamento = cache disponivel_agendamento, mesma regra do admin “pode agendar”)
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
  /** Quantidade comercial do contrato atual (não roster ativo). */
  colaboradoresContratados: number | null;
  colaboradoresContratadosLabel: string;
  /**
   * Label único do card: Liberado / Não liberado.
   * Fonte: clientes.disponivel_agendamento (inclui bloqueio manual via cache admin).
   */
  agendamentoLabel: string;
  agendamentoTone: PortalContratoBadgeTone;
  /** Campos internos preservados (não são o foco do card). */
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
  "quantidade_colaboradores",
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

export function formatColaboradoresContratadosLabel(
  quantidade: number | null | undefined
): string {
  if (quantidade == null || !Number.isFinite(quantidade) || quantidade < 0) {
    return PORTAL_CONTRATO_FALLBACK;
  }
  const n = Math.floor(quantidade);
  if (n === 0) return "0 colaboradores";
  if (n === 1) return "1 colaborador";
  return `${n} colaboradores`;
}

export function portalContratoResumoVazio(): PortalContratoResumo {
  return {
    temContrato: false,
    vigenciaLabel: PORTAL_CONTRATO_FALLBACK,
    procuracaoStatus: "pendente",
    procuracaoLabel: PORTAL_CONTRATO_FALLBACK,
    procuracaoTone: "neutro",
    colaboradoresContratados: null,
    colaboradoresContratadosLabel: PORTAL_CONTRATO_FALLBACK,
    agendamentoLabel: PORTAL_CONTRATO_FALLBACK,
    agendamentoTone: "neutro",
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

  const qtdRaw = contratoAtual?.quantidade_colaboradores;
  const colaboradoresContratados =
    qtdRaw == null || !Number.isFinite(Number(qtdRaw))
      ? null
      : Math.max(0, Math.floor(Number(qtdRaw)));

  const disponivelTone = toneBool(disponivel, {
    bloqueioImportante: bloqueioManual && disponivel === false,
  });

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
    colaboradoresContratados,
    colaboradoresContratadosLabel: formatColaboradoresContratadosLabel(
      colaboradoresContratados
    ),
    // Card Portal: mesma regra do admin (cache disponivel_agendamento)
    agendamentoLabel:
      disponivel == null
        ? PORTAL_CONTRATO_FALLBACK
        : disponivel
          ? "Liberado"
          : "Não liberado",
    agendamentoTone: disponivelTone,
    disponivelAgendamento: disponivel,
    disponivelAgendamentoLabel:
      disponivel == null
        ? PORTAL_CONTRATO_FALLBACK
        : disponivel
          ? "Disponível"
          : "Indisponível",
    disponivelAgendamentoTone: disponivelTone,
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
