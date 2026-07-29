import { textsMatchSearch } from "@/lib/text-normalize";
import { formatOrcamentoOrigemCliente } from "@/lib/orcamento-origem";
import type {
  OrcamentoFilters,
  OrcamentoRecord,
  OrcamentoStatus,
} from "@/lib/orcamento-types";

export function hasActiveOrcamentoFilters(filters: OrcamentoFilters): boolean {
  return filters.busca.trim() !== "" || filters.status !== "";
}

/** Extrai ano e sequência numérica de números no formato ORC-AAAA-NNNN. */
export function parseOrcamentoNumeroParts(numero: string): {
  ano: number;
  sequencia: number;
} {
  const match = numero
    .trim()
    .toUpperCase()
    .match(/^ORC-(\d{4})-(\d+)$/);
  if (!match) {
    return { ano: 0, sequencia: 0 };
  }
  return {
    ano: Number(match[1]),
    sequencia: Number(match[2]),
  };
}

/** Ano DESC, depois sequência DESC (mais recente no topo). */
export function compareOrcamentoNumeroDesc(a: string, b: string): number {
  const pa = parseOrcamentoNumeroParts(a);
  const pb = parseOrcamentoNumeroParts(b);
  if (pa.ano !== pb.ano) return pb.ano - pa.ano;
  if (pa.sequencia !== pb.sequencia) return pb.sequencia - pa.sequencia;
  return b.localeCompare(a);
}

export function sortOrcamentosByNumeroDesc(
  orcamentos: OrcamentoRecord[]
): OrcamentoRecord[] {
  return [...orcamentos].sort((a, b) =>
    compareOrcamentoNumeroDesc(a.numero, b.numero)
  );
}

export function filterOrcamentos(
  orcamentos: OrcamentoRecord[],
  filters: OrcamentoFilters
): OrcamentoRecord[] {
  const busca = filters.busca.trim();

  const filtered = orcamentos.filter((orcamento) => {
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
        formatOrcamentoOrigemCliente(orcamento.origem_cliente),
      ],
      busca
    );
  });

  return sortOrcamentosByNumeroDesc(filtered);
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
