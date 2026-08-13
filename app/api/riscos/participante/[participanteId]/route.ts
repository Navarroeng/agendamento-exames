import { NextResponse } from "next/server";
import { isPerfilAdmin } from "@/lib/permissions";
import { CpfCampanhaAtivaError } from "@/lib/riscos-cpf-campanha-ativa";
import { createClient } from "@/lib/supabase/server";
import { atualizarParticipanteCampanhaNoServidor } from "@/services/riscos-campanha-participantes.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Atualiza dados cadastrais do participante.
 * Somente admin; somente status Pendente.
 */
export async function PATCH(
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
    if (!isPerfilAdmin(perfil.perfil)) {
      return NextResponse.json(
        { error: "Somente administradores podem editar participantes." },
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

    const body = (await request.json().catch(() => ({}))) as {
      nomeCompleto?: string;
      cpf?: string;
      dataNascimento?: string;
      email?: string;
    };

    const participante = await atualizarParticipanteCampanhaNoServidor(
      {
        participanteId,
        input: {
          nomeCompleto: String(body.nomeCompleto ?? ""),
          cpf: String(body.cpf ?? ""),
          dataNascimento: String(body.dataNascimento ?? ""),
        },
      },
      {
        auditContext: {
          usuarioId: user.id,
          usuarioNome:
            (typeof perfil.nome === "string" && perfil.nome.trim()) ||
            user.email ||
            "Usuário",
          usuarioEmail:
            (typeof perfil.email === "string" && perfil.email.trim()) ||
            user.email ||
            "",
        },
      }
    );

    return NextResponse.json({ ok: true, participante });
  } catch (err) {
    console.error("[riscos/participante PATCH]", err);
    if (err instanceof CpfCampanhaAtivaError) {
      return NextResponse.json(
        { error: err.message, conflict: err.conflict },
        { status: 409 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Não foi possível atualizar.";
    const status =
      message.includes("Já existe") ||
      message.includes("Informe") ||
      message.includes("não encontrado") ||
      message.includes("Pendente") ||
      message.includes("editar")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
