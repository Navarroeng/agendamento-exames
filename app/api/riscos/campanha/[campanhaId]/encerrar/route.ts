import { NextResponse } from "next/server";
import { auditoriaActorFromSessionPerfil } from "@/lib/auditoria";
import { isPerfilAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { encerrarCampanhaRiscosNoServidor } from "@/services/riscos-campanha-status.server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: { campanhaId: string } }
) {
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
        { error: "Somente administradores podem encerrar a pesquisa." },
        { status: 403 }
      );
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    const campanha = await encerrarCampanhaRiscosNoServidor(campanhaId, {
      auditContext: auditoriaActorFromSessionPerfil({ user, perfil }),
    });

    if (campanha.status !== "encerrada") {
      return NextResponse.json(
        { error: "O encerramento não foi confirmado no banco." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, campanha });
  } catch (err) {
    console.error("[riscos/campanha/encerrar]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível encerrar a pesquisa.";
    const status =
      message.includes("Somente") ||
      message.includes("abertas") ||
      message.includes("não encontrada") ||
      message.includes("inválida")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
