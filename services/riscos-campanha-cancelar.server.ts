import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { isOrigemManualCliente } from "@/lib/riscos-campanha-origem";
import {
  MSG_PROCESSO_RISCOS_CANCELADO,
  deveCancelarCampanhaVinculada,
  isTrackingRiscosCancelado,
  validateCancelarProcessoListagem,
} from "@/lib/riscos-processo-cancelamento";
import {
  mapRiscosCampanhaRow,
  RISCOS_CAMPANHA_SELECT,
  RISCOS_CAMPANHA_SELECT_LEGACY,
  resolverTextoMotivoRemocao,
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

function isMissingTrackingCancelColumn(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  return (
    /cancelado_em|cancelado_por|motivo_cancelamento/i.test(error.message ?? "") ||
    error.code === "42703"
  );
}

export type RiscosProcessoCanceladoResultado = {
  status: "cancelado";
  cancelado_em: string;
  cancelado_por: string;
  motivo_cancelamento: string;
  campanha: RiscosCampanhaRecord | null;
  orcamento_id: string | null;
};

async function buscarCampanhaAtivaOuCanceladaPorOrcamento(
  orcamentoId: string
): Promise<RiscosCampanhaRecord | null> {
  const admin = createAdminClient();
  const primary = await admin
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("orcamento_id", orcamentoId)
    .order("created_at", { ascending: false });

  if (isMissingColumnError(primary.error)) {
    return null;
  }
  if (primary.error) throw primary.error;
  const rows = (primary.data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return null;
  const mapped = rows.map((row) => mapCampanhaRow(row));
  return (
    mapped.find((c) => c.status === "aberta") ??
    mapped.find((c) => c.status === "em_preparacao") ??
    mapped.find((c) => c.status === "encerrada") ??
    mapped.find((c) => c.status === "cancelada") ??
    mapped[0]
  );
}

export async function processoRiscosEstaCanceladoNoServidor(input: {
  orcamentoId?: string | null;
  campanhaId?: string | null;
}): Promise<boolean> {
  const admin = createAdminClient();
  const orcamentoId = String(input.orcamentoId ?? "").trim();
  const campanhaId = String(input.campanhaId ?? "").trim();

  if (orcamentoId && !orcamentoId.startsWith("manual:")) {
    const { data, error } = await admin
      .from("orcamento_riscos_psicossociais")
      .select("status")
      .eq("orcamento_id", orcamentoId)
      .maybeSingle();
    if (error && !isMissingTrackingCancelColumn(error) && error.code !== "42703") {
      throw error;
    }
    if (isTrackingRiscosCancelado(data)) return true;
  }

  if (campanhaId) {
    const { data, error } = await admin
      .from("riscos_campanha_fluxo")
      .select("status")
      .eq("campanha_id", campanhaId)
      .maybeSingle();
    if (error && error.code !== "42P01" && !isMissingTrackingCancelColumn(error)) {
      if (!/does not exist|riscos_campanha_fluxo/i.test(error.message ?? "")) {
        throw error;
      }
    }
    if (isTrackingRiscosCancelado(data)) return true;

    const campanha = await selecionarCampanhaPorId(campanhaId);
    if (campanha && isOrigemManualCliente(campanha.origem) && campanha.status === "cancelada") {
      return true;
    }
  }

  return false;
}

export async function assertProcessoRiscosNaoCanceladoNoServidor(input: {
  orcamentoId?: string | null;
  campanhaId?: string | null;
}): Promise<void> {
  const cancelado = await processoRiscosEstaCanceladoNoServidor(input);
  if (cancelado) throw new Error(MSG_PROCESSO_RISCOS_CANCELADO);
}

async function persistirCancelamentoTracking(input: {
  orcamentoId?: string | null;
  campanhaId?: string | null;
  origemManual: boolean;
  agora: string;
  nome: string;
  motivo: string;
}): Promise<void> {
  const admin = createAdminClient();
  const patch = {
    status: "cancelado",
    cancelado_em: input.agora,
    cancelado_por: input.nome,
    motivo_cancelamento: input.motivo,
  };

  if (input.origemManual && input.campanhaId) {
    const upd = await admin
      .from("riscos_campanha_fluxo")
      .update(patch)
      .eq("campanha_id", input.campanhaId)
      .select("campanha_id")
      .maybeSingle();
    if (isMissingTrackingCancelColumn(upd.error)) {
      throw new Error(
        "Migration de cancelamento do processo não aplicada (colunas cancelado_*). Aplique a migration 111."
      );
    }
    if (upd.error) throw upd.error;
    if (upd.data) return;

    const ins = await admin.from("riscos_campanha_fluxo").insert({
      campanha_id: input.campanhaId,
      etapa_atual: "lista_presenca",
      etapas_concluidas: 0,
      ...patch,
    });
    if (ins.error && ins.error.code !== "23505") throw ins.error;
    return;
  }

  const orcamentoId = String(input.orcamentoId ?? "").trim();
  if (!orcamentoId || orcamentoId.startsWith("manual:")) {
    return;
  }

  const upd = await admin
    .from("orcamento_riscos_psicossociais")
    .update(patch)
    .eq("orcamento_id", orcamentoId)
    .select("orcamento_id")
    .maybeSingle();
  if (isMissingTrackingCancelColumn(upd.error)) {
    throw new Error(
      "Migration de cancelamento do processo não aplicada (colunas cancelado_*). Aplique a migration 111."
    );
  }
  if (upd.error) throw upd.error;
  if (upd.data) return;

  const ins = await admin.from("orcamento_riscos_psicossociais").upsert(
    {
      orcamento_id: orcamentoId,
      etapa_atual: "lista_presenca",
      etapas_concluidas: 0,
      entrada_em: input.agora,
      ...patch,
    },
    { onConflict: "orcamento_id", ignoreDuplicates: false }
  );
  if (ins.error) throw ins.error;
}

async function cancelarCampanhaAbertaSeNecessario(
  campanha: RiscosCampanhaRecord,
  motivo: string,
  agora: string,
  nome: string
): Promise<RiscosCampanhaRecord> {
  if (!deveCancelarCampanhaVinculada(campanha.status)) {
    return campanha;
  }

  await invalidarSessoesDaCampanha(campanha.id, nome);

  const admin = createAdminClient();
  const updatePrimary = await admin
    .from("riscos_campanhas")
    .update({
      status: "cancelada",
      cancelada_em: agora,
      cancelada_por: nome,
      motivo_cancelamento: motivo,
    })
    .eq("id", campanha.id)
    .neq("status", "cancelada")
    .select(CAMPANHA_SELECT)
    .maybeSingle();

  if (isMissingColumnError(updatePrimary.error)) {
    throw new Error(
      "Migration de cancelamento não aplicada (colunas cancelada_* / status cancelada). Aplique a migration 102."
    );
  }
  if (updatePrimary.error) throw updatePrimary.error;

  const confirmed = await selecionarCampanhaPorId(campanha.id);
  if (!confirmed || confirmed.status !== "cancelada") {
    throw new Error(
      `O cancelamento da campanha não foi confirmado no banco (status atual: ${confirmed?.status ?? "desconhecido"}).`
    );
  }
  return confirmed;
}

export async function cancelarProcessoListagemRiscosNoServidor(
  input: {
    orcamentoId?: string | null;
    campanhaId?: string | null;
    motivo: string;
  },
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosProcessoCanceladoResultado> {
  const orcamentoId = String(input.orcamentoId ?? "").trim();
  const campanhaId = String(input.campanhaId ?? "").trim();
  const orcamentoReal =
    orcamentoId && !orcamentoId.startsWith("manual:") ? orcamentoId : "";

  if (!orcamentoReal && !campanhaId) {
    throw new Error("Informe o processo a cancelar.");
  }

  const motivoErr = validateMotivoCancelamento(input.motivo);
  if (motivoErr) throw new Error(motivoErr);
  const motivoTrim = input.motivo.trim();

  let campanha: RiscosCampanhaRecord | null = campanhaId
    ? await selecionarCampanhaPorId(campanhaId)
    : null;
  if (campanhaId && !campanha) {
    throw new Error("Campanha não encontrada.");
  }
  if (!campanha && orcamentoReal) {
    campanha = await buscarCampanhaAtivaOuCanceladaPorOrcamento(orcamentoReal);
  }

  const origemManual = campanha
    ? isOrigemManualCliente(campanha.origem)
    : false;
  const trackingOrcamentoId = origemManual
    ? ""
    : orcamentoReal || String(campanha?.orcamento_id ?? "").trim();

  const adminStatus = createAdminClient();
  let trackingStatus: string | null = null;
  if (origemManual && campanha?.id) {
    const fluxo = await adminStatus
      .from("riscos_campanha_fluxo")
      .select("status")
      .eq("campanha_id", campanha.id)
      .maybeSingle();
    trackingStatus = fluxo.data?.status ? String(fluxo.data.status) : null;
  } else if (trackingOrcamentoId) {
    const row = await adminStatus
      .from("orcamento_riscos_psicossociais")
      .select("status")
      .eq("orcamento_id", trackingOrcamentoId)
      .maybeSingle();
    trackingStatus = row.data?.status ? String(row.data.status) : null;
  }

  const regra = validateCancelarProcessoListagem({
    status: trackingStatus,
    etapaAtual: trackingStatus === "cancelado" ? "cancelado" : undefined,
    motivo: motivoTrim,
  });
  if (regra) throw new Error(regra);

  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  const agora = new Date().toISOString();

  await persistirCancelamentoTracking({
    orcamentoId: trackingOrcamentoId || null,
    campanhaId: campanha?.id ?? null,
    origemManual,
    agora,
    nome,
    motivo: motivoTrim,
  });

  if (campanha && deveCancelarCampanhaVinculada(campanha.status)) {
    campanha = await cancelarCampanhaAbertaSeNecessario(
      campanha,
      motivoTrim,
      agora,
      nome
    );
  }

  const empresaNome =
    campanha?.empresa_nome || trackingOrcamentoId || campanha?.id || "processo";
  const registroId = campanha?.id || trackingOrcamentoId;

  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_processo_cancelado,
    registroId,
    registroNome: empresaNome,
    descricao: `${nome} cancelou o processo de Riscos Psicossociais${
      campanha?.codigo_publico ? ` (${campanha.codigo_publico})` : ""
    }. Motivo: ${motivoTrim}`,
    dadosAntes: {
      campanha_status: campanha?.status ?? null,
      orcamento_id: trackingOrcamentoId || null,
      campanha_id: campanha?.id ?? null,
    },
    dadosDepois: {
      status: "cancelado",
      cancelado_em: agora,
      cancelado_por: nome,
      motivo_cancelamento: motivoTrim,
      campanha_status: campanha?.status ?? null,
    },
  });

  return {
    status: "cancelado",
    cancelado_em: agora,
    cancelado_por: nome,
    motivo_cancelamento: motivoTrim,
    campanha,
    orcamento_id: trackingOrcamentoId || null,
  };
}

export async function cancelarProcessoRiscosNoServidor(
  campanhaId: string,
  motivo: string,
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosCampanhaRecord> {
  const result = await cancelarProcessoListagemRiscosNoServidor(
    { campanhaId, motivo },
    auditOptions
  );
  if (result.campanha) return result.campanha;
  throw new Error("Campanha não encontrada.");
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
