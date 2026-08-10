import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  MOTIVO_INVALIDACAO_PADRAO,
  podeInvalidarParticipacao,
} from "@/lib/riscos-invalidacao";
import { createAdminClient } from "@/lib/supabase/admin";

type AuditOptions = { auditContext?: AuditoriaUsuarioContext };

/**
 * Invalida participação concluída: sessão/respostas permanecem; sai dos resultados.
 * Usa service role (tabelas de avaliação sem policy para authenticated).
 * Não retorna nem registra conteúdo de respostas.
 */
export async function invalidarParticipacaoCampanha(
  params: {
    participanteId: string;
    motivo?: string;
  },
  auditOptions?: AuditOptions
): Promise<{
  participanteId: string;
  campanhaId: string;
  sessaoId: string;
}> {
  const participanteId = params.participanteId.trim();
  if (!participanteId) throw new Error("Participante inválido.");

  const motivo = params.motivo?.trim() || MOTIVO_INVALIDACAO_PADRAO;
  const supabase = createAdminClient();

  const { data: participante, error: partErr } = await supabase
    .from("riscos_campanha_participantes")
    .select("id, campanha_id, nome_completo, status, cpf")
    .eq("id", participanteId)
    .maybeSingle();
  if (partErr) throw partErr;
  if (!participante) throw new Error("Participante não encontrado.");

  if (!podeInvalidarParticipacao(String(participante.status))) {
    if (participante.status === "invalidado") {
      throw new Error("Esta participação já está invalidada.");
    }
    throw new Error(
      "Somente participantes que concluíram a pesquisa podem ser invalidados."
    );
  }

  const { data: vinculo, error: vinculoErr } = await supabase
    .from("riscos_avaliacao_vinculos")
    .select("id, sessao_id, campanha_id")
    .eq("participante_id", participanteId)
    .eq("campanha_id", participante.campanha_id)
    .maybeSingle();
  if (vinculoErr) throw vinculoErr;
  if (!vinculo?.sessao_id) {
    throw new Error(
      "Não foi encontrado vínculo técnico da sessão concluída para invalidar."
    );
  }

  const { data: sessao, error: sessaoErr } = await supabase
    .from("riscos_avaliacao_sessoes")
    .select("id, campanha_id, status, valida")
    .eq("id", vinculo.sessao_id)
    .eq("campanha_id", participante.campanha_id)
    .maybeSingle();
  if (sessaoErr) throw sessaoErr;
  if (!sessao) throw new Error("Sessão da participação não encontrada.");
  if (sessao.status !== "concluida") {
    throw new Error("A sessão ainda não está concluída.");
  }
  if (sessao.valida === false) {
    throw new Error("Esta participação já está invalidada.");
  }

  const nowIso = new Date().toISOString();
  const usuarioId = auditOptions?.auditContext?.usuarioId ?? null;
  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  const email = auditOptions?.auditContext?.usuarioEmail ?? "";

  const { data: sessaoUpd, error: updSessaoErr } = await supabase
    .from("riscos_avaliacao_sessoes")
    .update({
      valida: false,
      invalidada_em: nowIso,
      invalidada_por: usuarioId ?? nome,
      motivo_invalidacao: motivo,
    })
    .eq("id", sessao.id)
    .eq("campanha_id", participante.campanha_id)
    .eq("status", "concluida")
    .eq("valida", true)
    .select("id")
    .maybeSingle();
  if (updSessaoErr) throw updSessaoErr;
  if (!sessaoUpd) {
    throw new Error("Não foi possível invalidar a sessão (já alterada).");
  }

  const { data: partUpd, error: updPartErr } = await supabase
    .from("riscos_campanha_participantes")
    .update({ status: "invalidado" })
    .eq("id", participanteId)
    .eq("campanha_id", participante.campanha_id)
    .eq("status", "respondido")
    .select("id")
    .maybeSingle();
  if (updPartErr) {
    await supabase
      .from("riscos_avaliacao_sessoes")
      .update({
        valida: true,
        invalidada_em: null,
        invalidada_por: null,
        motivo_invalidacao: null,
      })
      .eq("id", sessao.id);
    throw updPartErr;
  }
  if (!partUpd) {
    await supabase
      .from("riscos_avaliacao_sessoes")
      .update({
        valida: true,
        invalidada_em: null,
        invalidada_por: null,
        motivo_invalidacao: null,
      })
      .eq("id", sessao.id);
    throw new Error("Não foi possível atualizar o status do participante.");
  }

  const { error: auditErr } = await supabase.from("auditoria_sistema").insert({
    usuario_id: usuarioId,
    usuario_nome: nome,
    usuario_email: email,
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_participacao_invalidada,
    registro_id: String(participante.id),
    registro_nome: String(participante.nome_completo),
    descricao: `${nome} invalidou a participação de ${participante.nome_completo} na campanha.`,
    dados_antes: {
      campanha_id: participante.campanha_id,
      participante_id: participante.id,
      status: participante.status,
      sessao_id: sessao.id,
    },
    dados_depois: {
      campanha_id: participante.campanha_id,
      participante_id: participante.id,
      status: "invalidado",
      sessao_id: sessao.id,
      invalidada_em: nowIso,
      motivo_invalidacao: motivo,
    },
  });
  if (auditErr) {
    console.error("[invalidarParticipacao] auditoria:", auditErr);
  }

  return {
    participanteId: String(participante.id),
    campanhaId: String(participante.campanha_id),
    sessaoId: String(sessao.id),
  };
}
