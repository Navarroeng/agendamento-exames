import { NextResponse } from "next/server";
import { requireFaturasStaffApi } from "@/lib/faturas-api-auth.server";
import { consultarLembretesHoje } from "@/services/fatura-lembrete-lote.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireFaturasStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const painel = await consultarLembretesHoje();
    return NextResponse.json({
      ok: true,
      hojeIso: painel.hojeIso,
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
