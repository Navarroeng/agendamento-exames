import { NextResponse } from "next/server";
import { requireRiscosStaffApi } from "@/lib/riscos-api-auth.server";
import { prepararReenvioRelatorioRiscos } from "@/services/riscos-relatorio-reenvio-email.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ campanhaId: string }> }
) {
  try {
    const auth = await requireRiscosStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const { campanhaId } = await context.params;
    const result = await prepararReenvioRelatorioRiscos(campanhaId);

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[relatorio/envio/reenviar/intent POST]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Não foi possível preparar o reenvio.",
      },
      { status: 400 }
    );
  }
}
