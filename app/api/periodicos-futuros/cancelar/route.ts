import { NextResponse } from "next/server";
import { isPerfilAdmin } from "@/lib/permissions";
import {
  PERIODICO_CANCELAR_SEM_PERMISSAO_MSG,
} from "@/lib/periodico-cancelamento";
import { createClient } from "@/lib/supabase/server";
import { cancelarPeriodicoFuturoNoServidor } from "@/services/periodico-futuro-cancelar.server";

export const runtime = "nodejs";

/**
 * Cancela logicamente a obrigação do periódico futuro (ciclo completo).
 * Autenticado + perfil admin. Não cancela ASO/agendamento em cascata.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from("perfis_usuarios")
      .select("perfil, ativo, nome, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (perfilErr) throw perfilErr;
    if (!perfil || perfil.ativo === false || !isPerfilAdmin(perfil.perfil)) {
      return NextResponse.json(
        { error: PERIODICO_CANCELAR_SEM_PERMISSAO_MSG },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      ids?: string[];
      motivo?: string;
      usuarioNome?: string;
      usuarioEmail?: string;
    };

    const usuarioNome =
      (typeof body?.usuarioNome === "string" && body.usuarioNome.trim()) ||
      (typeof perfil.nome === "string" && perfil.nome.trim()) ||
      user.email ||
      "Administrador";
    const usuarioEmail =
      (typeof body?.usuarioEmail === "string" && body.usuarioEmail.trim()) ||
      (typeof perfil.email === "string" && perfil.email.trim()) ||
      user.email ||
      "";

    const result = await cancelarPeriodicoFuturoNoServidor({
      ids: Array.isArray(body?.ids) ? body.ids : [],
      motivo: typeof body?.motivo === "string" ? body.motivo : "",
      auditContext: {
        usuarioId: user.id,
        usuarioNome,
        usuarioEmail,
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Não foi possível cancelar o periódico futuro.";
    const status = /não autenticado/i.test(message)
      ? 401
      : /somente administradores/i.test(message)
        ? 403
        : /motivo|já está cancelado|não encontrado|nenhum periódico/i.test(message)
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
