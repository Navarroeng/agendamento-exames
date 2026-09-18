/**
 * Detecção do serviço SST "Treinamentos".
 * Preferir servico_id; fallback por nome normalizado (sem includes).
 */

export const SERVICO_SST_NOME_TREINAMENTOS = "Treinamentos" as const;

export type OrcamentoFluxoImplantacao =
  | "padrao"
  | "somente_treinamentos"
  | "combinado"
  | "aet"
  | "insalubridade";

export type ServicoItemRef = {
  servico_id?: string | null;
  servico_nome?: string | null;
};

/** Remove acentos, espaços extras e normaliza para comparação exata. */
export function normalizeServicoNome(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export const SERVICO_SST_NOME_TREINAMENTOS_NORMALIZADO =
  normalizeServicoNome(SERVICO_SST_NOME_TREINAMENTOS);

export function resolveTreinamentosServicoId(
  servicos: Array<{ id: string; nome: string }>
): string | null {
  const found = servicos.find(
    (s) =>
      normalizeServicoNome(s.nome) === SERVICO_SST_NOME_TREINAMENTOS_NORMALIZADO
  );
  return found?.id ?? null;
}

export function isServicoTreinamentos(
  item: ServicoItemRef,
  treinamentosServicoId?: string | null
): boolean {
  const id = (item.servico_id ?? "").trim();
  if (treinamentosServicoId && id) {
    return id === treinamentosServicoId;
  }
  return (
    normalizeServicoNome(item.servico_nome) ===
    SERVICO_SST_NOME_TREINAMENTOS_NORMALIZADO
  );
}

/**
 * Itens para classificação: prioriza aprovação (snapshot), senão itens do orçamento.
 * Se a aprovação existir mas vier sem serviços úteis, cai no orçamento.
 */
export function resolveItensParaFluxoImplantacao(params: {
  orcamentoItens?: ServicoItemRef[] | null;
  aprovacaoItens?: ServicoItemRef[] | null;
}): ServicoItemRef[] {
  const aprovacao = (params.aprovacaoItens ?? []).filter(
    (item) =>
      Boolean((item.servico_id ?? "").trim()) ||
      Boolean((item.servico_nome ?? "").trim())
  );
  if (aprovacao.length > 0) return aprovacao;

  return (params.orcamentoItens ?? []).filter(
    (item) =>
      Boolean((item.servico_id ?? "").trim()) ||
      Boolean((item.servico_nome ?? "").trim())
  );
}

const AET_NOMES_NORMALIZADOS = new Set([
  normalizeServicoNome("Laudo AET – Análise Ergonômica do Trabalho"),
  normalizeServicoNome("Laudo AET - Análise Ergonômica do Trabalho"),
]);

function isItemAetFluxo(
  item: ServicoItemRef,
  aetServicoId?: string | null
): boolean {
  const id = (item.servico_id ?? "").trim();
  if (aetServicoId && id) return id === aetServicoId;
  return AET_NOMES_NORMALIZADOS.has(normalizeServicoNome(item.servico_nome));
}

const INSALUBRIDADE_NOMES_NORMALIZADOS = new Set([
  normalizeServicoNome("Laudo de Insalubridade"),
]);

function isItemInsalubridadeFluxo(
  item: ServicoItemRef,
  insalubridadeServicoId?: string | null
): boolean {
  const id = (item.servico_id ?? "").trim();
  if (insalubridadeServicoId && id) return id === insalubridadeServicoId;
  return INSALUBRIDADE_NOMES_NORMALIZADOS.has(
    normalizeServicoNome(item.servico_nome)
  );
}

export function classifyOrcamentoFluxoImplantacao(
  itens: ServicoItemRef[],
  treinamentosServicoId?: string | null,
  aetServicoId?: string | null,
  insalubridadeServicoId?: string | null
): OrcamentoFluxoImplantacao {
  const relevant = itens.filter(
    (item) =>
      Boolean((item.servico_id ?? "").trim()) ||
      Boolean((item.servico_nome ?? "").trim())
  );
  if (relevant.length === 0) return "padrao";

  if (relevant.every((item) => isItemAetFluxo(item, aetServicoId))) {
    return "aet";
  }

  if (
    relevant.every((item) =>
      isItemInsalubridadeFluxo(item, insalubridadeServicoId)
    )
  ) {
    return "insalubridade";
  }

  let hasTreinamentos = false;
  let hasOutros = false;
  for (const item of relevant) {
    if (isServicoTreinamentos(item, treinamentosServicoId)) {
      hasTreinamentos = true;
    } else {
      hasOutros = true;
    }
  }

  if (hasTreinamentos && !hasOutros) return "somente_treinamentos";
  if (hasTreinamentos && hasOutros) return "combinado";
  return "padrao";
}
