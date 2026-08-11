import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  isRiscosCampanhaStatus,
  validateCancelarProcessoRiscos,
  validateConfirmacaoExclusaoCampanha,
  validateMotivoCancelamento,
  type RiscosCampanhaRecord,
  type RiscosCampanhaStatus,
} from "@/lib/riscos-campanha";
import { normalizeRiscosCampanhaOrigem } from "@/lib/riscos-campanha-origem";
import { MOTIVO_INVALIDACAO_CANCELAMENTO_PROCESSO } from "@/lib/riscos-invalidacao";
import { RISCOS_LISTA_PRESENCA_BUCKET } from "@/lib/riscos-lista-presenca";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/services/auditoria.service";

const CAMPANHA_SELECT =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, codigo_acesso_exibicao, origem, responsavel, observacoes, criado_por, cancelada_em, cancelada_por, motivo_cancelamento, created_at, updated_at";

const CAMPANHA_SELECT_LEGACY =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, codigo_acesso_exibicao, criado_por, created_at, updated_at";

function mapCampanhaRow(row: Record<string, unknown>): RiscosCampanhaRecord {
  const statusRaw = String(row.status ?? "em_preparacao");
  const status: RiscosCampanhaStatus = isRiscosCampanhaStatus(statusRaw)
    ? statusRaw
    : "em_preparacao";

  return {
    id: String(row.id),
    orcamento_id: row.orcamento_id ? String(row.orcamento_id) : null,
    cliente_id: row.cliente_id ? String(row.cliente_id) : null,
    cnpj: String(row.cnpj ?? ""),
    empresa_nome: String(row.empresa_nome ?? ""),
    data_inicio: String(row.data_inicio ?? "").slice(0, 10),
    data_encerramento: String(row.data_encerramento ?? "").slice(0, 10),
    quantidade_prevista: Number(row.quantidade_prevista) || 0,
    status,
    codigo_publico: String(row.codigo_publico ?? ""),
    codigo_acesso_exibicao: row.codigo_acesso_exibicao
      ? String(row.codigo_acesso_exibicao)
      : null,
    origem: normalizeRiscosCampanhaOrigem(
      row.origem != null ? String(row.origem) : undefined
    ),
    responsavel: row.responsavel ? String(row.responsavel) : null,
    observacoes: row.observacoes ? String(row.observacoes) : null,
    criado_por: row.criado_por ? String(row.criado_por) : null,
    cancelada_em: row.cancelada_em ? String(row.cancelada_em) : null,
    cancelada_por: row.cancelada_por ? String(row.cancelada_por) : null,
    motivo_cancelamento: row.motivo_cancelamento
      ? String(row.motivo_cancelamento)
      : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function isMissingColumnError(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  return (
    /origem|responsavel|observacoes|cancelada_/i.test(error.message ?? "") ||
    error.code === "42703"
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

async function coletarPathsListaPresenca(
  campanha: RiscosCampanhaRecord
): Promise<string[]> {
  const admin = createAdminClient();
  const paths = new Set<string>();

  if (campanha.orcamento_id) {
    const { data: track } = await admin
      .from("orcamento_riscos_psicossociais")
      .select("lista_anexo_path")
      .eq("orcamento_id", campanha.orcamento_id)
      .maybeSingle();
    if (track?.lista_anexo_path) paths.add(String(track.lista_anexo_path));

    const { data: hist } = await admin
      .from("orcamento_riscos_lista_presenca_anexos_hist")
      .select("path")
      .eq("orcamento_id", campanha.orcamento_id);
    for (const row of hist ?? []) {
      if (row.path) paths.add(String(row.path));
    }
  }

  const { data: fluxo } = await admin
    .from("riscos_campanha_fluxo")
    .select("lista_anexo_path")
    .eq("campanha_id", campanha.id)
    .maybeSingle();
  if (fluxo?.lista_anexo_path) paths.add(String(fluxo.lista_anexo_path));

  return Array.from(paths);
}

export async function excluirCampanhaRiscosNoServidor(
  campanhaId: string,
  confirmacaoCodigo: string,
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<{ codigo_publico: string; empresa_nome: string }> {
  if (!exclusaoDefinitivaCampanhaPermitida()) {
    throw new Error(
      "Exclusão definitiva não está habilitada neste ambiente. Use Cancelar processo em produção."
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
  const paths = await coletarPathsListaPresenca(before);

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
    },
    dadosDepois: { excluida: true },
  });

  const admin = createAdminClient();

  if (paths.length > 0) {
    const { error: storageErr } = await admin.storage
      .from(RISCOS_LISTA_PRESENCA_BUCKET)
      .remove(paths);
    if (storageErr) {
      console.warn("[excluirCampanha] falha ao limpar storage:", storageErr.message);
    }
  }

  if (before.orcamento_id) {
    await admin
      .from("orcamento_riscos_lista_presenca_anexos_hist")
      .delete()
      .eq("orcamento_id", before.orcamento_id);
  }

  const { error: delErr } = await admin
    .from("riscos_campanhas")
    .delete()
    .eq("id", id);
  if (delErr) throw delErr;

  const still = await selecionarCampanhaPorId(id);
  if (still) {
    throw new Error("A exclusão não foi confirmada no banco.");
  }

  return {
    codigo_publico: before.codigo_publico,
    empresa_nome: before.empresa_nome,
  };
}
