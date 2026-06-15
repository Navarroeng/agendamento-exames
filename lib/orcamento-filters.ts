import type {
  OrcamentoFilters,
  OrcamentoRecord,
  OrcamentoStatus,
} from "@/lib/orcamento-types";

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function hasActiveOrcamentoFilters(filters: OrcamentoFilters): boolean {
  return filters.busca.trim() !== "" || filters.status !== "";
}

export function filterOrcamentos(
  orcamentos: OrcamentoRecord[],
  filters: OrcamentoFilters
): OrcamentoRecord[] {
  const busca = normalizeSearch(filters.busca);

  return orcamentos.filter((orcamento) => {
    if (filters.status && orcamento.status !== filters.status) {
      return false;
    }

    if (!busca) return true;

    const haystack = [
      orcamento.numero,
      orcamento.cliente_nome,
      orcamento.contato,
      orcamento.email,
      orcamento.telefone,
      orcamento.responsavel,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(busca);
  });
}

export function formatOrcamentoStatus(status: OrcamentoStatus): string {
  const labels: Record<OrcamentoStatus, string> = {
    em_elaboracao: "Em elaboração",
    enviado: "Enviado",
    em_negociacao: "Em negociação",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    cancelado: "Cancelado",
  };
  return labels[status] ?? status;
}
