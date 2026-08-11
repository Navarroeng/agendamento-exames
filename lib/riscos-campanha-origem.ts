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

/** Status considerados "ativos" para bloquear duplicidade (manual/orçamento). */
export const RISCOS_CAMPANHA_STATUS_ATIVOS = [
  "em_preparacao",
  "aberta",
] as const;

/** Status que podem ser a campanha “atual” do progresso (nunca cancelada). */
export const RISCOS_CAMPANHA_STATUS_PARA_PROGRESSO = [
  "em_preparacao",
  "aberta",
  "encerrada",
] as const;

export function isCampanhaStatusAtivo(
  status: string | null | undefined
): boolean {
  return (RISCOS_CAMPANHA_STATUS_ATIVOS as readonly string[]).includes(
    String(status ?? "")
  );
}

export function isCampanhaStatusParaProgresso(
  status: string | null | undefined
): boolean {
  return (RISCOS_CAMPANHA_STATUS_PARA_PROGRESSO as readonly string[]).includes(
    String(status ?? "")
  );
}

type CampanhaParaEscolha = {
  id: string;
  status: string;
  created_at?: string | null;
};

/**
 * Escolhe a campanha que alimenta etapa/progresso/participantes.
 * Nunca usa `cancelada`. Prefere aberta > em_preparacao > encerrada,
 * e em empate a mais recente (`created_at`).
 */
export function escolherCampanhaParaProgresso<T extends CampanhaParaEscolha>(
  candidates: readonly (T | null | undefined)[]
): T | null {
  const elegiveis = candidates.filter(
    (c): c is T => Boolean(c) && isCampanhaStatusParaProgresso(c!.status)
  );
  if (elegiveis.length === 0) return null;

  const rank = (status: string) => {
    if (status === "aberta") return 3;
    if (status === "em_preparacao") return 2;
    if (status === "encerrada") return 1;
    return 0;
  };

  return [...elegiveis].sort((a, b) => {
    const rd = rank(b.status) - rank(a.status);
    if (rd !== 0) return rd;
    return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  })[0];
}

/**
 * Ao mesclar listagem × modal: não reaplicar campanha cancelada sobre uma ativa.
 * Se ambas elegíveis e mesmo id, preferir a do modal (status mais fresco da API).
 */
export function mesclarCampanhaListagemModal<T extends CampanhaParaEscolha>(
  listagem: T | null | undefined,
  modal: T | null | undefined
): T | null {
  const escolhida = escolherCampanhaParaProgresso([listagem, modal]);
  if (
    escolhida &&
    modal &&
    escolhida.id === modal.id &&
    isCampanhaStatusParaProgresso(modal.status)
  ) {
    return modal;
  }
  return escolhida;
}
