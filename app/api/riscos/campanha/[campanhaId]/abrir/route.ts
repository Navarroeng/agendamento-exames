import { NextResponse } from "next/server";
import { isPerfilAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { abrirCampanhaRiscosNoServidor } from "@/services/riscos-campanha-abrir.server";

export const runtime = "nodejs";

/**
 * Abre a pesquisa (status → aberta) com persistência confirmada no banco.
 * Autenticado + perfil admin. Usa service role apenas após checagem de sessão.
 */
export async function POST(
  request: Request,
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
        { error: "Somente administradores podem abrir a pesquisa." },
        { status: 403 }
      );
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    let usuarioNome =
      (typeof perfil.nome === "string" && perfil.nome.trim()) ||
      user.email ||
      "Administrador";
    let usuarioEmail =
      (typeof perfil.email === "string" && perfil.email.trim()) ||
      user.email ||
      "";

    try {
      const body = (await request.json()) as {
        usuarioNome?: string;
        usuarioEmail?: string;
      };
      if (body?.usuarioNome?.trim()) usuarioNome = body.usuarioNome.trim();
      if (body?.usuarioEmail?.trim()) usuarioEmail = body.usuarioEmail.trim();
    } catch {
      // corpo opcional
    }

    const campanha = await abrirCampanhaRiscosNoServidor(campanhaId, {
      auditContext: {
        usuarioId: user.id,
        usuarioNome,
        usuarioEmail,
      },
    });

    if (campanha.status !== "aberta") {
      return NextResponse.json(
        {
          error:
            "A abertura não foi confirmada no banco. O status da campanha não foi alterado.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, campanha });
  } catch (err) {
    console.error("[riscos/campanha/abrir]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível abrir a pesquisa.";
    const status =
      message.includes("já está aberta") ||
      message.includes("encerrada") ||
      message.includes("preparação") ||
      message.includes("período") ||
      message.includes("não encontrada") ||
      message.includes("inválida")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
