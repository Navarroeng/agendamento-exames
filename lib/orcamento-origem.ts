export type OrcamentoOrigemCliente =
  | "indicacao"
  | "google"
  | "renovacao"
  | "cliente_base";

export const ORCAMENTO_ORIGEM_OPTIONS: readonly {
  value: OrcamentoOrigemCliente;
  label: string;
}[] = [
  { value: "indicacao", label: "Indicação" },
  { value: "google", label: "Google" },
  { value: "renovacao", label: "Renovação" },
  { value: "cliente_base", label: "Cliente da base" },
] as const;

export const ORCAMENTO_ORIGEM_LABELS: Record<OrcamentoOrigemCliente, string> = {
  indicacao: "Indicação",
  google: "Google",
  renovacao: "Renovação",
  cliente_base: "Cliente da base",
};

export const ORCAMENTO_ORIGEM_NAO_INFORMADO = "Não informado";

export function isOrcamentoOrigemCliente(
  value: string | null | undefined
): value is OrcamentoOrigemCliente {
  return (
    value === "indicacao" ||
    value === "google" ||
    value === "renovacao" ||
    value === "cliente_base"
  );
}

/** Rótulo para UI, histórico e auditoria (uso interno; não vai no PDF). */
export function formatOrcamentoOrigemCliente(
  value: string | null | undefined
): string {
  if (isOrcamentoOrigemCliente(value)) {
    return ORCAMENTO_ORIGEM_LABELS[value];
  }
  return ORCAMENTO_ORIGEM_NAO_INFORMADO;
}
