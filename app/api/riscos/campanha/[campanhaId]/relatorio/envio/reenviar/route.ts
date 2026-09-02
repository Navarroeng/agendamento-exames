import { NextResponse } from "next/server";
import { requireRiscosStaffApi } from "@/lib/riscos-api-auth.server";
import { reenviarRelatorioRiscosPorEmailResend } from "@/services/riscos-relatorio-reenvio-email.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  request: Request,
  context: { params: Promise<{ campanhaId: string }> }
) {
  try {
    const auth = await requireRiscosStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const { campanhaId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      reenvioIntentToken?: string;
      usuarioNome?: string;
      usuarioEmail?: string;
    };
    const email = String(body.email ?? "").trim();
    const reenvioIntentToken = String(body.reenvioIntentToken ?? "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail do destinatário." },
        { status: 400 }
      );
    }
    if (!reenvioIntentToken) {
      return NextResponse.json(
        { error: "Intent de reenvio ausente. Inicie o reenvio novamente." },
        { status: 400 }
      );
    }

    const result = await reenviarRelatorioRiscosPorEmailResend({
      campanhaId,
      email,
      reenvioIntentToken,
      request,
      auditContext: {
        usuarioId: auth.user.id,
        usuarioNome: body.usuarioNome?.trim() || auth.usuarioNome,
        usuarioEmail: body.usuarioEmail?.trim() || auth.usuarioEmail,
      },
    });

    return NextResponse.json({
      ok: true,
      relatorio: result.relatorio,
      resendMessageId: result.resendMessageId,
    });
  } catch (err) {
    console.error("[relatorio/envio/reenviar POST]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível reenviar o relatório. Tente novamente.";
    const status = message.includes("Não foi possível reenviar") ? 502 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
