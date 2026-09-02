import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  montarResultadoJsonRelatorio,
  validatePodeGerarRelatorioFinal,
  type RiscosRelatorioListagemMeta,
  type RiscosRelatorioRecord,
  type RiscosRelatorioResultadoJson,
  type RiscosRelatorioStatus,
} from "@/lib/riscos-relatorio";
import { isEmailValido } from "@/lib/email-validacao";
import { isRelatorioEnvioExplicitamenteConfirmado } from "@/lib/riscos-relatorio-envio";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/services/auditoria.service";
import { assertProcessoRiscosNaoCanceladoNoServidor } from "@/services/riscos-campanha-cancelar.server";
import { obterResultadosCampanhaRiscos } from "@/services/riscos-resultados.service";

const RELATORIO_SELECT =
  "id, campanha_id, cliente_id, codigo_publico, empresa_nome, gerado_em, gerado_por, gerado_por_user_id, participantes, respondentes, pendentes, taxa_participacao, resultado_json, status, pdf_url, relatorio_enviado_em, relatorio_enviado_email, relatorio_enviado_por, relatorio_enviado_por_user_id, created_at, updated_at";

const RELATORIO_SELECT_LEGACY =
  "id, campanha_id, cliente_id, codigo_publico, empresa_nome, gerado_em, gerado_por, gerado_por_user_id, participantes, respondentes, pendentes, taxa_participacao, resultado_json, status, pdf_url, created_at, updated_at";

function mapRelatorio(row: Record<string, unknown>): RiscosRelatorioRecord {
  const statusRaw = String(row.status ?? "gerado");
  const status: RiscosRelatorioStatus =
    statusRaw === "substituido" ? "substituido" : "gerado";
  const json = (row.resultado_json ?? {}) as RiscosRelatorioResultadoJson;
  return {
    id: String(row.id),
    campanha_id: String(row.campanha_id),
    cliente_id: row.cliente_id ? String(row.cliente_id) : null,
    codigo_publico: String(row.codigo_publico ?? ""),
    empresa_nome: String(row.empresa_nome ?? ""),
    gerado_em: String(row.gerado_em ?? ""),
    gerado_por: row.gerado_por ? String(row.gerado_por) : null,
    gerado_por_user_id: row.gerado_por_user_id
      ? String(row.gerado_por_user_id)
      : null,
    participantes: Number(row.participantes) || 0,
    respondentes: Number(row.respondentes) || 0,
    pendentes: Number(row.pendentes) || 0,
    taxa_participacao:
      row.taxa_participacao == null ? null : Number(row.taxa_participacao),
    resultado_json: json,
    status,
    pdf_url: row.pdf_url ? String(row.pdf_url) : null,
    relatorio_enviado_em: row.relatorio_enviado_em
      ? String(row.relatorio_enviado_em)
      : null,
    relatorio_enviado_email: row.relatorio_enviado_email
      ? String(row.relatorio_enviado_email)
      : null,
    relatorio_enviado_por: row.relatorio_enviado_por
      ? String(row.relatorio_enviado_por)
      : null,
    relatorio_enviado_por_user_id: row.relatorio_enviado_por_user_id
      ? String(row.relatorio_enviado_por_user_id)
      : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

async function listarStatusParticipantesAtivos(campanhaId: string) {
  const admin = createAdminClient();
  let { data, error } = await admin
    .from("riscos_campanha_participantes")
    .select("status, removido_em")
    .eq("campanha_id", campanhaId);

  if (error && /removido_em/i.test(error.message ?? "")) {
    const fb = await admin
      .from("riscos_campanha_participantes")
      .select("status")
      .eq("campanha_id", campanhaId)
      .neq("status", "removido");
    if (fb.error) throw fb.error;
    return (fb.data ?? []).map((r) => ({
      status: String((r as { status?: string }).status ?? "pendente"),
    }));
  }
  if (error) throw error;

  const out: Array<{ status: string }> = [];
  for (const row of data ?? []) {
    const status = String((row as { status?: string }).status ?? "pendente");
    const removidoEm = (row as { removido_em?: string | null }).removido_em;
    if (status === "removido" || status === "invalidado" || removidoEm) {
      continue;
    }
    out.push({ status });
  }
  return out;
}

export async function buscarRelatorioPorCampanhaId(
  campanhaId: string
): Promise<RiscosRelatorioRecord | null> {
  const id = campanhaId.trim();
  if (!id) return null;
  const admin = createAdminClient();
  let { data, error } = await admin
    .from("riscos_relatorios")
    .select(RELATORIO_SELECT)
    .eq("campanha_id", id)
    .maybeSingle();

  if (
    error &&
    (/relatorio_enviado_em/i.test(error.message ?? "") ||
      error.code === "42703")
  ) {
    const fb = await admin
      .from("riscos_relatorios")
      .select(RELATORIO_SELECT_LEGACY)
      .eq("campanha_id", id)
      .maybeSingle();
    data = fb.data as typeof data;
    error = fb.error;
  }

  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message ?? "")) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  return mapRelatorio(data as Record<string, unknown>);
}

/** Batch: campanha_id → metadados do relatório (listagem/progresso). */
export async function mapearRelatoriosMetaPorCampanhas(
  campanhaIds: string[]
): Promise<Map<string, RiscosRelatorioListagemMeta>> {
  const map = new Map<string, RiscosRelatorioListagemMeta>();
  const ids = Array.from(new Set(campanhaIds.filter(Boolean)));
  if (ids.length === 0) return map;

  const admin = createAdminClient();
  let { data, error } = await admin
    .from("riscos_relatorios")
    .select("campanha_id, gerado_em, relatorio_enviado_em")
    .in("campanha_id", ids);

  if (
    error &&
    (/relatorio_enviado_em/i.test(error.message ?? "") ||
      error.code === "42703")
  ) {
    const fb = await admin
      .from("riscos_relatorios")
      .select("campanha_id, gerado_em")
      .in("campanha_id", ids);
    data = fb.data as typeof data;
    error = fb.error;
  }

  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message ?? "")) {
      return map;
    }
    console.warn("[riscos_relatorios] listagem indisponível:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const cid = String((row as { campanha_id?: string }).campanha_id ?? "");
    if (!cid) continue;
    map.set(cid, {
      gerado_em: String((row as { gerado_em?: string }).gerado_em ?? ""),
      relatorio_enviado_em: (row as { relatorio_enviado_em?: string | null })
        .relatorio_enviado_em
        ? String(
            (row as { relatorio_enviado_em: string }).relatorio_enviado_em
          )
        : null,
    });
  }
  return map;
}

/** @deprecated Use mapearRelatoriosMetaPorCampanhas. */
export async function mapearRelatoriosExistentesPorCampanhas(
  campanhaIds: string[]
): Promise<Map<string, boolean>> {
  const meta = await mapearRelatoriosMetaPorCampanhas(campanhaIds);
  const map = new Map<string, boolean>();
  for (const id of Array.from(meta.keys())) map.set(id, true);
  return map;
}

async function buscarCampanhaBasica(campanhaId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("riscos_campanhas")
    .select(
      "id, cliente_id, orcamento_id, empresa_nome, codigo_publico, status, data_inicio, data_encerramento"
    )
    .eq("id", campanhaId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function persistirRelatorio(params: {
  campanhaId: string;
  substituir: boolean;
  auditContext?: AuditoriaUsuarioContext;
}): Promise<RiscosRelatorioRecord> {
  const campanha = await buscarCampanhaBasica(params.campanhaId);
  if (!campanha) throw new Error("Campanha/pesquisa não encontrada.");

  await assertProcessoRiscosNaoCanceladoNoServidor({
    orcamentoId: campanha.orcamento_id ? String(campanha.orcamento_id) : null,
    campanhaId: String(campanha.id),
  });

  const existente = await buscarRelatorioPorCampanhaId(params.campanhaId);
  const participantes = await listarStatusParticipantesAtivos(params.campanhaId);

  const bloqueio = validatePodeGerarRelatorioFinal({
    campanhaStatus: String(campanha.status ?? ""),
    participantesAtivos: participantes,
    jaExisteRelatorio: Boolean(existente) && !params.substituir,
  });
  if (bloqueio) throw new Error(bloqueio);

  const consolidado = await obterResultadosCampanhaRiscos(params.campanhaId);
  const resultado_json = montarResultadoJsonRelatorio({
    empresaNome: String(campanha.empresa_nome ?? ""),
    codigoPublico: String(campanha.codigo_publico ?? ""),
    dataInicio: String(campanha.data_inicio ?? "").slice(0, 10),
    dataEncerramento: String(campanha.data_encerramento ?? "").slice(0, 10),
    consolidado,
  });
  if (existente && params.substituir) {
    resultado_json.geracaoAnterior = {
      geradoEm: existente.gerado_em,
      geradoPor: existente.gerado_por,
      participantes: existente.participantes,
      respondentes: existente.respondentes,
    };
  }

  const geradoPor =
    params.auditContext?.usuarioNome?.trim() ||
    params.auditContext?.usuarioEmail?.trim() ||
    "Sistema";
  const agora = new Date().toISOString();

  const payload = {
    campanha_id: String(campanha.id),
    cliente_id: campanha.cliente_id ? String(campanha.cliente_id) : null,
    codigo_publico: String(campanha.codigo_publico ?? ""),
    empresa_nome: String(campanha.empresa_nome ?? ""),
    gerado_em: agora,
    gerado_por: geradoPor,
    gerado_por_user_id: params.auditContext?.usuarioId ?? null,
    participantes: resultado_json.capa.participantes,
    respondentes: resultado_json.capa.respondentes,
    pendentes: resultado_json.capa.pendentes,
    taxa_participacao: resultado_json.capa.taxaParticipacao,
    resultado_json,
    status: params.substituir ? ("substituido" as const) : ("gerado" as const),
    pdf_url: null,
    relatorio_enviado_em: null,
    relatorio_enviado_email: null,
    relatorio_enviado_por: null,
    relatorio_enviado_por_user_id: null,
  };

  const admin = createAdminClient();

  if (existente && params.substituir) {
    const { data, error } = await admin
      .from("riscos_relatorios")
      .update(payload)
      .eq("id", existente.id)
      .select(RELATORIO_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Não foi possível regenerar o relatório.");
    const record = mapRelatorio(data as Record<string, unknown>);
    await registrarAuditoria({
      usuarioId: params.auditContext?.usuarioId ?? null,
      usuarioNome: geradoPor,
      usuarioEmail: params.auditContext?.usuarioEmail ?? "",
      modulo: AUDITORIA_MODULOS.riscos_psicossociais,
      acao: AUDITORIA_ACOES.riscos_relatorio_regenerado,
      registroId: record.id,
      registroNome: record.codigo_publico,
      descricao: `${geradoPor} regenerou o relatório final da campanha ${record.codigo_publico}.`,
    dadosAntes: {
      gerado_em: existente.gerado_em,
      gerado_por: existente.gerado_por,
      participantes: existente.participantes,
      respondentes: existente.respondentes,
      status: existente.status,
      relatorio_enviado_em: existente.relatorio_enviado_em,
      relatorio_enviado_email: existente.relatorio_enviado_email,
      relatorio_enviado_por: existente.relatorio_enviado_por,
    },
    dadosDepois: {
        campanha_id: record.campanha_id,
        participantes: record.participantes,
        respondentes: record.respondentes,
        gerado_em: record.gerado_em,
        gerado_por: record.gerado_por,
        geracao_anterior_em: existente.gerado_em,
      },
    });
    await limparConclusaoProcessoRiscos(
      String(campanha.id),
      campanha.orcamento_id ? String(campanha.orcamento_id) : null
    );
    return record;
  }

  const { data, error } = await admin
    .from("riscos_relatorios")
    .insert(payload)
    .select(RELATORIO_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error(MSG_JA_EXISTE_SAFE());
    }
    throw error;
  }
  if (!data) throw new Error("Não foi possível gerar o relatório.");

  const record = mapRelatorio(data as Record<string, unknown>);
  await registrarAuditoria({
    usuarioId: params.auditContext?.usuarioId ?? null,
    usuarioNome: geradoPor,
    usuarioEmail: params.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_relatorio_gerado,
    registroId: record.id,
    registroNome: record.codigo_publico,
    descricao: `${geradoPor} gerou o relatório final da campanha ${record.codigo_publico}.`,
    dadosDepois: {
      campanha_id: record.campanha_id,
      participantes: record.participantes,
      respondentes: record.respondentes,
      taxa_participacao: record.taxa_participacao,
    },
  });
  return record;
}

function MSG_JA_EXISTE_SAFE() {
  return "Já existe um relatório para esta campanha. Use Visualizar ou Regenerar (admin).";
}

async function limparConclusaoProcessoRiscos(
  campanhaId: string,
  orcamentoId: string | null
) {
  const admin = createAdminClient();
  const patch = { concluido_em: null, status: "em_andamento" as const };
  if (orcamentoId) {
    await admin
      .from("orcamento_riscos_psicossociais")
      .update(patch)
      .eq("orcamento_id", orcamentoId);
  }
  await admin
    .from("riscos_campanha_fluxo")
    .update(patch)
    .eq("campanha_id", campanhaId);
}

async function marcarConclusaoProcessoRiscos(
  campanhaId: string,
  orcamentoId: string | null,
  concluidoEm: string
) {
  const admin = createAdminClient();
  const patch = { concluido_em: concluidoEm, status: "concluido" as const };
  if (orcamentoId) {
    await admin
      .from("orcamento_riscos_psicossociais")
      .update(patch)
      .eq("orcamento_id", orcamentoId);
  }
  await admin
    .from("riscos_campanha_fluxo")
    .update(patch)
    .eq("campanha_id", campanhaId);
}

async function persistirEnvioRelatorio(params: {
  campanhaId: string;
  email: string;
  substituir: boolean;
  origem?: "manual" | "resend";
  auditContext?: AuditoriaUsuarioContext;
}): Promise<RiscosRelatorioRecord> {
  const email = params.email.trim();
  if (!isEmailValido(email)) {
    throw new Error("Informe um e-mail válido para o envio do relatório.");
  }

  const campanha = await buscarCampanhaBasica(params.campanhaId);
  if (!campanha) throw new Error("Campanha/pesquisa não encontrada.");

  await assertProcessoRiscosNaoCanceladoNoServidor({
    orcamentoId: campanha.orcamento_id ? String(campanha.orcamento_id) : null,
    campanhaId: String(campanha.id),
  });

  const existente = await buscarRelatorioPorCampanhaId(params.campanhaId);
  if (!existente) {
    throw new Error("Gere o relatório antes de confirmar o envio.");
  }

  if (
    !params.substituir &&
    isRelatorioEnvioExplicitamenteConfirmado({
      relatorioEnviadoEm: existente.relatorio_enviado_em,
    })
  ) {
    throw new Error("O envio desta versão já foi confirmado.");
  }

  const confirmadoPor =
    params.auditContext?.usuarioNome?.trim() ||
    params.auditContext?.usuarioEmail?.trim() ||
    "Sistema";
  const agora = new Date().toISOString();

  const admin = createAdminClient();
  let query = admin
    .from("riscos_relatorios")
    .update({
      relatorio_enviado_em: agora,
      relatorio_enviado_email: email,
      relatorio_enviado_por: confirmadoPor,
      relatorio_enviado_por_user_id: params.auditContext?.usuarioId ?? null,
    })
    .eq("id", existente.id);

  if (!params.substituir) {
    query = query.is("relatorio_enviado_em", null);
  }

  const { data, error } = await query.select(RELATORIO_SELECT).maybeSingle();

  if (error) {
    if (/relatorio_enviado_em/i.test(error.message ?? "")) {
      throw new Error(
        "Confirmação de envio indisponível: aplique a migration 114_riscos_relatorio_envio no banco."
      );
    }
    throw error;
  }
  if (!data) {
    if (!params.substituir) {
      throw new Error("O envio desta versão já foi confirmado.");
    }
    throw new Error("Não foi possível registrar o envio do relatório.");
  }

  const record = mapRelatorio(data as Record<string, unknown>);
  await marcarConclusaoProcessoRiscos(
    String(campanha.id),
    campanha.orcamento_id ? String(campanha.orcamento_id) : null,
    agora
  );

  await registrarAuditoria({
    usuarioId: params.auditContext?.usuarioId ?? null,
    usuarioNome: confirmadoPor,
    usuarioEmail: params.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: params.substituir
      ? AUDITORIA_ACOES.riscos_relatorio_envio_corrigido
      : params.origem === "resend"
        ? AUDITORIA_ACOES.riscos_relatorio_envio_resend
        : AUDITORIA_ACOES.riscos_relatorio_envio_confirmado,
    registroId: record.id,
    registroNome: record.codigo_publico,
    descricao: params.substituir
      ? `${confirmadoPor} corrigiu o registro de envio do relatório ${record.codigo_publico}.`
      : params.origem === "resend"
        ? `${confirmadoPor} enviou o relatório ${record.codigo_publico} por e-mail para ${email}.`
        : `${confirmadoPor} confirmou o envio manual do relatório ${record.codigo_publico}.`,
    dadosAntes: params.substituir
      ? {
          relatorio_enviado_em: existente.relatorio_enviado_em,
          relatorio_enviado_email: existente.relatorio_enviado_email,
          relatorio_enviado_por: existente.relatorio_enviado_por,
        }
      : undefined,
    dadosDepois: {
      relatorio_enviado_em: record.relatorio_enviado_em,
      relatorio_enviado_email: record.relatorio_enviado_email,
      relatorio_enviado_por: record.relatorio_enviado_por,
    },
  });

  return record;
}

export async function confirmarEnvioRelatorioNoServidor(
  campanhaId: string,
  email: string,
  auditOptions?: {
    auditContext?: AuditoriaUsuarioContext;
    origem?: "manual" | "resend";
  }
): Promise<RiscosRelatorioRecord> {
  return persistirEnvioRelatorio({
    campanhaId: campanhaId.trim(),
    email,
    substituir: false,
    origem: auditOptions?.origem ?? "manual",
    auditContext: auditOptions?.auditContext,
  });
}

export async function corrigirEnvioRelatorioNoServidor(
  campanhaId: string,
  email: string,
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosRelatorioRecord> {
  return persistirEnvioRelatorio({
    campanhaId: campanhaId.trim(),
    email,
    substituir: true,
    auditContext: auditOptions?.auditContext,
  });
}

export async function gerarRelatorioFinalNoServidor(
  campanhaId: string,
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosRelatorioRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const campanha = await buscarCampanhaBasica(id);
  if (!campanha) throw new Error("Campanha/pesquisa não encontrada.");
  await assertProcessoRiscosNaoCanceladoNoServidor({
    orcamentoId: campanha.orcamento_id ? String(campanha.orcamento_id) : null,
    campanhaId: String(campanha.id),
  });

  const existente = await buscarRelatorioPorCampanhaId(id);
  if (existente) {
    // Idempotente: devolve o existente em vez de duplicar.
    return existente;
  }

  return persistirRelatorio({
    campanhaId: id,
    substituir: false,
    auditContext: auditOptions?.auditContext,
  });
}

export async function regenerarRelatorioFinalNoServidor(
  campanhaId: string,
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosRelatorioRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");
  const existente = await buscarRelatorioPorCampanhaId(id);
  if (!existente) {
    return persistirRelatorio({
      campanhaId: id,
      substituir: false,
      auditContext: auditOptions?.auditContext,
    });
  }
  return persistirRelatorio({
    campanhaId: id,
    substituir: true,
    auditContext: auditOptions?.auditContext,
  });
}
