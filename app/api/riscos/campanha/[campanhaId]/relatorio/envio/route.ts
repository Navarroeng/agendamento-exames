import { NextResponse } from "next/server";
import { requireRiscosStaffApi } from "@/lib/riscos-api-auth.server";
import {
  confirmarEnvioRelatorioNoServidor,
  corrigirEnvioRelatorioNoServidor,
} from "@/services/riscos-relatorio.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        { error: "Informe o e-mail para o qual o relatório foi enviado." },
        { status: 400 }
      );
    }

    const relatorio = await confirmarEnvioRelatorioNoServidor(campanhaId, email, {
      origem: "manual",
      auditContext: {
        usuarioId: auth.user.id,
        usuarioNome: body.usuarioNome?.trim() || auth.usuarioNome,
        usuarioEmail: body.usuarioEmail?.trim() || auth.usuarioEmail,
      },
    });

    return NextResponse.json({ ok: true, relatorio });
  } catch (err) {
    console.error("[relatorio/envio POST]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Não foi possível confirmar o envio.",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(
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
        { error: "Informe o e-mail corrigido do envio." },
        { status: 400 }
      );
    }

    const relatorio = await corrigirEnvioRelatorioNoServidor(campanhaId, email, {
      auditContext: {
        usuarioId: auth.user.id,
        usuarioNome: body.usuarioNome?.trim() || auth.usuarioNome,
        usuarioEmail: body.usuarioEmail?.trim() || auth.usuarioEmail,
      },
    });

    return NextResponse.json({ ok: true, relatorio });
  } catch (err) {
    console.error("[relatorio/envio PATCH]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Não foi possível corrigir o registro de envio.",
      },
      { status: 400 }
    );
  }
}
