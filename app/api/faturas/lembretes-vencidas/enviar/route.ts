import { NextResponse } from "next/server";
import { auditoriaActorFromAuth } from "@/lib/auditoria";
import { requireFaturasStaffApi } from "@/lib/faturas-api-auth.server";
import { normalizarCompetenciaIso } from "@/lib/fatura-lembrete";
import { executarLembreteVencidaUma } from "@/services/fatura-lembrete-lote.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const auth = await requireFaturasStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      faturaId?: string;
      competencia?: string;
    };
    const faturaId = String(body.faturaId ?? "").trim();
    const competenciaIso = normalizarCompetenciaIso(body.competencia);
    if (!faturaId) {
      return NextResponse.json(
        { error: "Informe a fatura do lembrete." },
        { status: 400 }
      );
    }
    if (!competenciaIso) {
      return NextResponse.json(
        { error: "Informe a competência do lote." },
        { status: 400 }
      );
    }

    const item = await executarLembreteVencidaUma(faturaId, {
      competenciaIso,
      request,
      auditContext: auditoriaActorFromAuth(auth),
    });

    return NextResponse.json({
      ok: true,
      item,
      entregaConfirmada: false,
    });
  } catch (err) {
    console.error("[faturas/lembretes-vencidas/enviar POST]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível enviar o lembrete. O envio não foi registrado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
