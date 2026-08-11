import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  MOTIVO_REMOCAO_APOS_CONCLUSAO,
  MOTIVO_REMOCAO_PADRAO,
  participanteEstaRemovido,
} from "@/lib/riscos-remocao-participante";
import { createAdminClient } from "@/lib/supabase/admin";

type AuditOptions = { auditContext?: AuditoriaUsuarioContext };

/**
 * Soft-delete do participante na campanha.
 * - Sai da lista ativa
 * - Bloqueia acesso no portal
 * - Sessão concluída marcada valida=false (respostas preservadas)
 * - Não expõe respostas
 */
export async function removerParticipanteCampanhaSoft(
  params: {
    participanteId: string;
    motivo?: string;
  },
  auditOptions?: AuditOptions
): Promise<{
  participanteId: string;
  campanhaId: string;
  tinhaSessaoConcluida: boolean;
}> {
  const participanteId = params.participanteId.trim();
  if (!participanteId) throw new Error("Participante inválido.");

  const supabase = createAdminClient();
  const { data: participante, error: partErr } = await supabase
    .from("riscos_campanha_participantes")
    .select(
      "id, campanha_id, nome_completo, status, cpf, concluiu_em, removido_em"
    )
    .eq("id", participanteId)
    .maybeSingle();
  if (partErr) throw partErr;
  if (!participante) throw new Error("Participante não encontrado.");

  if (
    participanteEstaRemovido({
      status: String(participante.status),
      removido_em: participante.removido_em
        ? String(participante.removido_em)
        : null,
    })
  ) {
    throw new Error("Este participante já foi removido.");
  }

  const statusAntes = String(participante.status);
  const jaConcluiu =
    statusAntes === "respondido" || Boolean(participante.concluiu_em);
  const motivo =
    params.motivo?.trim() ||
    (jaConcluiu ? MOTIVO_REMOCAO_APOS_CONCLUSAO : MOTIVO_REMOCAO_PADRAO);

  const nowIso = new Date().toISOString();
  const usuarioId = auditOptions?.auditContext?.usuarioId ?? null;
  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  const email = auditOptions?.auditContext?.usuarioEmail ?? "";

  let sessaoId: string | null = null;
  const { data: vinculo } = await supabase
    .from("riscos_avaliacao_vinculos")
    .select("sessao_id")
    .eq("participante_id", participanteId)
    .eq("campanha_id", participante.campanha_id)
    .maybeSingle();

  if (vinculo?.sessao_id) {
    sessaoId = String(vinculo.sessao_id);
    await supabase
      .from("riscos_avaliacao_sessoes")
      .update({
        valida: false,
        invalidada_em: nowIso,
        invalidada_por: usuarioId ?? nome,
        motivo_invalidacao: motivo,
      })
      .eq("id", sessaoId)
      .eq("campanha_id", participante.campanha_id);
  }

  const { data: partUpd, error: updErr } = await supabase
    .from("riscos_campanha_participantes")
    .update({
      status: "removido",
      removido_em: nowIso,
      removido_por: usuarioId ?? nome,
      motivo_remocao: motivo,
    })
    .eq("id", participanteId)
    .eq("campanha_id", participante.campanha_id)
    .is("removido_em", null)
    .select("id")
    .maybeSingle();

  if (updErr) throw updErr;
  if (!partUpd) {
    throw new Error("Não foi possível remover o participante.");
  }

  const { error: auditErr } = await supabase.from("auditoria_sistema").insert({
    usuario_id: usuarioId,
    usuario_nome: nome,
    usuario_email: email,
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_participante_removido,
    registro_id: String(participante.id),
    registro_nome: String(participante.nome_completo),
    descricao: `${nome} removeu o participante ${participante.nome_completo} da campanha.`,
    dados_antes: {
      campanha_id: participante.campanha_id,
      participante_id: participante.id,
      status: statusAntes,
      sessao_id: sessaoId,
    },
    dados_depois: {
      campanha_id: participante.campanha_id,
      participante_id: participante.id,
      status: "removido",
      removido_em: nowIso,
      motivo_remocao: motivo,
      sessao_id: sessaoId,
      sessao_valida: false,
    },
  });
  if (auditErr) {
    console.error("[removerParticipanteCampanhaSoft] auditoria:", auditErr);
  }

  return {
    participanteId: String(participante.id),
    campanhaId: String(participante.campanha_id),
    tinhaSessaoConcluida: jaConcluiu,
  };
}
