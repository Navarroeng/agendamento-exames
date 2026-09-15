import { NextResponse } from "next/server";
import { auditoriaActorFromSessionPerfil } from "@/lib/auditoria";
import {
  podeGerenciarParticipanteRiscos,
  RISCOS_GERENCIAR_PARTICIPANTE_SEM_PERMISSAO_MSG,
} from "@/lib/riscos-abrir-pesquisa-permissao";
import { createClient } from "@/lib/supabase/server";
import { removerParticipanteCampanhaSoft } from "@/services/riscos-remocao-participante.service";

export const runtime = "nodejs";

/**
 * Soft-delete do participante (com invalidação de sessão se houver).
 * Não retorna respostas individuais. Admin ou allowlist operacional.
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

    const { data: perfil, error: perfilErr } = await supabase
      .from("perfis_usuarios")
      .select("perfil, ativo, nome, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (perfilErr) throw perfilErr;
    const autorizado =
      !!perfil &&
      perfil.ativo !== false &&
      podeGerenciarParticipanteRiscos({
        perfil: perfil.perfil,
        email: typeof perfil.email === "string" ? perfil.email : null,
        emailAuth: user.email,
      });
    if (!autorizado) {
      return NextResponse.json(
        { error: RISCOS_GERENCIAR_PARTICIPANTE_SEM_PERMISSAO_MSG },
        { status: 403 }
      );
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
      tinhaSessaoConcluida: result.tinhaSessaoConcluida,
    });
  } catch (err) {
    console.error("[riscos/participante/remover]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível remover.";
    const status =
      message.includes("já foi removido") ||
      message.includes("não encontrado") ||
      message.includes("inválido")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
