import { NextResponse } from "next/server";
import { isPerfilAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cancelarProcessoRiscosNoServidor } from "@/services/riscos-campanha-cancelar.server";

export const runtime = "nodejs";

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
        { error: "Somente administradores podem cancelar o processo." },
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
    let motivo = "";

    try {
      const body = (await request.json()) as {
        motivo?: string;
        usuarioNome?: string;
        usuarioEmail?: string;
      };
      if (body?.motivo != null) motivo = String(body.motivo);
      if (body?.usuarioNome?.trim()) usuarioNome = body.usuarioNome.trim();
      if (body?.usuarioEmail?.trim()) usuarioEmail = body.usuarioEmail.trim();
    } catch {
      // body obrigatório para motivo
    }

    const campanha = await cancelarProcessoRiscosNoServidor(campanhaId, motivo, {
      auditContext: {
        usuarioId: user.id,
        usuarioNome,
        usuarioEmail,
      },
    });

    if (campanha.status !== "cancelada") {
      return NextResponse.json(
        { error: "O cancelamento não foi confirmado no banco." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, campanha });
  } catch (err) {
    console.error("[riscos/campanha/cancelar]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível cancelar o processo.";
    const status =
      message.includes("Somente") ||
      message.includes("já está cancelada") ||
      message.includes("motivo") ||
      message.includes("não encontrada") ||
      message.includes("inválida") ||
      message.includes("Migration")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
