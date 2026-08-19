/**
 * Gate de staff para APIs do Portal do Cliente (preview interno).
 */

import { createClient } from "@/lib/supabase/server";
import { isPerfilStaffNavarro } from "@/lib/portal-cliente";

export type PortalStaffResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string };

export async function requirePortalStaffUser(): Promise<PortalStaffResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Não autenticado." };
  }

  const rpc = await supabase.rpc("is_staff_user");
  if (!rpc.error) {
    if (rpc.data === true) return { ok: true };
    return {
      ok: false,
      status: 403,
      error: "Acesso restrito à equipe Navarro.",
    };
  }

  const perfilRes = await supabase
    .from("perfis_usuarios")
    .select("perfil, ativo")
    .eq("user_id", user.id)
    .maybeSingle();

  if (perfilRes.error) {
    return {
      ok: false,
      status: 403,
      error: "Acesso restrito à equipe Navarro.",
    };
  }

  const row = perfilRes.data as { perfil?: string; ativo?: boolean } | null;
  if (isPerfilStaffNavarro(row?.perfil, row?.ativo !== false)) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 403,
    error: "Acesso restrito à equipe Navarro.",
  };
}
