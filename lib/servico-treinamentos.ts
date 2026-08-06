/**
 * Detecção do serviço SST "Treinamentos" (nome exato no catálogo).
 * Preferir servico_id; fallback por igualdade estrita do nome (sem includes).
 */

export const SERVICO_SST_NOME_TREINAMENTOS = "Treinamentos" as const;

export type OrcamentoFluxoImplantacao =
  | "padrao"
  | "somente_treinamentos"
  | "combinado";

export type ServicoItemRef = {
  servico_id?: string | null;
  servico_nome?: string | null;
};

export function resolveTreinamentosServicoId(
  servicos: Array<{ id: string; nome: string }>
): string | null {
  const found = servicos.find(
    (s) => s.nome.trim() === SERVICO_SST_NOME_TREINAMENTOS
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
  return (item.servico_nome ?? "").trim() === SERVICO_SST_NOME_TREINAMENTOS;
}

export function classifyOrcamentoFluxoImplantacao(
  itens: ServicoItemRef[],
  treinamentosServicoId?: string | null
): OrcamentoFluxoImplantacao {
  const relevant = itens.filter(
    (item) =>
      Boolean((item.servico_id ?? "").trim()) ||
      Boolean((item.servico_nome ?? "").trim())
  );
  if (relevant.length === 0) return "padrao";

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
