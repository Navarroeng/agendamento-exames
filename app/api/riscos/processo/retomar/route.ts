import { NextResponse } from "next/server";
import { auditoriaActorFromSessionPerfil } from "@/lib/auditoria";
import { isPerfilStaffNavarro } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { retomarProcessoRiscosNoServidor } from "@/services/riscos-processo-pausa.server";

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
        { error: "Sem permissão para retomar o processo." },
        { status: 403 }
      );
    }

    let orcamentoId = "";
    let campanhaId = "";

    try {
      const body = (await request.json()) as {
        orcamentoId?: string;
        campanhaId?: string;
      };
      if (body?.orcamentoId?.trim()) orcamentoId = body.orcamentoId.trim();
      if (body?.campanhaId?.trim()) campanhaId = body.campanhaId.trim();
    } catch {
      // body obrigatório
    }

    const result = await retomarProcessoRiscosNoServidor(
      { orcamentoId, campanhaId },
      {
        auditContext: auditoriaActorFromSessionPerfil({ user, perfil }),
      }
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[riscos/processo/retomar]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível retomar o processo.";
    const status =
      message.includes("Sem permissão") ||
      message.includes("não está pausado") ||
      message.includes("não pode ser retomado") ||
      message.includes("Informe") ||
      message.includes("não encontrada") ||
      message.includes("Migration")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
