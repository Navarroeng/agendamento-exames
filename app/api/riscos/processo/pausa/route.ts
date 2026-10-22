import { NextResponse } from "next/server";
import { auditoriaActorFromSessionPerfil } from "@/lib/auditoria";
import { isPerfilStaffNavarro } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { pausarProcessoRiscosNoServidor } from "@/services/riscos-processo-pausa.server";

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
        { error: "Sem permissão para pausar o processo." },
        { status: 403 }
      );
    }

    let situacao = "";
    let observacao = "";
    let orcamentoId = "";
    let campanhaId = "";

    try {
      const body = (await request.json()) as {
        situacao?: string;
        observacao?: string;
        orcamentoId?: string;
        campanhaId?: string;
      };
      if (body?.situacao != null) situacao = String(body.situacao);
      if (body?.observacao != null) observacao = String(body.observacao);
      if (body?.orcamentoId?.trim()) orcamentoId = body.orcamentoId.trim();
      if (body?.campanhaId?.trim()) campanhaId = body.campanhaId.trim();
    } catch {
      // body obrigatório
    }

    const result = await pausarProcessoRiscosNoServidor(
      { orcamentoId, campanhaId, situacao, observacao },
      {
        auditContext: auditoriaActorFromSessionPerfil({ user, perfil }),
      }
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[riscos/processo/pausa]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível pausar o processo.";
    const status =
      message.includes("Sem permissão") ||
      message.includes("já está pausado") ||
      message.includes("não pode ser pausado") ||
      message.includes("não é possível pausar") ||
      message.includes("Não é possível pausar") ||
      message.includes("Situação") ||
      message.includes("Informe") ||
      message.includes("não encontrada") ||
      message.includes("inválid") ||
      message.includes("Migration") ||
      message.includes("observação")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
