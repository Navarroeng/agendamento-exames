import { compareByLabel, sortByNome } from "@/lib/sort-by-label";
import { createClient } from "@/lib/supabase/client";
import type {
  CargoComExames,
  CargoExameInput,
  CargoExameWithExame,
  CargoInsert,
  CargoRecord,
  ExameRecord,
} from "@/lib/types";

export async function listarCargos(limit = 500): Promise<CargoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cargos")
    .select("*")
    .order("nome", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return sortByNome((data ?? []) as CargoRecord[]);
}

export async function listarCargosAtivos(): Promise<CargoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cargos")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw error;
  return sortByNome((data ?? []) as CargoRecord[]);
}

export async function buscarCargoPorId(
  id: string
): Promise<CargoRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cargos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as CargoRecord | null) ?? null;
}

export async function buscarCargoComExames(
  id: string
): Promise<CargoComExames | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cargos")
    .select("*, cargo_exames(*, exames(*))")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as CargoComExames & {
    cargo_exames: CargoExameWithExame[];
  };

  row.cargo_exames = (row.cargo_exames ?? [])
    .filter((item) => item.ativo)
    .sort((a, b) =>
      compareByLabel(a.exames?.nome ?? "", b.exames?.nome ?? "")
    );

  return row;
}

export async function listarExamesComAlerta6mPorCargo(
  cargoId: string
): Promise<ExameRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cargo_exames")
    .select("exames(*)")
    .eq("cargo_id", cargoId)
    .eq("ativo", true)
    .eq("obrigatorio", true)
    .eq("gerar_alerta_6m", true);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const item = row as { exames: ExameRecord | ExameRecord[] | null };
      return Array.isArray(item.exames) ? item.exames[0] : item.exames;
    })
    .filter((exame): exame is ExameRecord => Boolean(exame?.ativo))
    .sort((a, b) => compareByLabel(a.nome, b.nome));
}

export async function listarExamesObrigatoriosPorCargo(
  cargoId: string
): Promise<ExameRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cargo_exames")
    .select("exames(*)")
    .eq("cargo_id", cargoId)
    .eq("ativo", true)
    .eq("obrigatorio", true);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const item = row as { exames: ExameRecord | ExameRecord[] | null };
      return Array.isArray(item.exames) ? item.exames[0] : item.exames;
    })
    .filter((exame): exame is ExameRecord => Boolean(exame?.ativo))
    .sort((a, b) => compareByLabel(a.nome, b.nome));
}

async function sincronizarCargoExames(
  cargoId: string,
  exames: CargoExameInput[]
): Promise<void> {
  const supabase = createClient();
  const unique = new Map<string, CargoExameInput>();
  exames.forEach((item) => {
    if (item.exame_id) unique.set(item.exame_id, item);
  });

  const { error: deleteError } = await supabase
    .from("cargo_exames")
    .delete()
    .eq("cargo_id", cargoId);

  if (deleteError) throw deleteError;

  if (unique.size === 0) return;

  const { error: insertError } = await supabase.from("cargo_exames").insert(
    Array.from(unique.values()).map((item) => ({
      cargo_id: cargoId,
      exame_id: item.exame_id,
      obrigatorio: true,
      ativo: true,
      gerar_alerta_6m: item.gerar_alerta_6m,
    }))
  );

  if (insertError) throw insertError;
}

function toCargoExameInputs(
  exameIds: string[],
  exameAlertas: Record<string, boolean>
): CargoExameInput[] {
  return Array.from(new Set(exameIds.filter(Boolean))).map((exame_id) => ({
    exame_id,
    gerar_alerta_6m: Boolean(exameAlertas[exame_id]),
  }));
}

export async function criarCargoComExames(
  cargo: CargoInsert,
  exameIds: string[],
  exameAlertas: Record<string, boolean> = {}
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cargos")
    .insert({ ...cargo, updated_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) throw error;

  await sincronizarCargoExames(
    data.id,
    toCargoExameInputs(exameIds, exameAlertas)
  );
  return data.id;
}

export async function atualizarCargoComExames(
  id: string,
  cargo: CargoInsert,
  exameIds: string[],
  exameAlertas: Record<string, boolean> = {}
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("cargos")
    .update({ ...cargo, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  await sincronizarCargoExames(
    id,
    toCargoExameInputs(exameIds, exameAlertas)
  );
}

export async function setCargoAtivo(id: string, ativo: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("cargos")
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function contarExamesPorCargo(
  cargoIds: string[]
): Promise<Record<string, number>> {
  if (cargoIds.length === 0) return {};

  const supabase = createClient();
  const { data, error } = await supabase
    .from("cargo_exames")
    .select("cargo_id")
    .in("cargo_id", cargoIds)
    .eq("ativo", true);

  if (error) throw error;

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    const id = row.cargo_id as string;
    counts[id] = (counts[id] ?? 0) + 1;
  });
  return counts;
}
