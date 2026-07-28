export type OrcamentoOrigemCliente = "indicacao" | "google";

export const ORCAMENTO_ORIGEM_OPTIONS: readonly {
  value: OrcamentoOrigemCliente;
  label: string;
}[] = [
  { value: "indicacao", label: "Indicação" },
  { value: "google", label: "Google" },
] as const;

export const ORCAMENTO_ORIGEM_LABELS: Record<OrcamentoOrigemCliente, string> = {
  indicacao: "Indicação",
  google: "Google",
};

export const ORCAMENTO_ORIGEM_NAO_INFORMADO = "Não informado";

export function isOrcamentoOrigemCliente(
  value: string | null | undefined
): value is OrcamentoOrigemCliente {
  return value === "indicacao" || value === "google";
}

/** Rótulo para UI, histórico e auditoria. */
export function formatOrcamentoOrigemCliente(
  value: string | null | undefined
): string {
  if (isOrcamentoOrigemCliente(value)) {
    return ORCAMENTO_ORIGEM_LABELS[value];
  }
  return ORCAMENTO_ORIGEM_NAO_INFORMADO;
}
