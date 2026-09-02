import { NextResponse } from "next/server";
import { requireRiscosStaffApi } from "@/lib/riscos-api-auth.server";
import { enviarRelatorioRiscosPorEmailResend } from "@/services/riscos-relatorio-envio-email.server";

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
      usuarioNome?: string;
      usuarioEmail?: string;
    };
    const email = String(body.email ?? "").trim();
    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail do destinatário." },
        { status: 400 }
      );
    }

    const result = await enviarRelatorioRiscosPorEmailResend({
      campanhaId,
      email,
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
    console.error("[relatorio/envio/enviar POST]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível enviar o relatório. Tente novamente.";
    const status =
      message.includes("Não autorizado") ||
      message.includes("inválid") ||
      message.includes("Gere o relatório") ||
      message.includes("já foi confirmado") ||
      message.includes("cancelad")
        ? 400
        : message.includes("Não foi possível enviar")
          ? 502
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
