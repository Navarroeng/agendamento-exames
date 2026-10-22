import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { isOrigemManualCliente } from "@/lib/riscos-campanha-origem";
import {
  mapRiscosCampanhaRow,
  RISCOS_CAMPANHA_SELECT,
  RISCOS_CAMPANHA_SELECT_LEGACY,
  type RiscosCampanhaRecord,
} from "@/lib/riscos-campanha";
import {
  isPausaAdministrativaAtiva,
  isRiscosPausaSituacao,
  labelPausaSituacaoRiscos,
  MSG_PROCESSO_RISCOS_PAUSADO,
  validatePausarProcessoRiscos,
  validateRetomarProcessoRiscos,
  type RiscosPausaSituacao,
} from "@/lib/riscos-processo-pausa";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoriaServer } from "@/services/auditoria.server";

const CAMPANHA_SELECT = RISCOS_CAMPANHA_SELECT;
const CAMPANHA_SELECT_LEGACY = RISCOS_CAMPANHA_SELECT_LEGACY;

const TRACKING_PAUSA_SELECT =
  "status, etapa_atual, pausa_situacao, pausa_em, pausa_por, pausa_observacao";

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

function isMissingPausaColumn(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  return (
    /pausa_situacao|pausa_em|pausa_por|pausa_observacao/i.test(
      error.message ?? ""
    ) || error.code === "42703"
  );
}

const MSG_MIGRATION_PAUSA =
  "Migration de pausa administrativa não aplicada (colunas pausa_*). Aplique a migration 144.";

function mapCampanhaRow(row: Record<string, unknown>): RiscosCampanhaRecord {
  return mapRiscosCampanhaRow(row);
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

async function buscarCampanhaPorOrcamento(
  orcamentoId: string
): Promise<RiscosCampanhaRecord | null> {
  const admin = createAdminClient();
  const primary = await admin
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("orcamento_id", orcamentoId)
    .order("created_at", { ascending: false });

  if (isMissingColumnError(primary.error)) return null;
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

type TrackingPausaRow = {
  status: string | null;
  etapa_atual: string | null;
  pausa_situacao: string | null;
  pausa_em: string | null;
  pausa_por: string | null;
  pausa_observacao: string | null;
};

async function lerTrackingPausa(input: {
  origemManual: boolean;
  campanhaId?: string | null;
  orcamentoId?: string | null;
}): Promise<TrackingPausaRow | null> {
  const admin = createAdminClient();
  if (input.origemManual && input.campanhaId) {
    const { data, error } = await admin
      .from("riscos_campanha_fluxo")
      .select(TRACKING_PAUSA_SELECT)
      .eq("campanha_id", input.campanhaId)
      .maybeSingle();
    if (isMissingPausaColumn(error)) return null;
    if (error && error.code !== "42P01") throw error;
    return (data as TrackingPausaRow | null) ?? null;
  }
  const orcamentoId = String(input.orcamentoId ?? "").trim();
  if (!orcamentoId || orcamentoId.startsWith("manual:")) return null;
  const { data, error } = await admin
    .from("orcamento_riscos_psicossociais")
    .select(TRACKING_PAUSA_SELECT)
    .eq("orcamento_id", orcamentoId)
    .maybeSingle();
  if (isMissingPausaColumn(error)) return null;
  if (error) throw error;
  return (data as TrackingPausaRow | null) ?? null;
}

async function persistirPausaTracking(input: {
  origemManual: boolean;
  campanhaId?: string | null;
  orcamentoId?: string | null;
  patch: Record<string, unknown>;
  agora: string;
}): Promise<void> {
  const admin = createAdminClient();

  if (input.origemManual && input.campanhaId) {
    const upd = await admin
      .from("riscos_campanha_fluxo")
      .update(input.patch)
      .eq("campanha_id", input.campanhaId)
      .select("campanha_id")
      .maybeSingle();
    if (isMissingPausaColumn(upd.error)) throw new Error(MSG_MIGRATION_PAUSA);
    if (upd.error) throw upd.error;
    if (upd.data) return;

    const ins = await admin.from("riscos_campanha_fluxo").insert({
      campanha_id: input.campanhaId,
      etapa_atual: "lista_presenca",
      etapas_concluidas: 0,
      status: "em_andamento",
      entrada_em: input.agora,
      ...input.patch,
    });
    if (isMissingPausaColumn(ins.error)) throw new Error(MSG_MIGRATION_PAUSA);
    if (ins.error && ins.error.code !== "23505") throw ins.error;
    return;
  }

  const orcamentoId = String(input.orcamentoId ?? "").trim();
  if (!orcamentoId || orcamentoId.startsWith("manual:")) {
    throw new Error("Informe o processo a pausar.");
  }

  const upd = await admin
    .from("orcamento_riscos_psicossociais")
    .update(input.patch)
    .eq("orcamento_id", orcamentoId)
    .select("orcamento_id")
    .maybeSingle();
  if (isMissingPausaColumn(upd.error)) throw new Error(MSG_MIGRATION_PAUSA);
  if (upd.error) throw upd.error;
  if (upd.data) return;

  const ins = await admin.from("orcamento_riscos_psicossociais").upsert(
    {
      orcamento_id: orcamentoId,
      etapa_atual: "lista_presenca",
      etapas_concluidas: 0,
      status: "em_andamento",
      entrada_em: input.agora,
      ...input.patch,
    },
    { onConflict: "orcamento_id", ignoreDuplicates: false }
  );
  if (isMissingPausaColumn(ins.error)) throw new Error(MSG_MIGRATION_PAUSA);
  if (ins.error) throw ins.error;
}

async function resolverIdentidade(input: {
  orcamentoId?: string | null;
  campanhaId?: string | null;
}): Promise<{
  campanha: RiscosCampanhaRecord | null;
  origemManual: boolean;
  trackingOrcamentoId: string;
}> {
  const orcamentoId = String(input.orcamentoId ?? "").trim();
  const campanhaId = String(input.campanhaId ?? "").trim();
  const orcamentoReal =
    orcamentoId && !orcamentoId.startsWith("manual:") ? orcamentoId : "";

  if (!orcamentoReal && !campanhaId) {
    throw new Error("Informe o processo.");
  }

  let campanha: RiscosCampanhaRecord | null = campanhaId
    ? await selecionarCampanhaPorId(campanhaId)
    : null;
  if (campanhaId && !campanha) {
    throw new Error("Campanha não encontrada.");
  }
  if (!campanha && orcamentoReal) {
    campanha = await buscarCampanhaPorOrcamento(orcamentoReal);
  }

  const origemManual = campanha ? isOrigemManualCliente(campanha.origem) : false;
  const trackingOrcamentoId = origemManual
    ? ""
    : orcamentoReal || String(campanha?.orcamento_id ?? "").trim();

  return { campanha, origemManual, trackingOrcamentoId };
}

export async function processoRiscosEstaPausadoNoServidor(input: {
  orcamentoId?: string | null;
  campanhaId?: string | null;
}): Promise<boolean> {
  const identidade = await resolverIdentidade(input).catch(() => null);
  if (!identidade) return false;
  const tracking = await lerTrackingPausa({
    origemManual: identidade.origemManual,
    campanhaId: identidade.campanha?.id ?? input.campanhaId,
    orcamentoId: identidade.trackingOrcamentoId,
  });
  return isPausaAdministrativaAtiva(tracking?.pausa_situacao);
}

export async function assertProcessoRiscosNaoPausadoNoServidor(input: {
  orcamentoId?: string | null;
  campanhaId?: string | null;
}): Promise<void> {
  const pausado = await processoRiscosEstaPausadoNoServidor(input);
  if (pausado) throw new Error(MSG_PROCESSO_RISCOS_PAUSADO);
}

export type RiscosProcessoPausaResultado = {
  pausa_situacao: RiscosPausaSituacao;
  pausa_em: string;
  pausa_por: string;
  pausa_observacao: string | null;
};

export async function pausarProcessoRiscosNoServidor(
  input: {
    orcamentoId?: string | null;
    campanhaId?: string | null;
    situacao: string;
    observacao?: string | null;
  },
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosProcessoPausaResultado> {
  if (!isRiscosPausaSituacao(input.situacao)) {
    throw new Error("Situação inválida.");
  }
  const situacao = input.situacao;
  const { campanha, origemManual, trackingOrcamentoId } =
    await resolverIdentidade(input);

  const tracking = await lerTrackingPausa({
    origemManual,
    campanhaId: campanha?.id ?? null,
    orcamentoId: trackingOrcamentoId,
  });

  const regra = validatePausarProcessoRiscos({
    situacao,
    observacao: input.observacao,
    processoCancelado: tracking?.status === "cancelado",
    processoConcluido: tracking?.status === "concluido",
    processoPausado: isPausaAdministrativaAtiva(tracking?.pausa_situacao),
    campanhaStatus: campanha?.status ?? null,
  });
  if (regra) throw new Error(regra);

  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  const agora = new Date().toISOString();
  const observacao = String(input.observacao ?? "").trim() || null;

  await persistirPausaTracking({
    origemManual,
    campanhaId: campanha?.id ?? null,
    orcamentoId: trackingOrcamentoId,
    agora,
    patch: {
      pausa_situacao: situacao,
      pausa_em: agora,
      pausa_por: nome,
      pausa_observacao: observacao,
    },
  });

  const empresaNome =
    campanha?.empresa_nome || trackingOrcamentoId || campanha?.id || "processo";
  const registroId = campanha?.id || trackingOrcamentoId;
  const acao =
    situacao === "sem_retorno"
      ? AUDITORIA_ACOES.riscos_processo_sem_retorno
      : AUDITORIA_ACOES.riscos_processo_adiado_cliente;
  const label = labelPausaSituacaoRiscos(situacao);

  await registrarAuditoriaServer({
    contexto: {
      usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
      usuarioNome: nome,
      usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    },
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao,
    registroId,
    registroNome: empresaNome,
    descricao: `${nome} registrou a situação "${label}" no processo de Riscos Psicossociais da empresa ${empresaNome}.`,
    dadosAntes: {
      status: tracking?.status ?? "em_andamento",
      etapa_atual: tracking?.etapa_atual ?? null,
      campanha_status: campanha?.status ?? null,
      pausa_situacao: tracking?.pausa_situacao ?? null,
      orcamento_id: trackingOrcamentoId || null,
      campanha_id: campanha?.id ?? null,
    },
    dadosDepois: {
      situacao_anterior: tracking?.status ?? "em_andamento",
      nova_situacao: situacao,
      pausa_em: agora,
      pausa_por: nome,
      pausa_observacao: observacao,
      status: tracking?.status ?? "em_andamento",
      etapa_atual: tracking?.etapa_atual ?? null,
    },
  });

  return {
    pausa_situacao: situacao,
    pausa_em: agora,
    pausa_por: nome,
    pausa_observacao: observacao,
  };
}

export type RiscosProcessoRetomadaResultado = {
  retomado_em: string;
  retomado_por: string;
  situacao_anterior: RiscosPausaSituacao | null;
};

export async function retomarProcessoRiscosNoServidor(
  input: {
    orcamentoId?: string | null;
    campanhaId?: string | null;
  },
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosProcessoRetomadaResultado> {
  const { campanha, origemManual, trackingOrcamentoId } =
    await resolverIdentidade(input);

  const tracking = await lerTrackingPausa({
    origemManual,
    campanhaId: campanha?.id ?? null,
    orcamentoId: trackingOrcamentoId,
  });

  const regra = validateRetomarProcessoRiscos({
    processoPausado: isPausaAdministrativaAtiva(tracking?.pausa_situacao),
    processoCancelado: tracking?.status === "cancelado",
  });
  if (regra) throw new Error(regra);

  const situacaoAnterior = isRiscosPausaSituacao(tracking?.pausa_situacao)
    ? tracking?.pausa_situacao
    : null;
  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  const agora = new Date().toISOString();

  await persistirPausaTracking({
    origemManual,
    campanhaId: campanha?.id ?? null,
    orcamentoId: trackingOrcamentoId,
    agora,
    patch: {
      pausa_situacao: null,
      pausa_em: null,
      pausa_por: null,
      pausa_observacao: null,
    },
  });

  const empresaNome =
    campanha?.empresa_nome || trackingOrcamentoId || campanha?.id || "processo";
  const registroId = campanha?.id || trackingOrcamentoId;

  await registrarAuditoriaServer({
    contexto: {
      usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
      usuarioNome: nome,
      usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    },
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_processo_retomado,
    registroId,
    registroNome: empresaNome,
    descricao: `${nome} retomou o processo de Riscos Psicossociais da empresa ${empresaNome} (situação anterior: ${labelPausaSituacaoRiscos(situacaoAnterior) || "pausa"}).`,
    dadosAntes: {
      pausa_situacao: situacaoAnterior,
      pausa_em: tracking?.pausa_em ?? null,
      pausa_por: tracking?.pausa_por ?? null,
      pausa_observacao: tracking?.pausa_observacao ?? null,
      status: tracking?.status ?? "em_andamento",
      etapa_atual: tracking?.etapa_atual ?? null,
      campanha_status: campanha?.status ?? null,
      orcamento_id: trackingOrcamentoId || null,
      campanha_id: campanha?.id ?? null,
    },
    dadosDepois: {
      situacao_anterior: situacaoAnterior,
      nova_situacao: tracking?.status ?? "em_andamento",
      retomado_em: agora,
      retomado_por: nome,
      pausa_situacao: null,
      status: tracking?.status ?? "em_andamento",
      etapa_atual: tracking?.etapa_atual ?? null,
    },
  });

  return {
    retomado_em: agora,
    retomado_por: nome,
    situacao_anterior: situacaoAnterior,
  };
}
