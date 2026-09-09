import { NextResponse } from "next/server";
import { auditoriaActorFromSessionPerfil } from "@/lib/auditoria";
import { createClient } from "@/lib/supabase/server";
import { removerParticipanteCampanhaSoft } from "@/services/riscos-remocao-participante.service";

export const runtime = "nodejs";

/**
 * Compatibilidade: invalidar → remoção lógica unificada.
 */
export async function POST(
  request: Request,
  context: { params: { participanteId: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: perfil } = await supabase
      .from("perfis_usuarios")
      .select("perfil, ativo, nome, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!perfil || perfil.ativo === false) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const participanteId = String(context.params.participanteId ?? "").trim();
    if (!participanteId) {
      return NextResponse.json(
        { error: "Participante inválido." },
        { status: 400 }
      );
    }

    let motivo: string | undefined;
    try {
      const body = (await request.json()) as {
        motivo?: string;
        usuarioNome?: string;
        usuarioEmail?: string;
      };
      if (body?.motivo?.trim()) motivo = body.motivo.trim();
    } catch {
      // corpo opcional
    }

    const result = await removerParticipanteCampanhaSoft(
      { participanteId, motivo },
      {
        auditContext: auditoriaActorFromSessionPerfil({ user, perfil }),
      }
    );

    return NextResponse.json({
      ok: true,
      participanteId: result.participanteId,
      campanhaId: result.campanhaId,
    });
  } catch (err) {
    console.error("[riscos/participante/invalidar→remover]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível remover.";
    const status =
      message.includes("já foi removido") ||
      message.includes("não encontrado")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
