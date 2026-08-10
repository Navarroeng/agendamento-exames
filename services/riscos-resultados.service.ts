import { createAdminClient } from "@/lib/supabase/admin";
import {
  consolidarResultadosCampanha,
  type RespostaAvaliacaoConsolidacao,
  type RiscosResultadosPublicos,
  type SessaoAvaliacaoConsolidacao,
} from "@/lib/riscos-resultados";

/**
 * Carrega respostas anônimas concluídas da campanha e calcula via motor COPSOQ.
 * Usa service role (RLS bloqueia authenticated nas tabelas de avaliação).
 * Nunca consulta riscos_avaliacao_vinculos nem participantes.
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
    .select("id, status, quantidade_prevista")
    .eq("id", id)
    .maybeSingle();

  if (errCampanha) throw errCampanha;
  if (!campanha) {
    throw new Error("Campanha não encontrada.");
  }

  const { data: sessoesRaw, error: errSessoes } = await supabase
    .from("riscos_avaliacao_sessoes")
    .select("id, campanha_id, status")
    .eq("campanha_id", id)
    .eq("status", "concluida");

  if (errSessoes) throw errSessoes;

  const sessoes = (sessoesRaw ?? []) as SessaoAvaliacaoConsolidacao[];
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
    quantidadePrevista: Number(campanha.quantidade_prevista) || 0,
    sessoes,
    respostas,
  });
}
