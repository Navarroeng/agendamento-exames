import { NextResponse } from "next/server";
import { requireFaturasStaffApi } from "@/lib/faturas-api-auth.server";
import { reenviarFaturaClientePorEmailResend } from "@/services/fatura-reenvio-email.server";

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
        { error: "Intent de reenvio inválido." },
        { status: 400 }
      );
    }

    const result = await reenviarFaturaClientePorEmailResend({
      faturaId,
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
      fatura: result.fatura,
      resendMessageId: result.resendMessageId,
    });
  } catch (err) {
    console.error("[faturas/envio/reenviar POST]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Não foi possível enviar a fatura. Tente novamente.";
    const status =
      message.includes("Não autorizado") ||
      message.includes("inválid") ||
      message.includes("Intent") ||
      message.includes("não pode") ||
      message.includes("não encontrada") ||
      message.includes("ainda não foi enviada")
        ? 400
        : message.includes("Não foi possível enviar")
          ? 502
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
