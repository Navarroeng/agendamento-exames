import { NextResponse } from "next/server";
import { isPerfilAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { regenerarRelatorioFinalNoServidor } from "@/services/riscos-relatorio.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Regenera o relatório final (somente administrador).
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
        { error: "Somente administradores podem regenerar o relatório." },
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
      // opcional
    }

    const relatorio = await regenerarRelatorioFinalNoServidor(campanhaId, {
      auditContext: {
        usuarioId: user.id,
        usuarioNome,
        usuarioEmail,
      },
    });

    return NextResponse.json({ ok: true, relatorio });
  } catch (err) {
    console.error("[riscos/relatorio/regenerar]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível regenerar o relatório.";
    const status =
      message.includes("Ainda existem") ||
      message.includes("Cadastre") ||
      message.includes("cancelada") ||
      message.includes("não encontrada")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
