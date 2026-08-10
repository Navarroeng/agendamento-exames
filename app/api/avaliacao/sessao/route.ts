import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AVALIACAO_SESSION_COOKIE,
  verifyAvaliacaoSessionToken,
} from "@/lib/avaliacao-acesso";
import { registrarAuditoriaPortal } from "@/lib/avaliacao-auditoria";
import { getClientIpFromRequest } from "@/lib/avaliacao-rate-limit";
import { assertCodigoPublicoSessao } from "@/lib/avaliacao-validacao";
import {
  avaliarPeriodoCampanha,
  participanteJaConcluiu,
} from "@/lib/avaliacao-validacao";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codigoPublico = String(searchParams.get("codigoPublico") ?? "")
      .trim()
      .toUpperCase();

    const cookieStore = cookies();
    const token = cookieStore.get(AVALIACAO_SESSION_COOKIE)?.value;
    const sessao = verifyAvaliacaoSessionToken(token);

    if (!sessao) {
      return NextResponse.json({ ok: false, autenticado: false });
    }

    if (
      codigoPublico &&
      !assertCodigoPublicoSessao(sessao.codigoPublico, codigoPublico)
    ) {
      return NextResponse.json(
        {
          ok: false,
          autenticado: false,
          codigo: "nao_apto",
        },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const ip = getClientIpFromRequest(request);

    const { data: campanha } = await supabase
      .from("riscos_campanhas")
      .select(
        "id, empresa_nome, status, codigo_publico, data_inicio, data_encerramento"
      )
      .eq("id", sessao.campanhaId)
      .maybeSingle();

    const { data: participante } = await supabase
      .from("riscos_campanha_participantes")
      .select("id, nome_completo, status, concluiu_em, campanha_id")
      .eq("id", sessao.participanteId)
      .eq("campanha_id", sessao.campanhaId)
      .maybeSingle();

    if (!campanha || !participante) {
      return NextResponse.json({ ok: false, autenticado: false });
    }

    const periodo = avaliarPeriodoCampanha({
      status: String(campanha.status ?? ""),
      data_inicio: String(campanha.data_inicio ?? ""),
      data_encerramento: String(campanha.data_encerramento ?? ""),
    });

    if (periodo === "encerrada") {
      await registrarAuditoriaPortal(supabase, {
        evento: "tentativa_apos_encerramento",
        campanhaId: sessao.campanhaId,
        participanteId: sessao.participanteId,
        codigoPublico: sessao.codigoPublico,
        ip,
        detalhes: { origem: "sessao" },
      });
      return NextResponse.json(
        {
          ok: false,
          autenticado: false,
          codigo: "campanha_encerrada",
        },
        { status: 403 }
      );
    }

    if (periodo !== "ok") {
      return NextResponse.json(
        { ok: false, autenticado: false, codigo: "nao_apto" },
        { status: 403 }
      );
    }

    if (
      participanteJaConcluiu({
        status: String(participante.status ?? ""),
        concluiu_em: participante.concluiu_em
          ? String(participante.concluiu_em)
          : null,
      })
    ) {
      await registrarAuditoriaPortal(supabase, {
        evento: "tentativa_apos_conclusao",
        campanhaId: sessao.campanhaId,
        participanteId: sessao.participanteId,
        codigoPublico: sessao.codigoPublico,
        ip,
        detalhes: { origem: "sessao" },
      });
      return NextResponse.json(
        {
          ok: false,
          autenticado: false,
          codigo: "ja_respondida",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      autenticado: true,
      empresaNome: String(campanha.empresa_nome ?? ""),
      participanteNome: String(participante.nome_completo ?? ""),
      codigoPublico: String(campanha.codigo_publico ?? "").toUpperCase(),
      campanhaId: sessao.campanhaId,
      participanteId: sessao.participanteId,
    });
  } catch (err) {
    console.error("[avaliacao/sessao]", err);
    return NextResponse.json(
      { ok: false, autenticado: false },
      { status: 500 }
    );
  }
}
