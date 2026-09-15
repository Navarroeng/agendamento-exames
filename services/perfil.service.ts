import { createClient } from "@/lib/supabase/client";
import type { PerfilUsuario } from "@/lib/types";

export async function buscarPerfilUsuarioLogado(): Promise<PerfilUsuario | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from("perfis_usuarios")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  if (!data.ativo) return null;

  const emailPerfil =
    typeof data.email === "string" ? data.email.trim() : "";
  const emailAuth = typeof user.email === "string" ? user.email.trim() : "";

  return {
    ...(data as PerfilUsuario),
    email: emailPerfil || emailAuth || (data as PerfilUsuario).email,
  };
}

export async function listarPerfisUsuarios(): Promise<PerfilUsuario[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("perfis_usuarios")
    .select("*")
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PerfilUsuario[];
}
