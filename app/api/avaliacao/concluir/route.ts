import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AVALIACAO_SESSION_COOKIE,
  verifyAvaliacaoSessionToken,
} from "@/lib/avaliacao-acesso";
import { registrarAuditoriaPortal } from "@/lib/avaliacao-auditoria";
import { getClientIpFromRequest } from "@/lib/avaliacao-rate-limit";
import {
  carregarContextoPortal,
  listarRespostasDaSessao,
  obterOuCriarSessaoRespostas,
  perguntasObrigatoriasPendentes,
} from "@/lib/avaliacao-persistencia";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Conclui a pesquisa: valida obrigatoriedade, fecha sessão anônima,
 * marca participante como concluído e encerra cookie.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AVALIACAO_SESSION_COOKIE)?.value;
    const portal = verifyAvaliacaoSessionToken(token);
    if (!portal) {
      return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      codigoPublico?: string;
    };
    const codigo = String(body.codigoPublico ?? "")
      .trim()
      .toUpperCase();
    if (codigo && codigo !== portal.codigoPublico) {
      return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const ip = getClientIpFromRequest(request);

    const ctx = await carregarContextoPortal(supabase, {
      campanhaId: portal.campanhaId,
      participanteId: portal.participanteId,
      codigoPublico: portal.codigoPublico,
    });

    if (!ctx.ok) {
      if (ctx.codigo === "ja_respondida") {
        await registrarAuditoriaPortal(supabase, {
          evento: "tentativa_apos_conclusao",
          campanhaId: portal.campanhaId,
          participanteId: portal.participanteId,
          codigoPublico: portal.codigoPublico,
          ip,
          detalhes: { origem: "concluir" },
        });
      }
      return NextResponse.json(
        { ok: false, codigo: ctx.codigo },
        { status: 403 }
      );
    }

    const sessao = await obterOuCriarSessaoRespostas(supabase, {
      campanhaId: portal.campanhaId,
      participanteId: portal.participanteId,
    });

    if (sessao.status === "concluida") {
      return NextResponse.json(
        { ok: false, codigo: "ja_respondida" },
        { status: 403 }
      );
    }

    const respostas = await listarRespostasDaSessao(supabase, {
      sessaoId: sessao.id,
      campanhaId: portal.campanhaId,
    });
    const pendentes = perguntasObrigatoriasPendentes(respostas);
    if (pendentes.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          codigo: "incompleto",
          pendentes: pendentes.length,
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: sessaoOk, error: sessaoErr } = await supabase
      .from("riscos_avaliacao_sessoes")
      .update({
        status: "concluida",
        concluido_em: nowIso,
      })
      .eq("id", sessao.id)
      .eq("campanha_id", portal.campanhaId)
      .eq("status", "em_andamento")
      .select("id")
      .maybeSingle();
    if (sessaoErr) throw sessaoErr;
    if (!sessaoOk) {
      return NextResponse.json(
        { ok: false, codigo: "ja_respondida" },
        { status: 403 }
      );
    }

    const { data: updated, error } = await supabase
      .from("riscos_campanha_participantes")
      .update({
        status: "respondido",
        concluiu_em: nowIso,
      })
      .eq("id", portal.participanteId)
      .eq("campanha_id", portal.campanhaId)
      .eq("status", "pendente")
      .is("concluiu_em", null)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!updated) {
      await registrarAuditoriaPortal(supabase, {
        evento: "tentativa_apos_conclusao",
        campanhaId: portal.campanhaId,
        participanteId: portal.participanteId,
        codigoPublico: portal.codigoPublico,
        ip,
        detalhes: { origem: "concluir_conflito" },
      });
      return NextResponse.json(
        { ok: false, codigo: "ja_respondida" },
        { status: 403 }
      );
    }

    await registrarAuditoriaPortal(supabase, {
      evento: "conclusao",
      campanhaId: portal.campanhaId,
      participanteId: portal.participanteId,
      codigoPublico: portal.codigoPublico,
      ip,
      detalhes: {
        concluiu_em: nowIso,
        sessao_id: sessao.id,
        identificador_anonimo: sessao.identificador_anonimo,
      },
    });

    const response = NextResponse.json({
      ok: true,
      concluiuEm: nowIso,
      status: "respondido",
    });

    response.cookies.set(AVALIACAO_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("[avaliacao/concluir]", err);
    return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 500 });
  }
}
