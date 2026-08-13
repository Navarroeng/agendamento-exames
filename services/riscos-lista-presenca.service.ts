import { createClient } from "@/lib/supabase/client";
import {
  isListaPresencaEtapaConcluida,
  isSolicitacaoListaConcluida,
  mapListaPresencaFromTracking,
  type RiscosListaPresencaAnexoMeta,
  type RiscosListaPresencaDados,
} from "@/lib/riscos-lista-presenca";
import type {
  OrcamentoRiscosPsicossociaisRecord,
  RiscosPsicossociaisEtapaPersistidaId,
} from "@/lib/riscos-psicossociais";
import {
  removerArquivoRiscosListaPresenca,
  uploadRiscosListaPresencaAnexo,
} from "@/services/riscos-lista-presenca-storage.service";

const RISCOS_TRACKING_SELECT =
  "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at, lista_solicitada, lista_solicitada_em, lista_solicitada_email, lista_solicitada_por, lista_solicitada_registrado_em, lista_recebida, lista_anexo_path, lista_anexo_nome, lista_anexo_tipo, lista_anexo_tamanho, lista_recebida_em, lista_recebida_por";

const FLUXO_SELECT =
  "campanha_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at, lista_solicitada, lista_solicitada_em, lista_solicitada_email, lista_solicitada_por, lista_solicitada_registrado_em, lista_recebida, lista_anexo_path, lista_anexo_nome, lista_anexo_tipo, lista_anexo_tamanho, lista_recebida_em, lista_recebida_por";

export type ListaPresencaTarget =
  | { kind: "orcamento"; orcamentoId: string }
  | { kind: "campanha"; campanhaId: string };

function resolveStorageKey(target: ListaPresencaTarget): string {
  return target.kind === "orcamento"
    ? target.orcamentoId
    : `campanha/${target.campanhaId}`;
}

function mapFluxoToTracking(
  row: Record<string, unknown>
): OrcamentoRiscosPsicossociaisRecord {
  return {
    orcamento_id: String(row.campanha_id ?? ""),
    etapa_atual: String(
      row.etapa_atual ?? "lista_presenca"
    ) as RiscosPsicossociaisEtapaPersistidaId,
    etapas_concluidas: Number(row.etapas_concluidas) || 0,
    status:
      row.status === "concluido" ? "concluido" : "em_andamento",
    entrada_em: row.entrada_em ? String(row.entrada_em) : null,
    concluido_em: row.concluido_em ? String(row.concluido_em) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
    lista_solicitada: row.lista_solicitada === true,
    lista_solicitada_em: row.lista_solicitada_em
      ? String(row.lista_solicitada_em)
      : null,
    lista_solicitada_email: row.lista_solicitada_email
      ? String(row.lista_solicitada_email)
      : null,
    lista_solicitada_por: row.lista_solicitada_por
      ? String(row.lista_solicitada_por)
      : null,
    lista_solicitada_registrado_em: row.lista_solicitada_registrado_em
      ? String(row.lista_solicitada_registrado_em)
      : null,
    lista_recebida: row.lista_recebida === true,
    lista_anexo_path: row.lista_anexo_path
      ? String(row.lista_anexo_path)
      : null,
    lista_anexo_nome: row.lista_anexo_nome
      ? String(row.lista_anexo_nome)
      : null,
    lista_anexo_tipo: row.lista_anexo_tipo
      ? String(row.lista_anexo_tipo)
      : null,
    lista_anexo_tamanho:
      row.lista_anexo_tamanho != null ? Number(row.lista_anexo_tamanho) : null,
    lista_recebida_em: row.lista_recebida_em
      ? String(row.lista_recebida_em)
      : null,
    lista_recebida_por: row.lista_recebida_por
      ? String(row.lista_recebida_por)
      : null,
  };
}

async function buscarTracking(
  orcamentoId: string
): Promise<OrcamentoRiscosPsicossociaisRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_riscos_psicossociais")
    .select(RISCOS_TRACKING_SELECT)
    .eq("orcamento_id", orcamentoId)
    .maybeSingle();

  if (error) throw error;
  return (data as OrcamentoRiscosPsicossociaisRecord | null) ?? null;
}

export async function buscarFluxoCampanha(
  campanhaId: string
): Promise<OrcamentoRiscosPsicossociaisRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("riscos_campanha_fluxo")
    .select(FLUXO_SELECT)
    .eq("campanha_id", campanhaId)
    .maybeSingle();

  if (error) {
    if (
      error.code === "42P01" ||
      /does not exist|riscos_campanha_fluxo/i.test(error.message ?? "")
    ) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  return mapFluxoToTracking(data as Record<string, unknown>);
}

async function buscarTrackingPorTarget(
  target: ListaPresencaTarget
): Promise<OrcamentoRiscosPsicossociaisRecord | null> {
  if (target.kind === "orcamento") {
    return buscarTracking(target.orcamentoId);
  }
  return buscarFluxoCampanha(target.campanhaId);
}

async function registrarHistoricoAnexo(params: {
  orcamentoId: string | null;
  acao: "anexado" | "substituido" | "removido";
  anexo: Partial<RiscosListaPresencaAnexoMeta> | null;
  usuarioNome: string;
}): Promise<void> {
  if (!params.orcamentoId) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("orcamento_riscos_lista_presenca_anexos_hist")
    .insert({
      orcamento_id: params.orcamentoId,
      acao: params.acao,
      anexo_path: params.anexo?.path ?? null,
      anexo_nome: params.anexo?.nome ?? null,
      anexo_tipo: params.anexo?.tipo ?? null,
      anexo_tamanho: params.anexo?.tamanho ?? null,
      usuario_nome: params.usuarioNome,
    });
  if (error) {
    console.warn("falha ao registrar histórico de anexo:", error.message);
  }
}

function syncProgressoAposLista(
  lista: RiscosListaPresencaDados,
  atual: OrcamentoRiscosPsicossociaisRecord
): {
  etapas_concluidas: number;
  etapa_atual: OrcamentoRiscosPsicossociaisRecord["etapa_atual"];
} {
  const concluida = isListaPresencaEtapaConcluida(lista);
  const stored = Math.max(0, Number(atual.etapas_concluidas) || 0);

  if (concluida) {
    return {
      etapas_concluidas: Math.max(1, stored),
      etapa_atual:
        atual.etapa_atual === "lista_presenca"
          ? "cadastro_empresa"
          : atual.etapa_atual,
    };
  }

  return {
    etapas_concluidas: 0,
    etapa_atual: "lista_presenca",
  };
}

function normalizeTarget(
  params: { orcamentoId?: string; campanhaId?: string } | ListaPresencaTarget
): ListaPresencaTarget {
  if ("kind" in params) return params;
  if (params.campanhaId) {
    return { kind: "campanha", campanhaId: params.campanhaId };
  }
  if (params.orcamentoId) {
    return { kind: "orcamento", orcamentoId: params.orcamentoId };
  }
  throw new Error("Informe orçamento ou campanha para a lista de presença.");
}

export async function salvarSolicitacaoListaPresenca(params: {
  orcamentoId?: string;
  campanhaId?: string;
  dataSolicitacaoIso: string;
  usuarioNome: string;
}): Promise<OrcamentoRiscosPsicossociaisRecord> {
  const target = normalizeTarget(params);
  if (!params.dataSolicitacaoIso.trim()) {
    throw new Error("Informe a data da solicitação.");
  }

  const atual = await buscarTrackingPorTarget(target);
  if (!atual) {
    throw new Error("Tracking de Riscos Psicossociais não encontrado.");
  }

  const now = new Date().toISOString();
  const listaPreview: RiscosListaPresencaDados = {
    ...mapListaPresencaFromTracking(atual),
    lista_solicitada: true,
    lista_solicitada_em: params.dataSolicitacaoIso.slice(0, 10),
  };

  if (!isSolicitacaoListaConcluida(listaPreview)) {
    throw new Error("Informe a data da solicitação.");
  }

  const progresso = syncProgressoAposLista(listaPreview, atual);
  const supabase = createClient();
  const patch = {
    lista_solicitada: true,
    lista_solicitada_em: params.dataSolicitacaoIso.slice(0, 10),
    lista_solicitada_por: params.usuarioNome,
    lista_solicitada_registrado_em: now,
    ...progresso,
  };

  if (target.kind === "campanha") {
    const { data, error } = await supabase
      .from("riscos_campanha_fluxo")
      .update(patch)
      .eq("campanha_id", target.campanhaId)
      .select(FLUXO_SELECT)
      .single();
    if (error) throw error;
    return mapFluxoToTracking(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("orcamento_riscos_psicossociais")
    .update(patch)
    .eq("orcamento_id", target.orcamentoId)
    .select(RISCOS_TRACKING_SELECT)
    .single();

  if (error) throw error;
  return data as OrcamentoRiscosPsicossociaisRecord;
}

export async function salvarRecebimentoListaPresenca(params: {
  orcamentoId?: string;
  campanhaId?: string;
  file: File;
  usuarioNome: string;
}): Promise<OrcamentoRiscosPsicossociaisRecord> {
  const target = normalizeTarget(params);
  const atual = await buscarTrackingPorTarget(target);
  if (!atual) {
    throw new Error("Tracking de Riscos Psicossociais não encontrado.");
  }

  const listaAtual = mapListaPresencaFromTracking(atual);
  if (!isSolicitacaoListaConcluida(listaAtual)) {
    throw new Error(
      "Salve a solicitação da lista (data e e-mail) antes do recebimento."
    );
  }

  const uploaded = await uploadRiscosListaPresencaAnexo(
    resolveStorageKey(target),
    params.file
  );

  const pathAnterior = listaAtual.lista_anexo_path;
  const acaoHist = pathAnterior ? "substituido" : "anexado";

  const listaPreview: RiscosListaPresencaDados = {
    ...listaAtual,
    lista_recebida: true,
    lista_anexo_path: uploaded.path,
    lista_anexo_nome: uploaded.nome,
    lista_anexo_tipo: uploaded.tipo,
    lista_anexo_tamanho: uploaded.tamanho,
  };
  const progresso = syncProgressoAposLista(listaPreview, atual);
  const now = new Date().toISOString();
  const patch = {
    lista_recebida: true,
    lista_anexo_path: uploaded.path,
    lista_anexo_nome: uploaded.nome,
    lista_anexo_tipo: uploaded.tipo,
    lista_anexo_tamanho: uploaded.tamanho,
    lista_recebida_em: now,
    lista_recebida_por: params.usuarioNome,
    ...progresso,
  };

  const supabase = createClient();
  let data: OrcamentoRiscosPsicossociaisRecord;

  if (target.kind === "campanha") {
    const res = await supabase
      .from("riscos_campanha_fluxo")
      .update(patch)
      .eq("campanha_id", target.campanhaId)
      .select(FLUXO_SELECT)
      .single();
    if (res.error) {
      await removerArquivoRiscosListaPresenca(uploaded.path);
      throw res.error;
    }
    data = mapFluxoToTracking(res.data as Record<string, unknown>);
  } else {
    const res = await supabase
      .from("orcamento_riscos_psicossociais")
      .update(patch)
      .eq("orcamento_id", target.orcamentoId)
      .select(RISCOS_TRACKING_SELECT)
      .single();
    if (res.error) {
      await removerArquivoRiscosListaPresenca(uploaded.path);
      throw res.error;
    }
    data = res.data as OrcamentoRiscosPsicossociaisRecord;

    await registrarHistoricoAnexo({
      orcamentoId: target.orcamentoId,
      acao: acaoHist,
      anexo: uploaded,
      usuarioNome: params.usuarioNome,
    });

    if (pathAnterior && pathAnterior !== uploaded.path) {
      await registrarHistoricoAnexo({
        orcamentoId: target.orcamentoId,
        acao: "removido",
        anexo: {
          path: pathAnterior,
          nome: listaAtual.lista_anexo_nome ?? pathAnterior,
          tipo: listaAtual.lista_anexo_tipo ?? "",
          tamanho: listaAtual.lista_anexo_tamanho ?? 0,
        },
        usuarioNome: params.usuarioNome,
      });
      await removerArquivoRiscosListaPresenca(pathAnterior);
    }
  }

  if (target.kind === "campanha" && pathAnterior && pathAnterior !== uploaded.path) {
    await removerArquivoRiscosListaPresenca(pathAnterior);
  }

  return data;
}

export async function removerAnexoListaPresenca(params: {
  orcamentoId?: string;
  campanhaId?: string;
  usuarioNome: string;
}): Promise<OrcamentoRiscosPsicossociaisRecord> {
  const target = normalizeTarget(params);
  const atual = await buscarTrackingPorTarget(target);
  if (!atual) {
    throw new Error("Tracking de Riscos Psicossociais não encontrado.");
  }

  const listaAtual = mapListaPresencaFromTracking(atual);
  const pathAnterior = listaAtual.lista_anexo_path;

  const listaPreview: RiscosListaPresencaDados = {
    ...listaAtual,
    lista_recebida: false,
    lista_anexo_path: null,
    lista_anexo_nome: null,
    lista_anexo_tipo: null,
    lista_anexo_tamanho: null,
    lista_recebida_em: null,
    lista_recebida_por: null,
  };
  const progresso = syncProgressoAposLista(listaPreview, atual);
  const patch = {
    lista_recebida: false,
    lista_anexo_path: null,
    lista_anexo_nome: null,
    lista_anexo_tipo: null,
    lista_anexo_tamanho: null,
    lista_recebida_em: null,
    lista_recebida_por: null,
    ...progresso,
  };

  const supabase = createClient();
  let data: OrcamentoRiscosPsicossociaisRecord;

  if (target.kind === "campanha") {
    const res = await supabase
      .from("riscos_campanha_fluxo")
      .update(patch)
      .eq("campanha_id", target.campanhaId)
      .select(FLUXO_SELECT)
      .single();
    if (res.error) throw res.error;
    data = mapFluxoToTracking(res.data as Record<string, unknown>);
  } else {
    const res = await supabase
      .from("orcamento_riscos_psicossociais")
      .update(patch)
      .eq("orcamento_id", target.orcamentoId)
      .select(RISCOS_TRACKING_SELECT)
      .single();
    if (res.error) throw res.error;
    data = res.data as OrcamentoRiscosPsicossociaisRecord;

    if (pathAnterior) {
      await registrarHistoricoAnexo({
        orcamentoId: target.orcamentoId,
        acao: "removido",
        anexo: {
          path: pathAnterior,
          nome: listaAtual.lista_anexo_nome ?? pathAnterior,
          tipo: listaAtual.lista_anexo_tipo ?? "",
          tamanho: listaAtual.lista_anexo_tamanho ?? 0,
        },
        usuarioNome: params.usuarioNome,
      });
    }
  }

  if (pathAnterior) {
    await removerArquivoRiscosListaPresenca(pathAnterior);
  }

  return data;
}

export { RISCOS_TRACKING_SELECT, FLUXO_SELECT };
