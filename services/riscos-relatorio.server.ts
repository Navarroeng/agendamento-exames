import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  montarResultadoJsonRelatorio,
  validatePodeGerarRelatorioFinal,
  type RiscosRelatorioRecord,
  type RiscosRelatorioResultadoJson,
  type RiscosRelatorioStatus,
} from "@/lib/riscos-relatorio";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/services/auditoria.service";
import { obterResultadosCampanhaRiscos } from "@/services/riscos-resultados.service";

const RELATORIO_SELECT =
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
  const { data, error } = await admin
    .from("riscos_relatorios")
    .select(RELATORIO_SELECT)
    .eq("campanha_id", id)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message ?? "")) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  return mapRelatorio(data as Record<string, unknown>);
}

/** Batch: campanha_id → existe relatório. */
export async function mapearRelatoriosExistentesPorCampanhas(
  campanhaIds: string[]
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  const ids = Array.from(new Set(campanhaIds.filter(Boolean)));
  if (ids.length === 0) return map;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("riscos_relatorios")
    .select("campanha_id")
    .in("campanha_id", ids);

  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message ?? "")) {
      return map;
    }
    console.warn("[riscos_relatorios] listagem indisponível:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const cid = String((row as { campanha_id?: string }).campanha_id ?? "");
    if (cid) map.set(cid, true);
  }
  return map;
}

async function buscarCampanhaBasica(campanhaId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("riscos_campanhas")
    .select(
      "id, cliente_id, empresa_nome, codigo_publico, status, data_inicio, data_encerramento"
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
      dadosDepois: {
        campanha_id: record.campanha_id,
        participantes: record.participantes,
        respondentes: record.respondentes,
      },
    });
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

export async function gerarRelatorioFinalNoServidor(
  campanhaId: string,
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosRelatorioRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

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
