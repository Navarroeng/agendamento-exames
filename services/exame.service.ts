import { sortByNome } from "@/lib/sort-by-label";
import { createClient } from "@/lib/supabase/client";
import type { ExameCatalogInsert, ExameRecord } from "@/lib/types";

export async function listarExamesAtivos(): Promise<ExameRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("exames")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw error;
  return sortByNome((data ?? []) as ExameRecord[]);
}

export async function listarExamesCatalogo(limit = 500): Promise<ExameRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("exames")
    .select("*")
    .order("nome", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return sortByNome((data ?? []) as ExameRecord[]);
}

export async function buscarExamePorId(id: string): Promise<ExameRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("exames")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as ExameRecord | null) ?? null;
}

export async function buscarExamePorNome(
  nome: string
): Promise<ExameRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("exames")
    .select("*")
    .eq("nome", nome.trim())
    .maybeSingle();

  if (error) throw error;
  return (data as ExameRecord | null) ?? null;
}

export async function criarExame(exame: ExameCatalogInsert): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("exames")
    .insert({ ...exame, updated_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function atualizarExame(
  id: string,
  exame: ExameCatalogInsert
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("exames")
    .update({ ...exame, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function setExameAtivo(
  id: string,
  ativo: boolean
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("exames")
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
