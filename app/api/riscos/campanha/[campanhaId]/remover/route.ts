import { NextResponse } from "next/server";
import { isPerfilAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { removerProcessoRiscosNoServidor } from "@/services/riscos-campanha-cancelar.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remoção definitiva do processo (admin, produção).
 * CASCADE no banco remove árvore; auditoria de app é gravada antes do DELETE.
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
        { error: "Somente administradores podem remover o processo." },
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
    let confirmacaoCodigo = "";
    let motivoOpcao = "";
    let motivoOutro = "";

    try {
      const body = (await request.json()) as {
        confirmacaoCodigo?: string;
        motivoOpcao?: string;
        motivoOutro?: string;
        usuarioNome?: string;
        usuarioEmail?: string;
      };
      if (body?.confirmacaoCodigo != null) {
        confirmacaoCodigo = String(body.confirmacaoCodigo);
      }
      if (body?.motivoOpcao != null) motivoOpcao = String(body.motivoOpcao);
      if (body?.motivoOutro != null) motivoOutro = String(body.motivoOutro);
      if (body?.usuarioNome?.trim()) usuarioNome = body.usuarioNome.trim();
      if (body?.usuarioEmail?.trim()) usuarioEmail = body.usuarioEmail.trim();
    } catch {
      //
    }

    const result = await removerProcessoRiscosNoServidor(
      campanhaId,
      { confirmacaoCodigo, motivoOpcao, motivoOutro },
      {
        auditContext: {
          usuarioId: user.id,
          usuarioNome,
          usuarioEmail,
        },
      }
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[riscos/campanha/remover]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível remover o processo.";
    const status =
      message.includes("Somente") ||
      message.includes("motivo") ||
      message.includes("código") ||
      message.includes("não encontrada") ||
      message.includes("inválida") ||
      message.includes("relatório")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
