import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  mapRiscosCampanhaRow,
  RISCOS_CAMPANHA_SELECT,
  RISCOS_CAMPANHA_SELECT_LEGACY,
  resolverTextoMotivoRemocao,
  validateCancelarProcessoRiscos,
  validateConfirmacaoExclusaoCampanha,
  validateMotivoCancelamento,
  validateMotivoRemocaoProcesso,
  validateRemoverProcessoRiscos,
  type RiscosCampanhaRecord,
} from "@/lib/riscos-campanha";
import { MOTIVO_INVALIDACAO_CANCELAMENTO_PROCESSO } from "@/lib/riscos-invalidacao";
import { RISCOS_LISTA_PRESENCA_BUCKET } from "@/lib/riscos-lista-presenca";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/services/auditoria.service";

const CAMPANHA_SELECT = RISCOS_CAMPANHA_SELECT;
const CAMPANHA_SELECT_LEGACY = RISCOS_CAMPANHA_SELECT_LEGACY;

function mapCampanhaRow(row: Record<string, unknown>): RiscosCampanhaRecord {
  return mapRiscosCampanhaRow(row);
}

function isMissingColumnError(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  return (
    /origem|responsavel|observacoes|cancelada_|logo_/i.test(
      error.message ?? ""
    ) || error.code === "42703"
  );
}

async function selecionarCampanhaPorId(
  campanhaId: string
): Promise<RiscosCampanhaRecord | null> {
  const admin = createAdminClient();
  const primary = await admin
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("id", campanhaId)
    .maybeSingle();

  if (isMissingColumnError(primary.error)) {
    const fb = await admin
      .from("riscos_campanhas")
      .select(CAMPANHA_SELECT_LEGACY)
      .eq("id", campanhaId)
      .maybeSingle();
    if (fb.error) throw fb.error;
    if (!fb.data) return null;
    return mapCampanhaRow(fb.data as Record<string, unknown>);
  }

  if (primary.error) throw primary.error;
  if (!primary.data) return null;
  return mapCampanhaRow(primary.data as Record<string, unknown>);
}

/** Ambiente controlado: não produção OU flag explícita. */
export function exclusaoDefinitivaCampanhaPermitida(): boolean {
  if (process.env.RISCOS_PERMITIR_EXCLUSAO_DEFINITIVA === "true") return true;
  return process.env.NODE_ENV !== "production";
}

async function invalidarSessoesDaCampanha(
  campanhaId: string,
  usuarioNome: string
): Promise<number> {
  const admin = createAdminClient();
  const agora = new Date().toISOString();
  const { data, error } = await admin
    .from("riscos_avaliacao_sessoes")
    .update({
      valida: false,
      invalidada_em: agora,
      invalidada_por: usuarioNome,
      motivo_invalidacao: MOTIVO_INVALIDACAO_CANCELAMENTO_PROCESSO,
    })
    .eq("campanha_id", campanhaId)
    .select("id");

  if (error) {
    if (/valida|invalidada/i.test(error.message ?? "") || error.code === "42703") {
      console.warn(
        "[cancelarProcesso] colunas de validade ausentes; sessões não invalidadas via update.",
        error.message
      );
      return 0;
    }
    throw error;
  }
  return (data ?? []).length;
}

export async function cancelarProcessoRiscosNoServidor(
  campanhaId: string,
  motivo: string,
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosCampanhaRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const motivoErr = validateMotivoCancelamento(motivo);
  if (motivoErr) throw new Error(motivoErr);
  const motivoTrim = motivo.trim();

  const before = await selecionarCampanhaPorId(id);
  if (!before) throw new Error("Campanha não encontrada.");

  const validacao = validateCancelarProcessoRiscos(before);
  if (validacao) throw new Error(validacao);

  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  const agora = new Date().toISOString();

  const sessoesInvalidas = await invalidarSessoesDaCampanha(id, nome);

  const admin = createAdminClient();
  const updatePrimary = await admin
    .from("riscos_campanhas")
    .update({
      status: "cancelada",
      cancelada_em: agora,
      cancelada_por: nome,
      motivo_cancelamento: motivoTrim,
    })
    .eq("id", id)
    .neq("status", "cancelada")
    .select(CAMPANHA_SELECT)
    .maybeSingle();

  let updateError = updatePrimary.error;

  if (isMissingColumnError(updateError)) {
    throw new Error(
      "Migration de cancelamento não aplicada (colunas cancelada_* / status cancelada). Aplique a migration 102."
    );
  }

  if (updateError) throw updateError;

  const confirmed = await selecionarCampanhaPorId(id);
  if (!confirmed || confirmed.status !== "cancelada") {
    throw new Error(
      `O cancelamento não foi confirmado no banco (status atual: ${confirmed?.status ?? "desconhecido"}).`
    );
  }

  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_processo_cancelado,
    registroId: confirmed.id,
    registroNome: confirmed.empresa_nome,
    descricao: `${nome} cancelou o processo da campanha ${confirmed.codigo_publico}. Motivo: ${motivoTrim}`,
    dadosAntes: {
      status: before.status,
      codigo_publico: before.codigo_publico,
    },
    dadosDepois: {
      status: confirmed.status,
      codigo_publico: confirmed.codigo_publico,
      cancelada_em: confirmed.cancelada_em ?? agora,
      cancelada_por: confirmed.cancelada_por ?? nome,
      motivo_cancelamento: confirmed.motivo_cancelamento ?? motivoTrim,
      sessoes_invalidadas: sessoesInvalidas,
    },
  });

  return confirmed;
}

async function contarDadosCampanha(campanhaId: string): Promise<{
  participantes: number;
  sessoes: number;
  respostas: number;
}> {
  const admin = createAdminClient();
  const [part, sess, resp] = await Promise.all([
    admin
      .from("riscos_campanha_participantes")
      .select("id", { count: "exact", head: true })
      .eq("campanha_id", campanhaId),
    admin
      .from("riscos_avaliacao_sessoes")
      .select("id", { count: "exact", head: true })
      .eq("campanha_id", campanhaId),
    admin
      .from("riscos_avaliacao_respostas")
      .select("id", { count: "exact", head: true })
      .eq("campanha_id", campanhaId),
  ]);
  if (part.error) throw part.error;
  if (sess.error) throw sess.error;
  if (resp.error) throw resp.error;
  return {
    participantes: part.count ?? 0,
    sessoes: sess.count ?? 0,
    respostas: resp.count ?? 0,
  };
}

/**
 * Apaga a árvore da campanha. CASCADE no banco remove:
 * participantes, sessões, vínculos, respostas, fluxo.
 * Portal auditoria (096) fica com campanha_id/participante_id NULL.
 */
async function apagarArvoreCampanha(
  campanha: RiscosCampanhaRecord
): Promise<void> {
  const admin = createAdminClient();

  // Storage: só limpa anexo do fluxo da campanha (manual).
  // Anexos ligados ao orçamento permanecem no tracking de Implantação.
  const paths: string[] = [];
  const { data: fluxo } = await admin
    .from("riscos_campanha_fluxo")
    .select("lista_anexo_path")
    .eq("campanha_id", campanha.id)
    .maybeSingle();
  if (fluxo?.lista_anexo_path) paths.push(String(fluxo.lista_anexo_path));

  if (paths.length > 0) {
    const { error: storageErr } = await admin.storage
      .from(RISCOS_LISTA_PRESENCA_BUCKET)
      .remove(paths);
    if (storageErr) {
      console.warn("[apagarArvoreCampanha] storage:", storageErr.message);
    }
  }

  const { error: delErr } = await admin
    .from("riscos_campanhas")
    .delete()
    .eq("id", campanha.id);
  if (delErr) throw delErr;

  const still = await selecionarCampanhaPorId(campanha.id);
  if (still) {
    throw new Error("A exclusão não foi confirmada no banco.");
  }
}

export async function excluirCampanhaRiscosNoServidor(
  campanhaId: string,
  confirmacaoCodigo: string,
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<{ codigo_publico: string; empresa_nome: string }> {
  if (!exclusaoDefinitivaCampanhaPermitida()) {
    throw new Error(
      "Exclusão definitiva não está habilitada neste ambiente. Use Remover processo (admin) ou Cancelar processo."
    );
  }

  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const before = await selecionarCampanhaPorId(id);
  if (!before) throw new Error("Campanha não encontrada.");

  const confErr = validateConfirmacaoExclusaoCampanha(
    before.codigo_publico,
    confirmacaoCodigo
  );
  if (confErr) throw new Error(confErr);

  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  const contagens = await contarDadosCampanha(id);

  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_excluida,
    registroId: before.id,
    registroNome: before.empresa_nome,
    descricao: `${nome} excluiu definitivamente a campanha ${before.codigo_publico}.`,
    dadosAntes: {
      id: before.id,
      codigo_publico: before.codigo_publico,
      status: before.status,
      origem: before.origem,
      cliente_id: before.cliente_id,
      cnpj: before.cnpj,
      ...contagens,
    },
    dadosDepois: { excluida: true },
  });

  await apagarArvoreCampanha(before);

  return {
    codigo_publico: before.codigo_publico,
    empresa_nome: before.empresa_nome,
  };
}

/**
 * Remoção definitiva do processo (produção, somente admin via API).
 * Sem gate de ambiente — permissão administrativa é obrigatória na rota.
 */
export async function removerProcessoRiscosNoServidor(
  campanhaId: string,
  input: {
    confirmacaoCodigo: string;
    motivoOpcao: string;
    motivoOutro?: string;
  },
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<{ codigo_publico: string; empresa_nome: string; cliente_id: string | null }> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const before = await selecionarCampanhaPorId(id);
  if (!before) throw new Error("Campanha não encontrada.");

  const regra = validateRemoverProcessoRiscos(before);
  if (regra) throw new Error(regra);

  const confErr = validateConfirmacaoExclusaoCampanha(
    before.codigo_publico,
    input.confirmacaoCodigo
  );
  if (confErr) throw new Error(confErr);

  const motivoErr = validateMotivoRemocaoProcesso(
    input.motivoOpcao,
    input.motivoOutro
  );
  if (motivoErr) throw new Error(motivoErr);
  const motivoTexto = resolverTextoMotivoRemocao(
    input.motivoOpcao,
    input.motivoOutro
  );

  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  const agora = new Date().toISOString();
  const contagens = await contarDadosCampanha(id);

  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_processo_removido,
    registroId: before.id,
    registroNome: before.empresa_nome,
    descricao: `${nome} removeu definitivamente o processo ${before.codigo_publico}. Motivo: ${motivoTexto}`,
    dadosAntes: {
      campanha_id: before.id,
      codigo_publico: before.codigo_publico,
      empresa: before.empresa_nome,
      cnpj: before.cnpj,
      status: before.status,
      origem: before.origem,
      cliente_id: before.cliente_id,
      removido_em: agora,
      removido_por: nome,
      motivo: motivoTexto,
      motivo_opcao: input.motivoOpcao.trim(),
      quantidade_participantes: contagens.participantes,
      quantidade_sessoes: contagens.sessoes,
      quantidade_respostas: contagens.respostas,
    },
    dadosDepois: { removido: true },
  });

  await apagarArvoreCampanha(before);

  return {
    codigo_publico: before.codigo_publico,
    empresa_nome: before.empresa_nome,
    cliente_id: before.cliente_id,
  };
}
