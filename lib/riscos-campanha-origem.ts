/**
 * Origem da campanha de Riscos Psicossociais.
 * Centraliza regras — não espalhar strings literais de origem no código.
 */

export const RISCOS_CAMPANHA_ORIGENS = ["orcamento", "manual_cliente"] as const;

export type RiscosCampanhaOrigem = (typeof RISCOS_CAMPANHA_ORIGENS)[number];

export const RISCOS_CAMPANHA_ORIGEM = {
  orcamento: "orcamento",
  manual_cliente: "manual_cliente",
} as const satisfies Record<RiscosCampanhaOrigem, RiscosCampanhaOrigem>;

export const RISCOS_CAMPANHA_ORIGEM_LABELS: Record<RiscosCampanhaOrigem, string> =
  {
    orcamento: "Fluxo normal (orçamento)",
    manual_cliente: "Inclusão manual",
  };

export function isRiscosCampanhaOrigem(
  value: string | null | undefined
): value is RiscosCampanhaOrigem {
  return (RISCOS_CAMPANHA_ORIGENS as readonly string[]).includes(
    String(value ?? "")
  );
}

export function normalizeRiscosCampanhaOrigem(
  value: string | null | undefined
): RiscosCampanhaOrigem {
  return isRiscosCampanhaOrigem(value)
    ? value
    : RISCOS_CAMPANHA_ORIGEM.orcamento;
}

/** Fluxo manual a partir do cadastro do cliente — Laudos SST não faz parte. */
export function exigeLaudosSstPorOrigem(
  origem: RiscosCampanhaOrigem | string | null | undefined
): boolean {
  return normalizeRiscosCampanhaOrigem(origem) !== RISCOS_CAMPANHA_ORIGEM.manual_cliente;
}

export function isOrigemManualCliente(
  origem: RiscosCampanhaOrigem | string | null | undefined
): boolean {
  return normalizeRiscosCampanhaOrigem(origem) === RISCOS_CAMPANHA_ORIGEM.manual_cliente;
}

export const MSG_CAMPANHA_ATIVA_CLIENTE =
  "Já existe uma Pesquisa Psicossocial ativa para este cliente.";

export const HISTORICO_CRIACAO_MANUAL =
  "Pesquisa Psicossocial criada manualmente pelo cadastro do cliente.";

/** Status considerados "ativos" para bloquear duplicidade de inclusão manual. */
export const RISCOS_CAMPANHA_STATUS_ATIVOS = [
  "em_preparacao",
  "aberta",
] as const;
