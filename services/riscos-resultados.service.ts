import { createAdminClient } from "@/lib/supabase/admin";
import {
  consolidarResultadosCampanha,
  type RespostaAvaliacaoConsolidacao,
  type RiscosResultadosPublicos,
  type SessaoAvaliacaoConsolidacao,
} from "@/lib/riscos-resultados";
import { sessaoContaNosResultados } from "@/lib/riscos-invalidacao";

/**
 * Carrega respostas anônimas concluídas e válidas da campanha e calcula via motor COPSOQ.
 * Usa service role (RLS bloqueia authenticated nas tabelas de avaliação).
 * Nunca consulta participantes nominais para o payload público.
 *
 * Regras de inclusão:
 * - status = concluida
 * - valida !== false (após migration 098)
 * - possui vínculo técnico (exclui órfãs de remoção antiga)
 */
export async function obterResultadosCampanhaRiscos(
  campanhaId: string
): Promise<RiscosResultadosPublicos> {
  const id = campanhaId.trim();
  if (!id) {
    throw new Error("Campanha inválida.");
  }

  const supabase = createAdminClient();

  const { data: campanha, error: errCampanha } = await supabase
    .from("riscos_campanhas")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (errCampanha) throw errCampanha;
  if (!campanha) {
    throw new Error("Campanha não encontrada.");
  }

  let quantidadeCadastrados = 0;
  {
    const primary = await supabase
      .from("riscos_campanha_participantes")
      .select("id, status, removido_em")
      .eq("campanha_id", id);

    let rows: Array<Record<string, unknown>> | null = null;
    if (primary.error && /removido_em/i.test(primary.error.message ?? "")) {
      const fb = await supabase
        .from("riscos_campanha_participantes")
        .select("id, status")
        .eq("campanha_id", id)
        .neq("status", "removido");
      if (fb.error) throw fb.error;
      rows = (fb.data ?? []) as Array<Record<string, unknown>>;
    } else if (primary.error) {
      throw primary.error;
    } else {
      rows = (primary.data ?? []) as Array<Record<string, unknown>>;
    }

    for (const row of rows ?? []) {
      const status = String(row.status ?? "");
      const removidoEm = row.removido_em as string | null | undefined;
      if (status === "removido" || status === "invalidado" || removidoEm) {
        continue;
      }
      quantidadeCadastrados += 1;
    }
  }

  let sessoesRaw: Array<Record<string, unknown>> | null = null;
  const withValida = await supabase
    .from("riscos_avaliacao_sessoes")
    .select("id, campanha_id, status, valida")
    .eq("campanha_id", id)
    .eq("status", "concluida");

  if (withValida.error) {
    const msg = withValida.error.message ?? "";
    if (/valida/i.test(msg) || withValida.error.code === "42703") {
      const fallback = await supabase
        .from("riscos_avaliacao_sessoes")
        .select("id, campanha_id, status")
        .eq("campanha_id", id)
        .eq("status", "concluida");
      if (fallback.error) throw fallback.error;
      sessoesRaw = (fallback.data ?? []) as Array<Record<string, unknown>>;
    } else {
      throw withValida.error;
    }
  } else {
    sessoesRaw = (withValida.data ?? []) as Array<Record<string, unknown>>;
  }

  const { data: vinculosRaw, error: errVinculos } = await supabase
    .from("riscos_avaliacao_vinculos")
    .select("sessao_id")
    .eq("campanha_id", id);
  if (errVinculos) throw errVinculos;

  const sessoesComVinculo = new Set(
    (vinculosRaw ?? []).map((v) => String((v as { sessao_id: string }).sessao_id))
  );

  const sessoes = (sessoesRaw ?? [])
    .map(
      (s) =>
        ({
          id: String(s.id),
          campanha_id: String(s.campanha_id),
          status: String(s.status),
          valida: s.valida as boolean | null | undefined,
        }) satisfies SessaoAvaliacaoConsolidacao
    )
    .filter(
      (s) => sessaoContaNosResultados(s) && sessoesComVinculo.has(s.id)
    );

  const sessaoIds = sessoes.map((s) => s.id);

  let respostas: RespostaAvaliacaoConsolidacao[] = [];
  if (sessaoIds.length > 0) {
    const { data: respostasRaw, error: errRespostas } = await supabase
      .from("riscos_avaliacao_respostas")
      .select("sessao_id, campanha_id, pergunta_id, alternativa_id")
      .eq("campanha_id", id)
      .in("sessao_id", sessaoIds);

    if (errRespostas) throw errRespostas;
    respostas = (respostasRaw ?? []) as RespostaAvaliacaoConsolidacao[];
  }

  return consolidarResultadosCampanha({
    campanhaId: String(campanha.id),
    statusCampanha: String(campanha.status ?? ""),
    quantidadeCadastrados,
    sessoes,
    respostas,
  });
}
