import type { ClienteProcuracao } from "@/lib/types";

export const CLIENTE_PROCURACAO_ATIVA: ClienteProcuracao = "ativa";
export const CLIENTE_PROCURACAO_INATIVA: ClienteProcuracao = "inativa";

export const CLIENTE_PROCURACAO_OPTIONS: {
  value: ClienteProcuracao;
  label: string;
}[] = [
  { value: CLIENTE_PROCURACAO_ATIVA, label: "Ativa" },
  { value: CLIENTE_PROCURACAO_INATIVA, label: "Inativa" },
];

export function normalizeClienteProcuracao(
  value: string | null | undefined
): ClienteProcuracao {
  return value === CLIENTE_PROCURACAO_INATIVA
    ? CLIENTE_PROCURACAO_INATIVA
    : CLIENTE_PROCURACAO_ATIVA;
}

export function isClienteProcuracaoAtiva(
  procuracao: ClienteProcuracao | string | null | undefined
): boolean {
  if (procuracao == null || procuracao === "") {
    return true;
  }
  return procuracao === CLIENTE_PROCURACAO_ATIVA;
}

export function formatClienteProcuracaoLabel(
  procuracao: ClienteProcuracao | string | null | undefined
): string {
  return isClienteProcuracaoAtiva(procuracao) ? "Ativa" : "Inativa";
}
