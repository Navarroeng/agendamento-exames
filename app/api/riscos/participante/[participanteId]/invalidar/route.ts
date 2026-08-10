import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MOTIVO_INVALIDACAO_PADRAO } from "@/lib/riscos-invalidacao";
import { invalidarParticipacaoCampanha } from "@/services/riscos-invalidacao.service";

export const runtime = "nodejs";

/**
 * Invalida participação concluída (sem apagar respostas; sem expor respostas).
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

    let motivo = MOTIVO_INVALIDACAO_PADRAO;
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

    const result = await invalidarParticipacaoCampanha(
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
    });
  } catch (err) {
    console.error("[riscos/participante/invalidar]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível invalidar.";
    const status =
      message.includes("já está invalidada") ||
      message.includes("Somente participantes") ||
      message.includes("não encontrado") ||
      message.includes("vínculo técnico")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
