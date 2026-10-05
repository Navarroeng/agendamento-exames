import { NextResponse } from "next/server";
import { requireFaturasStaffApi } from "@/lib/faturas-api-auth.server";
import {
  competenciaLembreteExtenso,
  competenciaLembreteTitulo,
  normalizarCompetenciaIso,
} from "@/lib/fatura-lembrete";
import { consultarLembretesHoje } from "@/services/fatura-lembrete-lote.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireFaturasStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const competenciaIso = normalizarCompetenciaIso(
      new URL(request.url).searchParams.get("competencia")
    );
    if (!competenciaIso) {
      return NextResponse.json(
        { error: "Informe a competência do lote." },
        { status: 400 }
      );
    }

    const painel = await consultarLembretesHoje({ competenciaIso });
    const extenso = competenciaLembreteExtenso({ mesReferencia: competenciaIso });
    return NextResponse.json({
      ok: true,
      hojeIso: painel.hojeIso,
      competenciaIso,
      competenciaTitulo: extenso ? competenciaLembreteTitulo(extenso) : null,
      elegiveis: painel.elegiveis,
      pendentes: painel.pendentes.map((fatura) => ({
        id: fatura.id,
        numero: fatura.numero,
        referenciaId: fatura.referencia_id,
        empresa: fatura.referencia_nome,
        valor: fatura.valor_total,
        email: fatura.email,
      })),
      jaLembradas: painel.jaLembradas,
    });
  } catch (err) {
    console.error("[faturas/lembretes-hoje GET]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível consultar as faturas que vencem hoje.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
