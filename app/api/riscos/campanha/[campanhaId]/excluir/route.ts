import { NextResponse } from "next/server";
import { auditoriaActorFromSessionPerfil } from "@/lib/auditoria";
import { isPerfilAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  exclusaoDefinitivaCampanhaPermitida,
  excluirCampanhaRiscosNoServidor,
} from "@/services/riscos-campanha-cancelar.server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: { campanhaId: string } }
) {
  try {
    if (!exclusaoDefinitivaCampanhaPermitida()) {
      return NextResponse.json(
        {
          error:
            "Exclusão definitiva não está habilitada neste ambiente. Use Cancelar processo.",
        },
        { status: 403 }
      );
    }

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
        { error: "Somente administradores podem excluir campanhas." },
        { status: 403 }
      );
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    let confirmacaoCodigo = "";

    try {
      const body = (await request.json()) as {
        confirmacaoCodigo?: string;
        usuarioNome?: string;
        usuarioEmail?: string;
      };
      if (body?.confirmacaoCodigo != null) {
        confirmacaoCodigo = String(body.confirmacaoCodigo);
      }
    } catch {
      //
    }

    const result = await excluirCampanhaRiscosNoServidor(
      campanhaId,
      confirmacaoCodigo,
      {
        auditContext: auditoriaActorFromSessionPerfil({ user, perfil }),
      }
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[riscos/campanha/excluir]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível excluir a campanha.";
    const status =
      message.includes("Somente") ||
      message.includes("não está habilitada") ||
      message.includes("código") ||
      message.includes("não encontrada") ||
      message.includes("inválida")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
