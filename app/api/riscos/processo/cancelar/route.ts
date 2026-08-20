import { NextResponse } from "next/server";
import { isPerfilStaffNavarro } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { cancelarProcessoListagemRiscosNoServidor } from "@/services/riscos-campanha-cancelar.server";

export const runtime = "nodejs";

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
    if (!perfil || perfil.ativo === false || !isPerfilStaffNavarro(perfil.perfil)) {
      return NextResponse.json(
        { error: "Sem permissão para cancelar o processo." },
        { status: 403 }
      );
    }

    let usuarioNome =
      (typeof perfil.nome === "string" && perfil.nome.trim()) ||
      user.email ||
      "Usuário";
    let usuarioEmail =
      (typeof perfil.email === "string" && perfil.email.trim()) ||
      user.email ||
      "";
    let motivo = "";
    let orcamentoId = "";
    let campanhaId = "";

    try {
      const body = (await request.json()) as {
        motivo?: string;
        orcamentoId?: string;
        campanhaId?: string;
        usuarioNome?: string;
        usuarioEmail?: string;
      };
      if (body?.motivo != null) motivo = String(body.motivo);
      if (body?.orcamentoId?.trim()) orcamentoId = body.orcamentoId.trim();
      if (body?.campanhaId?.trim()) campanhaId = body.campanhaId.trim();
      if (body?.usuarioNome?.trim()) usuarioNome = body.usuarioNome.trim();
      if (body?.usuarioEmail?.trim()) usuarioEmail = body.usuarioEmail.trim();
    } catch {
      // body obrigatório
    }

    const result = await cancelarProcessoListagemRiscosNoServidor(
      { orcamentoId, campanhaId, motivo },
      {
        auditContext: {
          usuarioId: user.id,
          usuarioNome,
          usuarioEmail,
        },
      }
    );

    if (result.status !== "cancelado") {
      return NextResponse.json(
        { error: "O cancelamento não foi confirmado no banco." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[riscos/processo/cancelar]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível cancelar o processo.";
    const status =
      message.includes("Sem permissão") ||
      message.includes("já está cancelado") ||
      message.includes("não pode ser cancelado") ||
      message.includes("motivo") ||
      message.includes("Informe") ||
      message.includes("não encontrada") ||
      message.includes("inválida") ||
      message.includes("Migration")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
