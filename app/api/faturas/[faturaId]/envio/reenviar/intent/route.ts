import { NextResponse } from "next/server";
import { requireFaturasStaffApi } from "@/lib/faturas-api-auth.server";
import { prepararReenvioFaturaCliente } from "@/services/fatura-reenvio-email.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ faturaId: string }> }
) {
  try {
    const auth = await requireFaturasStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const { faturaId } = await context.params;
    const result = await prepararReenvioFaturaCliente(faturaId);

    return NextResponse.json({
      ok: true,
      reenvioIntentToken: result.reenvioIntentToken,
    });
  } catch (err) {
    console.error("[faturas/envio/reenviar/intent POST]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível preparar o reenvio.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
