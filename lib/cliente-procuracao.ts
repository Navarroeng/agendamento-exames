import type { ClienteProcuracao } from "@/lib/types";

/** Status unificado (orçamento/implantação e cadastro de clientes). */
export type ProcuracaoStatus = "pendente" | "ativa" | "nao_necessaria";

export const PROCURACAO_STATUS_PENDENTE: ProcuracaoStatus = "pendente";
export const PROCURACAO_STATUS_ATIVA: ProcuracaoStatus = "ativa";
export const PROCURACAO_STATUS_NAO_NECESSARIA: ProcuracaoStatus =
  "nao_necessaria";

/** @deprecated Use PROCURACAO_STATUS_PENDENTE. */
export const CLIENTE_PROCURACAO_ATIVA: ClienteProcuracao = "ativa";
/** @deprecated Use PROCURACAO_STATUS_PENDENTE. */
export const CLIENTE_PROCURACAO_INATIVA: ClienteProcuracao = "pendente";

export const PROCURACAO_STATUS_OPTIONS: {
  value: ProcuracaoStatus;
  label: string;
}[] = [
  { value: "pendente", label: "Pendente" },
  { value: "ativa", label: "Ativa" },
  { value: "nao_necessaria", label: "Não necessária" },
];

/** Opções do cadastro de clientes (mesmo conjunto). */
export const CLIENTE_PROCURACAO_OPTIONS = PROCURACAO_STATUS_OPTIONS;

export function normalizeProcuracaoStatus(
  value: string | null | undefined
): ProcuracaoStatus {
  if (value === "ativa") return "ativa";
  if (value === "nao_necessaria") return "nao_necessaria";
  // Legado "inativa" e valores desconhecidos → pendente
  return "pendente";
}

export function normalizeClienteProcuracao(
  value: string | null | undefined
): ClienteProcuracao {
  return normalizeProcuracaoStatus(value);
}

export function formatProcuracaoStatusLabel(
  value: string | null | undefined
): string {
  const status = normalizeProcuracaoStatus(value);
  return (
    PROCURACAO_STATUS_OPTIONS.find((o) => o.value === status)?.label ??
    "Pendente"
  );
}

export function formatClienteProcuracaoLabel(
  procuracao: ClienteProcuracao | string | null | undefined
): string {
  return formatProcuracaoStatusLabel(procuracao);
}

/** True somente quando a procuração está formalmente ativa. */
export function isClienteProcuracaoAtiva(
  procuracao: ClienteProcuracao | string | null | undefined
): boolean {
  if (procuracao == null || procuracao === "") {
    // Legado: vazio era tratado como ativo na base já em atendimento.
    return true;
  }
  return normalizeProcuracaoStatus(procuracao) === "ativa";
}

/**
 * Agendamento / alertas: não exige procuração ativa se for "não necessária".
 * Pendente (e legado inativa) continua gerando alerta.
 */
export function clienteProcuracaoRequerAtencao(
  procuracao: ClienteProcuracao | string | null | undefined
): boolean {
  if (procuracao == null || procuracao === "") return false;
  const status = normalizeProcuracaoStatus(procuracao);
  return status === "pendente";
}

export function isProcuracaoStatusConcluida(
  status: string | null | undefined
): boolean {
  const n = normalizeProcuracaoStatus(status);
  return n === "ativa" || n === "nao_necessaria";
}

export function labelProcuracaoStatusParaAuditoria(
  status: string | null | undefined
): string {
  return formatProcuracaoStatusLabel(status);
}
