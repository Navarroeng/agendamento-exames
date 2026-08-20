import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buscarRelatorioPorCampanhaId,
  gerarRelatorioFinalNoServidor,
} from "@/services/riscos-relatorio.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfis_usuarios")
    .select("perfil, ativo, nome, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!perfil || perfil.ativo === false) return null;

  return {
    user,
    usuarioNome:
      (typeof perfil.nome === "string" && perfil.nome.trim()) ||
      user.email ||
      "Usuário",
    usuarioEmail:
      (typeof perfil.email === "string" && perfil.email.trim()) ||
      user.email ||
      "",
  };
}

export async function GET(
  _request: Request,
  context: { params: { campanhaId: string } }
) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    const relatorio = await buscarRelatorioPorCampanhaId(campanhaId);
    return NextResponse.json({
      ok: true,
      relatorio,
      existe: Boolean(relatorio),
    });
  } catch (err) {
    console.error("[riscos/relatorio GET]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível carregar o relatório.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: { campanhaId: string } }
) {
  try {
    const auth = await requireUser();
    if (!auth) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    let usuarioNome = auth.usuarioNome;
    let usuarioEmail = auth.usuarioEmail;
    try {
      const body = (await request.json()) as {
        usuarioNome?: string;
        usuarioEmail?: string;
      };
      if (body?.usuarioNome?.trim()) usuarioNome = body.usuarioNome.trim();
      if (body?.usuarioEmail?.trim()) usuarioEmail = body.usuarioEmail.trim();
    } catch {
      // corpo opcional
    }

    const relatorio = await gerarRelatorioFinalNoServidor(campanhaId, {
      auditContext: {
        usuarioId: auth.user.id,
        usuarioNome,
        usuarioEmail,
      },
    });

    return NextResponse.json({ ok: true, relatorio });
  } catch (err) {
    console.error("[riscos/relatorio POST]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível gerar o relatório.";
    const status =
      message.includes("Ainda existem") ||
      message.includes("Já existe") ||
      message.includes("Cadastre") ||
      message.includes("cancelada") ||
      message.includes("cancelado") ||
      message.includes("não encontrada")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
