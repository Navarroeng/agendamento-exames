import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removerParticipanteCampanhaSoft } from "@/services/riscos-remocao-participante.service";

export const runtime = "nodejs";

/**
 * Soft-delete administrativo do participante (com invalidação de sessão se houver).
 * Não retorna respostas individuais.
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

    const participanteId = String(context.params.participanteId ?? "").trim();
    if (!participanteId) {
      return NextResponse.json(
        { error: "Participante inválido." },
        { status: 400 }
      );
    }

    let motivo: string | undefined;
    let usuarioNome = user.email || "Administrador";
    let usuarioEmail = user.email || "";
    try {
      const body = (await request.json()) as {
        motivo?: string;
        usuarioNome?: string;
        usuarioEmail?: string;
      };
      if (body?.motivo?.trim()) motivo = body.motivo.trim();
      if (body?.usuarioNome?.trim()) usuarioNome = body.usuarioNome.trim();
      if (body?.usuarioEmail?.trim()) usuarioEmail = body.usuarioEmail.trim();
    } catch {
      // corpo opcional
    }

    const result = await removerParticipanteCampanhaSoft(
      { participanteId, motivo },
      {
        auditContext: {
          usuarioId: user.id,
          usuarioNome,
          usuarioEmail,
        },
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
