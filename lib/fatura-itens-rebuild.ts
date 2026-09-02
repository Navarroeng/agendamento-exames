import { filterAgendamentosDaReferenciaFatura } from "@/lib/fatura-filters";
import {
  buildFaturaItensFromAgendamentos,
  calcTotalFaturaItens,
} from "@/lib/fatura-mappers";
import { mesReferenciaBRFromFatura } from "@/lib/fatura-reemissao";
import type { ClienteCatalogItem } from "@/lib/fatura-empresa-match";
import type {
  AgendamentoWithExames,
  FaturaComItens,
  FaturaItemInsert,
  FaturaRecord,
  FaturaStatus,
  FaturaTipo,
} from "@/lib/types";

export type FaturaClienteItensSource = Pick<
  FaturaRecord,
  "referencia_nome" | "referencia_id" | "mes_referencia" | "periodo_inicio"
>;

/**
 * Reconstrói itens de fatura cliente a partir dos agendamentos/exames atuais.
 * Usa a mesma regra oficial da emissão inicial (`buildFaturaItensFromAgendamentos`).
 */
export function rebuildItensFaturaClienteFromAgendamentos(
  fatura: FaturaClienteItensSource,
  agendamentos: AgendamentoWithExames[],
  clientesCatalog?: ClienteCatalogItem[]
): FaturaItemInsert[] {
  const mesBR = mesReferenciaBRFromFatura(fatura);
  if (!mesBR) return [];

  const agsReferencia = filterAgendamentosDaReferenciaFatura(agendamentos, {
    mesReferencia: mesBR,
    tipo: "cliente",
    referenciaNome: fatura.referencia_nome,
    referenciaId: fatura.referencia_id ?? null,
    clientesCatalog,
  });

  return buildFaturaItensFromAgendamentos(agsReferencia, "cliente");
}

export function calcTotaisFaturaItens(itens: FaturaItemInsert[]): {
  valorTotal: number;
  totalExames: number;
} {
  return {
    valorTotal: calcTotalFaturaItens(itens),
    totalExames: itens.length,
  };
}

/**
 * Fatura cliente reaberta (rascunho) deve sempre sincronizar itens com agendamentos
 * antes de salvar rascunho ou emitir novamente.
 */
export function shouldRebuildFaturaClienteItensFromAgendamentos(
  input: {
    tipo: FaturaTipo;
    status: FaturaStatus;
    faturaId?: string | null;
  },
  existing: Pick<FaturaComItens, "status" | "tipo"> | null
): boolean {
  if (input.tipo !== "cliente") return false;

  if (existing?.status === "rascunho") {
    return input.status === "rascunho" || input.status === "emitida";
  }

  if (!input.faturaId && !existing) {
    return input.status === "rascunho" || input.status === "emitida";
  }

  return false;
}

/** Fatura emitida/vencida/paga não pode ser alterada por salvarFatura. */
export function faturaClienteBloqueiaSalvarAlteracao(
  existing: Pick<FaturaComItens, "tipo" | "status"> | null
): boolean {
  if (!existing || existing.tipo !== "cliente") return false;
  return existing.status === "emitida" || existing.status === "vencida";
}
