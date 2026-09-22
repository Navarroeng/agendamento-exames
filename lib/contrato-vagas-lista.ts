/**
 * Apresentação da Lista de funcionários (ordem visual, # e exportação).
 * Não altera identidade da vaga (id / indice).
 */

import { maskCPFInput } from "@/lib/cpf";
import {
  CONTRATO_VAGA_STATUS_LABELS,
  normalizeNomeOcupante,
  resolveStatusVagaRascunho,
  type ContratoVagaDraft,
  type ContratoVagaRecord,
  type ContratoVagaStatus,
} from "@/lib/contrato-vagas";

export type ListaFuncionariosNomeSort = "asc" | "desc";

export type ListaFuncionariosLinhaVisual<T extends ContratoVagaDraft = ContratoVagaDraft> =
  {
    numeroVisual: number;
    draft: T;
  };

export type ListaFuncionariosExportRow = {
  numeroVisual: number;
  nome: string;
  cpf: string;
  cargo: string;
  situacao: string;
  vagaId: string | null;
  indice: number;
};

export function cycleListaFuncionariosNomeSort(
  current: ListaFuncionariosNomeSort
): ListaFuncionariosNomeSort {
  return current === "asc" ? "desc" : "asc";
}

export function compareListaFuncionariosNome(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: ListaFuncionariosNomeSort
): number {
  const na = normalizeNomeOcupante(a);
  const nb = normalizeNomeOcupante(b);
  const aEmpty = !na;
  const bEmpty = !nb;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  const cmp = na.localeCompare(nb, "pt-BR", { sensitivity: "base" });
  return direction === "desc" ? -cmp : cmp;
}

export function orderPorNomeColaborador<
  T extends { colaborador?: string | null; indice: number }
>(rows: T[], direction: ListaFuncionariosNomeSort): T[] {
  return [...rows].sort((left, right) => {
    const byNome = compareListaFuncionariosNome(
      left.colaborador,
      right.colaborador,
      direction
    );
    if (byNome !== 0) return byNome;
    return left.indice - right.indice;
  });
}

export function orderDraftsListaFuncionarios<T extends ContratoVagaDraft>(
  rows: T[],
  direction: ListaFuncionariosNomeSort
): T[] {
  return orderPorNomeColaborador(rows, direction);
}

export function numerarLinhasListaFuncionarios<T extends ContratoVagaDraft>(
  rows: T[]
): ListaFuncionariosLinhaVisual<T>[] {
  return rows.map((draft, index) => ({
    numeroVisual: index + 1,
    draft,
  }));
}

export function resolveStatusListaFuncionarioPreview(params: {
  persistida?: Pick<ContratoVagaRecord, "status"> | null;
  draft: Pick<
    ContratoVagaDraft,
    "colaborador" | "colaboradorCpf" | "manterAsoAberto"
  >;
}): ContratoVagaStatus {
  if (params.persistida) return params.persistida.status;
  return resolveStatusVagaRascunho({
    colaborador: params.draft.colaborador,
    colaboradorCpf: params.draft.colaboradorCpf,
    manterAsoAberto: params.draft.manterAsoAberto,
  });
}

export function labelStatusListaFuncionario(params: {
  persistida?: Pick<ContratoVagaRecord, "status"> | null;
  draft: Pick<
    ContratoVagaDraft,
    "colaborador" | "colaboradorCpf" | "manterAsoAberto"
  >;
}): string {
  return CONTRATO_VAGA_STATUS_LABELS[
    resolveStatusListaFuncionarioPreview(params)
  ];
}

export function buildLinhasVisuaisListaFuncionarios<T extends ContratoVagaDraft>(
  drafts: T[],
  direction: ListaFuncionariosNomeSort
): ListaFuncionariosLinhaVisual<T>[] {
  return numerarLinhasListaFuncionarios(
    orderDraftsListaFuncionarios(drafts, direction)
  );
}

export function buildListaFuncionariosExportRows(params: {
  linhas: ListaFuncionariosLinhaVisual[];
  vagaByIndice: Map<number, Pick<ContratoVagaRecord, "id" | "status">>;
}): ListaFuncionariosExportRow[] {
  return params.linhas.map(({ numeroVisual, draft }) => {
    const persistida = params.vagaByIndice.get(draft.indice) ?? null;
    return {
      numeroVisual,
      nome: normalizeNomeOcupante(draft.colaborador),
      cpf: maskCPFInput(draft.colaboradorCpf),
      cargo: normalizeNomeOcupante(draft.cargoNome),
      situacao: labelStatusListaFuncionario({ persistida, draft }),
      vagaId: persistida?.id ?? draft.id,
      indice: draft.indice,
    };
  });
}

export function sanitizeEmpresaParaArquivo(
  nome: string | null | undefined
): string {
  const raw = String(nome ?? "")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return raw || "empresa";
}

export function formatDataArquivoListaFuncionarios(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function nomeArquivoListaFuncionariosExport(params: {
  clienteNome?: string | null;
  data?: Date;
}): string {
  const empresa = sanitizeEmpresaParaArquivo(params.clienteNome);
  const data = formatDataArquivoListaFuncionarios(params.data);
  return `Lista_Funcionarios_${empresa}_${data}.xlsx`;
}
