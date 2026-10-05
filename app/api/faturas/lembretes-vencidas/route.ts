import { NextResponse } from "next/server";
import { requireFaturasStaffApi } from "@/lib/faturas-api-auth.server";
import { dataVencimentoCivil } from "@/lib/fatura-lembrete";
import { consultarLembretesVencidas } from "@/services/fatura-lembrete-lote.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireFaturasStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const painel = await consultarLembretesVencidas();
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
        vencimento: dataVencimentoCivil(fatura.data_vencimento),
        diasAtraso: fatura.diasAtraso,
      })),
      jaLembradas: painel.jaLembradas,
    });
  } catch (err) {
    console.error("[faturas/lembretes-vencidas GET]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível consultar as faturas vencidas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
