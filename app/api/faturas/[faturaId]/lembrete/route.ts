import { NextResponse } from "next/server";
import { requireFaturasStaffApi } from "@/lib/faturas-api-auth.server";
import { listarLembretesFatura } from "@/services/fatura-lembrete-email.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ faturaId: string }> }
) {
  try {
    const auth = await requireFaturasStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const { faturaId } = await context.params;
    const lembretes = await listarLembretesFatura(faturaId);
    return NextResponse.json({ ok: true, lembretes });
  } catch (err) {
    console.error("[faturas/lembrete GET]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível carregar o histórico de lembretes.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
