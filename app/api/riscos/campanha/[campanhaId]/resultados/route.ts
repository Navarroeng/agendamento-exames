import { NextResponse } from "next/server";
import { requireRiscosStaffApi } from "@/lib/riscos-api-auth.server";
import { obterResultadosCampanhaRiscos } from "@/services/riscos-resultados.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resultados consolidados da campanha (anônimos).
 * Autenticado no painel; dados via service role (sem PII / sem respostas nominais).
 * Sempre recalcula via motor atual (não lê snapshot de relatório).
 *
 * RESTRIÇÃO DE PERFIL:
 * - Admin: recebe resultados técnicos completos (dimensões, categorias, comportamentos ofensivos, resumo geral).
 * - Operacional: recebe apenas métricas operacionais (participação, respondidos, pendentes, status).
 *   Conteúdo técnico é completamente omitido na raiz da resposta para prevenir acesso via DevTools ou API.
 */
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

    const resultados = await obterResultadosCampanhaRiscos(campanhaId);

    // Perfil operacional: bloqueia completamente o conteúdo técnico
    if (!auth.isAdmin) {
      return NextResponse.json({
        ok: true,
        previstos: resultados.previstos,
        sessoesConcluidas: resultados.sessoesConcluidas,
        pendentes: resultados.pendentes,
        participacaoPercentual: resultados.participacaoPercentual,
        statusCampanha: resultados.statusCampanha,
        dimensoes: [],
        comportamentosOfensivos: null,
        riscoGeral: null,
        riscoGeralMensagem: null,
        resumoGeral: null,
        categorias: [],
        indicadoresComplementares: null,
      });
    }

    // Perfil administrador: payload completo
    const { engine: _engine, ...publico } = resultados;

    return NextResponse.json({
      ok: true,
      ...publico,
      dimensoes: resultados.dimensoes,
      comportamentosOfensivos: resultados.comportamentosOfensivos,
      riscoGeral: null,
      riscoGeralMensagem: resultados.riscoGeralMensagem,
    });
  } catch (err) {
    console.error("[riscos/campanha/resultados]", err);
    const message =
      err instanceof Error ? err.message : "Não foi possível carregar resultados.";
    const status = message.includes("não encontrada") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
