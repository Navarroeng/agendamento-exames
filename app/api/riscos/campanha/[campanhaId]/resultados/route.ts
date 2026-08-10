import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obterResultadosCampanhaRiscos } from "@/services/riscos-resultados.service";

export const runtime = "nodejs";

/**
 * Resultados consolidados da campanha (anônimos).
 * Autenticado no painel; dados via service role (sem PII / sem respostas nominais).
 */
export async function GET(
  _request: Request,
  context: { params: { campanhaId: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    const resultados = await obterResultadosCampanhaRiscos(campanhaId);

    // Nunca devolver o objeto engine bruto com estruturas internas extras se
    // contiver algo sensível — o payload público já é suficiente.
    const { engine: _engine, ...publico } = resultados;

    return NextResponse.json({
      ok: true,
      ...publico,
      // Engine serializado sem campos que possam identificar indivíduos
      // (já é agregado). Mantido para o frontend espelhar classificação/média.
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
