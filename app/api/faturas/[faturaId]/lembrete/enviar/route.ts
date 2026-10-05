import { NextResponse } from "next/server";
import { auditoriaActorFromAuth } from "@/lib/auditoria";
import { requireFaturasStaffApi } from "@/lib/faturas-api-auth.server";
import { enviarLembreteFaturaClienteResend } from "@/services/fatura-lembrete-email.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(
  request: Request,
  context: { params: Promise<{ faturaId: string }> }
) {
  try {
    const auth = await requireFaturasStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const { faturaId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      assunto?: string;
      mensagem?: string;
      requestId?: string;
    };

    const result = await enviarLembreteFaturaClienteResend({
      faturaId,
      email: String(body.email ?? ""),
      assunto: String(body.assunto ?? ""),
      mensagem: String(body.mensagem ?? ""),
      requestId: String(body.requestId ?? ""),
      request,
      auditContext: auditoriaActorFromAuth(auth),
    });

    return NextResponse.json({
      ok: true,
      lembrete: result.lembrete,
      faturaLembreteUltimoEm: result.faturaLembreteUltimoEm,
      faturaLembreteUltimoEmail: result.faturaLembreteUltimoEmail,
      resendMessageId: result.resendMessageId,
      entregaConfirmada: false,
    });
  } catch (err) {
    console.error("[faturas/lembrete/enviar POST]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível enviar o lembrete. O envio não foi registrado.";
    const status = message.includes("Não autorizado")
      ? 403
      : message.includes("não encontrada")
        ? 404
        : message.includes("Não foi possível enviar o lembrete")
          ? 502
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
