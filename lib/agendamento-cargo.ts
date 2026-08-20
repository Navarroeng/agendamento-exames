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
 * Localiza o cargo do catálogo sem criar duplicata.
 * Prefere cargo_id; se só houver nome, compara caixa/espaços.
 */
export function resolveCargoIdFromPrefill(
  cargos: Pick<CargoRecord, "id" | "nome">[],
  prefill: { cargo_id?: string | null; cargo_nome?: string | null }
): string {
  const id = prefill.cargo_id?.trim() ?? "";
  if (id) {
    const byId = cargos.find((cargo) => cargo.id === id);
    return byId?.id ?? id;
  }

  const nome = normalizeCargoNomeMatch(prefill.cargo_nome);
  if (!nome) return "";
  return (
    cargos.find((cargo) => normalizeCargoNomeMatch(cargo.nome) === nome)?.id ??
    ""
  );
}
