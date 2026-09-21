import type { CargoRecord } from "@/lib/types";

export interface CargoAgendamentoFields {
  cargo_id: string | null;
  cargo_nome: string | null;
}

export function buildCargoAgendamentoFields(
  cargoId: string,
  cargos: Pick<CargoRecord, "id" | "nome">[],
  cargoNomeSalvo?: string | null
): CargoAgendamentoFields {
  const id = cargoId.trim();
  if (!id) {
    return { cargo_id: null, cargo_nome: null };
  }

  const found = cargos.find((cargo) => cargo.id === id);
  if (found) {
    return { cargo_id: id, cargo_nome: found.nome };
  }

  const nome = cargoNomeSalvo?.trim();
  return {
    cargo_id: id,
    cargo_nome: nome || null,
  };
}

export function buildCargosFormOptions(
  cargosAtivos: Pick<CargoRecord, "id" | "nome">[],
  cargoId: string,
  cargoNomeSalvo?: string | null
): Pick<CargoRecord, "id" | "nome">[] {
  const id = cargoId.trim();
  if (!id || cargosAtivos.some((cargo) => cargo.id === id)) {
    return cargosAtivos;
  }

  const nome = cargoNomeSalvo?.trim();
  return [
    ...cargosAtivos,
    {
      id,
      nome: nome
        ? `${nome} (inativo)`
        : "Cargo não encontrado / inativo",
    },
  ];
}

export function formatCargoVisualizacao(
  cargoNome?: string | null
): string {
  const nome = cargoNome?.trim();
  return nome || "—";
}

export function normalizeCargoNomeMatch(
  value: string | null | undefined
): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

/**
 * Localiza o cargo no catálogo ativo passado, sem criar registro nem opção extra.
 * Prefere cargo_id canônico; se o id não estiver no catálogo (inclui inativo),
 * retorna vazio — não cai no nome. Sem cargo_id, compara nome só por igualdade
 * após normalizeCargoNomeMatch (trim, espaços, caixa). Sem includes/fuzzy.
 */
export function resolveCargoIdFromPrefill(
  cargos: Pick<CargoRecord, "id" | "nome">[],
  prefill: { cargo_id?: string | null; cargo_nome?: string | null }
): string {
  const id = prefill.cargo_id?.trim() ?? "";
  if (id) {
    return cargos.find((cargo) => cargo.id === id)?.id ?? "";
  }

  const nome = normalizeCargoNomeMatch(prefill.cargo_nome);
  if (!nome) return "";
  return (
    cargos.find((cargo) => normalizeCargoNomeMatch(cargo.nome) === nome)?.id ??
    ""
  );
}

export type CargoAtivoResolvido = {
  cargoId: string;
  cargoNome: string;
};

/**
 * Cargo a selecionar no Novo Agendamento a partir da vaga/prefill.
 * Só devolve item existente no catálogo ativo; caso contrário null (campo vazio).
 */
export function resolveCargoAtivoParaAgendamento(
  cargosAtivos: Pick<CargoRecord, "id" | "nome">[],
  origem: { cargo_id?: string | null; cargo_nome?: string | null }
): CargoAtivoResolvido | null {
  const cargoId = resolveCargoIdFromPrefill(cargosAtivos, origem);
  if (!cargoId) return null;
  const found = cargosAtivos.find((cargo) => cargo.id === cargoId);
  if (!found) return null;
  return { cargoId: found.id, cargoNome: found.nome };
}
