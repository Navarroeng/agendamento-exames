import { NextResponse } from "next/server";
import { auditoriaActorFromAuth } from "@/lib/auditoria";
import { requireRiscosStaffApi } from "@/lib/riscos-api-auth.server";
import {
  buscarRelatorioPorCampanhaId,
  gerarRelatorioFinalNoServidor,
} from "@/services/riscos-relatorio.server";
import { sanitizarRelatorioParaOperacional } from "@/lib/riscos-relatorio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { campanhaId: string } }
) {
  try {
    const auth = await requireRiscosStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    const relatorio = await buscarRelatorioPorCampanhaId(campanhaId);
    const relatorioRetorno = auth.isAdmin
      ? relatorio
      : sanitizarRelatorioParaOperacional(relatorio);

    return NextResponse.json({
      ok: true,
      relatorio: relatorioRetorno,
      existe: Boolean(relatorio),
    });
  } catch (err) {
    console.error("[riscos/relatorio GET]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível carregar o relatório.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: { campanhaId: string } }
) {
  try {
    const auth = await requireRiscosStaffApi();
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Somente administradores podem gerar o relatório." },
        { status: 403 }
      );
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    // Body opcional pode existir para compatibilidade; identidade da auditoria
    // vem exclusivamente da sessão/perfil autenticados.
    try {
      await request.json();
    } catch {
      // corpo opcional
    }

    const relatorio = await gerarRelatorioFinalNoServidor(campanhaId, {
      auditContext: auditoriaActorFromAuth(auth),
    });

    return NextResponse.json({ ok: true, relatorio });
  } catch (err) {
    console.error("[riscos/relatorio POST]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível gerar o relatório.";
    const status =
      message.includes("Ainda existem") ||
      message.includes("Já existe") ||
      message.includes("Cadastre") ||
      message.includes("cancelada") ||
      message.includes("cancelado") ||
      message.includes("não encontrada")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
