import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AVALIACAO_SESSION_COOKIE,
  criarHashCodigoAcessoCampanha,
  gerarCodigoAcessoCompartilhado,
  verifyAvaliacaoSessionToken,
} from "@/lib/avaliacao-acesso";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Gera código compartilhado + hash (somente usuário autenticado do painel).
 * Body opcional: { campanhaId?, codigo? } — se campanhaId, persiste na campanha.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // Sessão de avaliação do portal não autoriza este endpoint.
    const cookieStore = cookies();
    const portalToken = cookieStore.get(AVALIACAO_SESSION_COOKIE)?.value;
    if (portalToken && verifyAvaliacaoSessionToken(portalToken) && !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      campanhaId?: string;
      codigo?: string;
    };

    const codigoBruto =
      body.codigo?.trim() || gerarCodigoAcessoCompartilhado(8);
    const { salt, hash, exibicao } =
      criarHashCodigoAcessoCampanha(codigoBruto);

    if (body.campanhaId) {
      const { error } = await supabase
        .from("riscos_campanhas")
        .update({
          codigo_acesso_salt: salt,
          codigo_acesso_hash: hash,
          codigo_acesso_exibicao: exibicao,
        })
        .eq("id", body.campanhaId);

      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      salt,
      hash,
      exibicao,
    });
  } catch (err) {
    console.error("[gerar-codigo-acesso]", err);
    return NextResponse.json(
      { error: "Não foi possível gerar o código de acesso." },
      { status: 500 }
    );
  }
}
