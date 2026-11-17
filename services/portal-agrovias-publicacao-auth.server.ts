import "server-only";

import { isPerfilAdmin } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";
import { resolverEscopoGestaoPlataformas } from "@/services/gestao-plataformas.server";

export async function autorizarEquipeAgrovias(): Promise<
  | { ok: true; clienteId: string; userId: string }
  | { ok: false; status: number; error: string }
> {
  const staff = await requireClientesStaffActor();
  if (!staff.ok) return staff;
  const escopo = await resolverEscopoGestaoPlataformas();
  if (!escopo.ok) return escopo;
  return {
    ok: true,
    clienteId: escopo.escopo.clienteId,
    userId: staff.actor.usuarioId ?? "",
  };
}

export async function autorizarPublicacaoAgrovias(): Promise<
  | { ok: true; clienteId: string; userId: string }
  | { ok: false; status: number; error: string }
> {
  const equipe = await autorizarEquipeAgrovias();
  if (!equipe.ok) return equipe;
  const admin = createAdminClient();
  const { data: perfil } = await admin
    .from("perfis_usuarios")
    .select("perfil, ativo")
    .eq("user_id", equipe.userId)
    .maybeSingle();
  if (!perfil || perfil.ativo === false || !isPerfilAdmin(perfil.perfil)) {
    return {
      ok: false,
      status: 403,
      error: "Somente um administrador pode publicar para o cliente.",
    };
  }
  return equipe;
}
