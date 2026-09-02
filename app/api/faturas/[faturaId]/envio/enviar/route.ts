import { NextResponse } from "next/server";
import { requireFaturasStaffApi } from "@/lib/faturas-api-auth.server";
import { enviarFaturaClientePorEmailResend } from "@/services/fatura-envio-email.server";

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

    const result = await enviarFaturaClientePorEmailResend({
      faturaId,
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
      fatura: result.fatura,
      resendMessageId: result.resendMessageId,
    });
  } catch (err) {
    console.error("[faturas/envio/enviar POST]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível enviar a fatura. Tente novamente.";
    const status =
      message.includes("Não autorizado") ||
      message.includes("inválid") ||
      message.includes("não pode") ||
      message.includes("já foi enviada") ||
      message.includes("não encontrada")
        ? 400
        : message.includes("Não foi possível enviar")
          ? 502
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
