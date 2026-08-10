import type { SupabaseClient } from "@supabase/supabase-js";

export const AVALIACAO_PORTAL_EVENTOS = [
  "primeiro_acesso",
  "inicio_pesquisa",
  "conclusao",
  "tentativa_apos_conclusao",
  "tentativa_apos_encerramento",
] as const;

export type AvaliacaoPortalEvento =
  (typeof AVALIACAO_PORTAL_EVENTOS)[number];

/**
 * Registra evento de auditoria do portal.
 * Tabela isolada — não aparece para gestores da empresa.
 */
export async function registrarAuditoriaPortal(
  supabase: SupabaseClient,
  input: {
    evento: AvaliacaoPortalEvento;
    campanhaId?: string | null;
    participanteId?: string | null;
    codigoPublico?: string | null;
    ip?: string | null;
    detalhes?: Record<string, unknown> | null;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("riscos_portal_auditoria").insert({
      evento: input.evento,
      campanha_id: input.campanhaId ?? null,
      participante_id: input.participanteId ?? null,
      codigo_publico: input.codigoPublico
        ? String(input.codigoPublico).trim().toUpperCase()
        : null,
      ip: input.ip ?? null,
      detalhes: input.detalhes ?? null,
    });
    if (error) {
      console.error("[avaliacao-auditoria]", error);
    }
  } catch (err) {
    console.error("[avaliacao-auditoria]", err);
  }
}
