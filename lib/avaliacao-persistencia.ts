import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAlternativasDaPergunta,
  getPerguntasOrdenadas,
} from "@/lib/copsoq";
import { pontuarAlternativa } from "@/lib/copsoq/scoring";
import type { CopsoqPergunta } from "@/lib/copsoq/types";
import {
  avaliarPeriodoCampanha,
  participanteJaConcluiu,
} from "@/lib/avaliacao-validacao";

export type AvaliacaoSessaoRow = {
  id: string;
  campanha_id: string;
  identificador_anonimo: string;
  status: "em_andamento" | "concluida";
  iniciado_em: string;
  concluido_em: string | null;
};

export type AvaliacaoRespostaSalva = {
  perguntaId: string;
  alternativaId: string;
  fontes: string[];
};

function gerarIdentificadorAnonimo(): string {
  return `a_${randomBytes(24).toString("hex")}`;
}

export function getPerguntaInstrumento(
  perguntaId: string
): CopsoqPergunta | undefined {
  return getPerguntasOrdenadas().find((p) => p.id === perguntaId);
}

/** Valida alternativa (+ fontes opcionais) contra o instrumento oficial. */
export function validarPayloadResposta(input: {
  perguntaId: string;
  alternativaId: string;
  fontes?: string[] | null;
}):
  | {
      ok: true;
      pergunta: CopsoqPergunta;
      alternativaId: string;
      valor: number;
      fontes: string[] | null;
    }
  | { ok: false; motivo: string } {
  const pergunta = getPerguntaInstrumento(input.perguntaId);
  if (!pergunta) {
    return { ok: false, motivo: "pergunta_invalida" };
  }

  const alts = getAlternativasDaPergunta(pergunta);
  const alt = alts.find((a) => a.id === input.alternativaId);
  if (!alt) {
    return { ok: false, motivo: "alternativa_invalida" };
  }

  let fontes: string[] | null = null;
  const rawFontes = Array.isArray(input.fontes) ? input.fontes : [];
  if (pergunta.followUp && rawFontes.length > 0) {
    if (alt.label === pergunta.followUp.exibirQuandoRespostaDiferenteDe) {
      return { ok: false, motivo: "fontes_nao_aplicaveis" };
    }
    const fontesValidas = new Set(
      getAlternativasDaPergunta({
        ...pergunta,
        tipoEscala: pergunta.followUp.tipoEscala,
      }).map((f) => f.id)
    );
    for (const f of rawFontes) {
      if (!fontesValidas.has(f)) {
        return { ok: false, motivo: "fonte_invalida" };
      }
    }
    fontes = Array.from(new Set(rawFontes));
  }

  return {
    ok: true,
    pergunta,
    alternativaId: alt.id,
    valor: pontuarAlternativa(pergunta, alt),
    fontes,
  };
}

export async function carregarContextoPortal(
  supabase: SupabaseClient,
  input: { campanhaId: string; participanteId: string; codigoPublico: string }
): Promise<
  | {
      ok: true;
      campanha: {
        id: string;
        status: string;
        data_inicio: string;
        data_encerramento: string;
        codigo_publico: string;
      };
      participante: {
        id: string;
        status: string;
        concluiu_em: string | null;
      };
    }
  | { ok: false; codigo: "nao_apto" | "campanha_encerrada" | "ja_respondida" }
> {
  const { data: campanha } = await supabase
    .from("riscos_campanhas")
    .select("id, status, data_inicio, data_encerramento, codigo_publico")
    .eq("id", input.campanhaId)
    .maybeSingle();

  const { data: participante } = await supabase
    .from("riscos_campanha_participantes")
    .select("id, status, concluiu_em")
    .eq("id", input.participanteId)
    .eq("campanha_id", input.campanhaId)
    .maybeSingle();

  if (!campanha || !participante) {
    return { ok: false, codigo: "nao_apto" };
  }

  if (
    String(campanha.codigo_publico ?? "").trim().toUpperCase() !==
    input.codigoPublico.trim().toUpperCase()
  ) {
    return { ok: false, codigo: "nao_apto" };
  }

  const periodo = avaliarPeriodoCampanha({
    status: String(campanha.status ?? ""),
    data_inicio: String(campanha.data_inicio ?? ""),
    data_encerramento: String(campanha.data_encerramento ?? ""),
  });
  if (periodo === "encerrada") {
    return { ok: false, codigo: "campanha_encerrada" };
  }
  if (periodo !== "ok") {
    return { ok: false, codigo: "nao_apto" };
  }

  if (
    participanteJaConcluiu({
      status: String(participante.status ?? ""),
      concluiu_em: participante.concluiu_em
        ? String(participante.concluiu_em)
        : null,
    })
  ) {
    return { ok: false, codigo: "ja_respondida" };
  }

  return {
    ok: true,
    campanha: {
      id: String(campanha.id),
      status: String(campanha.status ?? ""),
      data_inicio: String(campanha.data_inicio ?? ""),
      data_encerramento: String(campanha.data_encerramento ?? ""),
      codigo_publico: String(campanha.codigo_publico ?? ""),
    },
    participante: {
      id: String(participante.id),
      status: String(participante.status ?? ""),
      concluiu_em: participante.concluiu_em
        ? String(participante.concluiu_em)
        : null,
    },
  };
}

/**
 * Garante uma única sessão em andamento por participante/campanha.
 * Cria sessão anônima + vínculo segregado se ainda não existir.
 */
export async function obterOuCriarSessaoRespostas(
  supabase: SupabaseClient,
  input: { campanhaId: string; participanteId: string }
): Promise<AvaliacaoSessaoRow> {
  const { data: vinculo } = await supabase
    .from("riscos_avaliacao_vinculos")
    .select("sessao_id")
    .eq("campanha_id", input.campanhaId)
    .eq("participante_id", input.participanteId)
    .maybeSingle();

  if (vinculo?.sessao_id) {
    const { data: sessao, error } = await supabase
      .from("riscos_avaliacao_sessoes")
      .select(
        "id, campanha_id, identificador_anonimo, status, iniciado_em, concluido_em"
      )
      .eq("id", vinculo.sessao_id)
      .eq("campanha_id", input.campanhaId)
      .maybeSingle();
    if (error) throw error;
    if (!sessao) {
      throw new Error("Vínculo sem sessão correspondente.");
    }
    return {
      id: String(sessao.id),
      campanha_id: String(sessao.campanha_id),
      identificador_anonimo: String(sessao.identificador_anonimo),
      status: sessao.status === "concluida" ? "concluida" : "em_andamento",
      iniciado_em: String(sessao.iniciado_em),
      concluido_em: sessao.concluido_em ? String(sessao.concluido_em) : null,
    };
  }

  const anon = gerarIdentificadorAnonimo();
  const { data: criada, error: createErr } = await supabase
    .from("riscos_avaliacao_sessoes")
    .insert({
      campanha_id: input.campanhaId,
      identificador_anonimo: anon,
      status: "em_andamento",
    })
    .select(
      "id, campanha_id, identificador_anonimo, status, iniciado_em, concluido_em"
    )
    .single();
  if (createErr) throw createErr;

  const { error: vinculoErr } = await supabase
    .from("riscos_avaliacao_vinculos")
    .insert({
      campanha_id: input.campanhaId,
      participante_id: input.participanteId,
      sessao_id: criada.id,
    });

  if (vinculoErr) {
    // Corrida: outro request criou o vínculo — reutiliza.
    const { data: existente } = await supabase
      .from("riscos_avaliacao_vinculos")
      .select("sessao_id")
      .eq("campanha_id", input.campanhaId)
      .eq("participante_id", input.participanteId)
      .maybeSingle();
    if (!existente?.sessao_id) throw vinculoErr;

    await supabase.from("riscos_avaliacao_sessoes").delete().eq("id", criada.id);

    const { data: sessao } = await supabase
      .from("riscos_avaliacao_sessoes")
      .select(
        "id, campanha_id, identificador_anonimo, status, iniciado_em, concluido_em"
      )
      .eq("id", existente.sessao_id)
      .eq("campanha_id", input.campanhaId)
      .single();

    return {
      id: String(sessao!.id),
      campanha_id: String(sessao!.campanha_id),
      identificador_anonimo: String(sessao!.identificador_anonimo),
      status: sessao!.status === "concluida" ? "concluida" : "em_andamento",
      iniciado_em: String(sessao!.iniciado_em),
      concluido_em: sessao!.concluido_em ? String(sessao!.concluido_em) : null,
    };
  }

  return {
    id: String(criada.id),
    campanha_id: String(criada.campanha_id),
    identificador_anonimo: String(criada.identificador_anonimo),
    status: "em_andamento",
    iniciado_em: String(criada.iniciado_em),
    concluido_em: null,
  };
}

export async function listarRespostasDaSessao(
  supabase: SupabaseClient,
  input: { sessaoId: string; campanhaId: string }
): Promise<AvaliacaoRespostaSalva[]> {
  const { data, error } = await supabase
    .from("riscos_avaliacao_respostas")
    .select("pergunta_id, alternativa_id, fontes")
    .eq("sessao_id", input.sessaoId)
    .eq("campanha_id", input.campanhaId);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    perguntaId: String(row.pergunta_id),
    alternativaId: String(row.alternativa_id),
    fontes: Array.isArray(row.fontes)
      ? row.fontes.map((f: unknown) => String(f))
      : [],
  }));
}

export async function upsertRespostaSessao(
  supabase: SupabaseClient,
  input: {
    sessaoId: string;
    campanhaId: string;
    perguntaId: string;
    alternativaId: string;
    valor: number;
    fontes: string[] | null;
  }
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("riscos_avaliacao_respostas").upsert(
    {
      sessao_id: input.sessaoId,
      campanha_id: input.campanhaId,
      pergunta_id: input.perguntaId,
      alternativa_id: input.alternativaId,
      valor: input.valor,
      fontes: input.fontes,
      updated_at: nowIso,
    },
    { onConflict: "sessao_id,pergunta_id" }
  );
  if (error) throw error;
}

export function perguntasObrigatoriasPendentes(
  respostas: AvaliacaoRespostaSalva[]
): string[] {
  const respondidas = new Set(respostas.map((r) => r.perguntaId));
  return getPerguntasOrdenadas()
    .filter((p) => p.obrigatoria && !respondidas.has(p.id))
    .map((p) => p.id);
}

/** Índice do fluxo (incluindo transições) para a próxima pergunta sem resposta. */
export function calcularFlowIndexRetomada(
  flowItems: Array<{ type: string; pergunta?: { id: string } }>,
  respostas: AvaliacaoRespostaSalva[]
): number {
  const respondidas = new Set(respostas.map((r) => r.perguntaId));
  for (let i = 0; i < flowItems.length; i += 1) {
    const item = flowItems[i]!;
    if (item.type === "pergunta" && item.pergunta) {
      if (!respondidas.has(item.pergunta.id)) return i;
    }
  }
  // Todas respondidas → última pergunta (para finalizar)
  for (let i = flowItems.length - 1; i >= 0; i -= 1) {
    if (flowItems[i]!.type === "pergunta") return i;
  }
  return 0;
}

export function mapRespostasParaEstadoLocal(
  respostas: AvaliacaoRespostaSalva[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of respostas) {
    out[r.perguntaId] = r.alternativaId;
    if (r.fontes.length > 0) {
      const pergunta = getPerguntaInstrumento(r.perguntaId);
      if (pergunta?.followUp) {
        out[pergunta.followUp.id] = r.fontes.join("|");
      }
    }
  }
  return out;
}
