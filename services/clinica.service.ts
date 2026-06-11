import { contarExamesPorClinica } from "@/services/clinica-exame.service";
import { createClient } from "@/lib/supabase/client";
import type { ClinicaInsert, ClinicaListItem, ClinicaRecord } from "@/lib/types";

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function clinicaMatchesAgendamento(
  clinica: ClinicaRecord,
  clinicaNome: string
): boolean {
  const nome = normalizeName(clinicaNome);
  return (
    normalizeName(clinica.nome_fantasia) === nome ||
    normalizeName(clinica.razao_social) === nome
  );
}

async function fetchUltimoAgendamentoPorClinica(): Promise<
  Map<string, string>
> {
  const supabase = createClient();
  const map = new Map<string, string>();

  const { data, error } = await supabase
    .from("agendamentos")
    .select("clinica_nome, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return map;

  for (const row of data) {
    const nome = row.clinica_nome?.trim();
    if (!nome || map.has(nome)) continue;
    if (row.created_at) map.set(nome, row.created_at);
  }

  return map;
}

function resolveUltimoAgendamento(
  clinica: ClinicaRecord,
  agendamentosMap: Map<string, string>
): string | null {
  for (const [nome, data] of Array.from(agendamentosMap.entries())) {
    if (clinicaMatchesAgendamento(clinica, nome)) return data;
  }
  return null;
}

export async function listarClinicas(limit = 500): Promise<ClinicaListItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clinicas")
    .select("*")
    .order("nome_fantasia", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const clinicas = ((data ?? []) as ClinicaRecord[]).sort((a, b) =>
    (a.nome_fantasia || a.razao_social).localeCompare(
      b.nome_fantasia || b.razao_social,
      "pt-BR"
    )
  );
  const agendamentosMap = await fetchUltimoAgendamentoPorClinica();
  const examesCountMap = await contarExamesPorClinica(
    clinicas.map((c) => c.id)
  );

  return clinicas.map((clinica) => ({
    ...clinica,
    qtdExames: examesCountMap.get(clinica.id) ?? 0,
    ultimoAgendamento: resolveUltimoAgendamento(clinica, agendamentosMap),
  }));
}

export async function buscarClinicaPorId(
  id: string
): Promise<ClinicaRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clinicas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as ClinicaRecord | null) ?? null;
}

export async function criarClinica(
  clinica: ClinicaInsert
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clinicas")
    .insert({ ...clinica, updated_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function atualizarClinica(
  id: string,
  clinica: ClinicaInsert
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("clinicas")
    .update({ ...clinica, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function desativarClinica(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("clinicas")
    .update({
      status: "inativa",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function ativarClinica(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("clinicas")
    .update({
      status: "ativa",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}
