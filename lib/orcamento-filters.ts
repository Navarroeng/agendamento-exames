import { textsMatchSearch } from "@/lib/text-normalize";
import type {
  OrcamentoFilters,
  OrcamentoRecord,
  OrcamentoStatus,
} from "@/lib/orcamento-types";

export function hasActiveOrcamentoFilters(filters: OrcamentoFilters): boolean {
  return filters.busca.trim() !== "" || filters.status !== "";
}

export function filterOrcamentos(
  orcamentos: OrcamentoRecord[],
  filters: OrcamentoFilters
): OrcamentoRecord[] {
  const busca = filters.busca.trim();

  return orcamentos.filter((orcamento) => {
    if (filters.status && orcamento.status !== filters.status) {
      return false;
    }

    if (!busca) return true;

    return textsMatchSearch(
      [
        orcamento.numero,
        orcamento.cliente_nome,
        orcamento.cliente_cnpj,
        orcamento.cliente_endereco,
        orcamento.cliente_setor,
        orcamento.contato,
        orcamento.email,
        orcamento.telefone,
        orcamento.responsavel,
      ],
      busca
    );
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
