import { NextResponse } from "next/server";
import {
  podeAbrirPesquisaRiscos,
  RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG,
} from "@/lib/riscos-abrir-pesquisa-permissao";
import { createClient } from "@/lib/supabase/server";
import { prorrogarPrazoCampanhaNoServidor } from "@/services/riscos-campanha-ciclo.server";

export const runtime = "nodejs";

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
    const autorizado =
      !!perfil &&
      perfil.ativo !== false &&
      podeAbrirPesquisaRiscos({
        perfil: perfil.perfil,
        email: typeof perfil.email === "string" ? perfil.email : null,
        emailAuth: user.email,
      });
    if (!autorizado) {
      return NextResponse.json(
        { error: RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG },
        { status: 403 }
      );
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      novaDataEncerramentoIso?: string;
      usuarioNome?: string;
      usuarioEmail?: string;
    };

    const usuarioNome =
      body.usuarioNome?.trim() ||
      (typeof perfil.nome === "string" && perfil.nome.trim()) ||
      user.email ||
      "Usuário";
    const usuarioEmail =
      body.usuarioEmail?.trim() ||
      (typeof perfil.email === "string" && perfil.email.trim()) ||
      user.email ||
      "";

    const campanha = await prorrogarPrazoCampanhaNoServidor(
      campanhaId,
      String(body.novaDataEncerramentoIso ?? ""),
      {
        auditContext: {
          usuarioId: user.id,
          usuarioNome,
          usuarioEmail,
        },
      }
    );

    return NextResponse.json({ ok: true, campanha });
  } catch (err) {
    console.error("[riscos/campanha/prorrogar]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível prorrogar o prazo.";
    const status =
      message.includes("não encontrada") ||
      message.includes("Informe") ||
      message.includes("posterior") ||
      message.includes("cancelad") ||
      message.includes("Reabrir") ||
      message.includes("inválida")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
