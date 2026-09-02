import { isPerfilStaffNavarro } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export type RiscosStaffAuthContext = {
  user: { id: string; email?: string | null };
  usuarioNome: string;
  usuarioEmail: string;
};

export async function requireRiscosStaffApi(): Promise<
  RiscosStaffAuthContext | null
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil, error } = await supabase
    .from("perfis_usuarios")
    .select("perfil, ativo, nome, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!perfil || perfil.ativo === false || !isPerfilStaffNavarro(perfil.perfil)) {
    return null;
  }

  return {
    user,
    usuarioNome:
      (typeof perfil.nome === "string" && perfil.nome.trim()) ||
      user.email ||
      "Usuário",
    usuarioEmail:
      (typeof perfil.email === "string" && perfil.email.trim()) ||
      user.email ||
      "",
  };
}

/** Helper testável para validação de perfil staff. */
export function isRiscosStaffPerfil(perfil: unknown, ativo = true): boolean {
  const perfilStr =
    typeof perfil === "string" ? perfil : perfil == null ? null : String(perfil);
  return ativo !== false && isPerfilStaffNavarro(perfilStr);
}
