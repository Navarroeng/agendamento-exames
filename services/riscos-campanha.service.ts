import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  gerarCodigoPublicoCampanha,
  isRiscosCampanhaStatus,
  validateAbrirCampanhaRiscos,
  validateEncerrarCampanhaRiscos,
  validateRiscosCampanhaCreateInput,
  validateRiscosCampanhaManualCreateInput,
  type RiscosCampanhaCreateInput,
  type RiscosCampanhaManualCreateInput,
  type RiscosCampanhaRecord,
  type RiscosCampanhaStatus,
} from "@/lib/riscos-campanha";
import {
  HISTORICO_CRIACAO_MANUAL,
  MSG_CAMPANHA_ATIVA_CLIENTE,
  RISCOS_CAMPANHA_ORIGEM,
  RISCOS_CAMPANHA_STATUS_ATIVOS,
  normalizeRiscosCampanhaOrigem,
} from "@/lib/riscos-campanha-origem";
import { isPerfilAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import { registrarAuditoria } from "@/services/auditoria.service";
import { buscarPerfilUsuarioLogado } from "@/services/perfil.service";

const CAMPANHA_SELECT =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, codigo_acesso_exibicao, origem, responsavel, observacoes, criado_por, created_at, updated_at";

const CAMPANHA_SELECT_LEGACY =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, codigo_acesso_exibicao, criado_por, created_at, updated_at";

type CampanhaAuditOptions = {
  auditContext?: AuditoriaUsuarioContext;
};

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
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

async function gerarCodigoAcessoViaApi(): Promise<{
  salt: string;
  hash: string;
  exibicao: string;
}> {
  const res = await fetch("/api/riscos/campanha/gerar-codigo-acesso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    salt?: string;
    hash?: string;
    exibicao?: string;
    error?: string;
  };
  if (
    !res.ok ||
    !json.ok ||
    !json.salt ||
    !json.hash ||
    !json.exibicao
  ) {
    throw new Error(
      json.error || "Não foi possível gerar o código de acesso da campanha."
    );
  }
  return {
    salt: json.salt,
    hash: json.hash,
    exibicao: json.exibicao,
  };
}

export async function buscarCampanhaPorOrcamento(
  orcamentoId: string
): Promise<RiscosCampanhaRecord | null> {
  const supabase = createClient();
  let data: Record<string, unknown> | null = null;
  let error: { message?: string; code?: string } | null = null;

  const primary = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("orcamento_id", orcamentoId)
    .maybeSingle();
  data = (primary.data as Record<string, unknown> | null) ?? null;
  error = primary.error;

  if (
    error &&
    (/origem|responsavel|observacoes/i.test(error.message ?? "") ||
      error.code === "42703")
  ) {
    const fb = await supabase
      .from("riscos_campanhas")
      .select(CAMPANHA_SELECT_LEGACY)
      .eq("orcamento_id", orcamentoId)
      .maybeSingle();
    data = (fb.data as Record<string, unknown> | null) ?? null;
    error = fb.error;
  }

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  return mapCampanhaRow(data);
}

export async function listarCampanhasPorOrcamentos(
  orcamentoIds: string[]
): Promise<Map<string, RiscosCampanhaRecord>> {
  const map = new Map<string, RiscosCampanhaRecord>();
  if (orcamentoIds.length === 0) return map;

  const supabase = createClient();
  let data: Array<Record<string, unknown>> | null = null;
  let error: { message?: string; code?: string } | null = null;

  const primary = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .in("orcamento_id", orcamentoIds);
  data = (primary.data as Array<Record<string, unknown>> | null) ?? null;
  error = primary.error;

  if (
    error &&
    (/origem|responsavel|observacoes/i.test(error.message ?? "") ||
      error.code === "42703")
  ) {
    const fb = await supabase
      .from("riscos_campanhas")
      .select(CAMPANHA_SELECT_LEGACY)
      .in("orcamento_id", orcamentoIds);
    data = (fb.data as Array<Record<string, unknown>> | null) ?? null;
    error = fb.error;
  }

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return map;
    }
    throw error;
  }

  for (const row of data ?? []) {
    const mapped = mapCampanhaRow(row);
    if (mapped.orcamento_id) {
      map.set(mapped.orcamento_id, mapped);
    }
  }
  return map;
}

export async function listarCampanhasManuaisAtivas(): Promise<
  RiscosCampanhaRecord[]
> {
  const supabase = createClient();
  let { data, error } = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("origem", RISCOS_CAMPANHA_ORIGEM.manual_cliente)
    .is("orcamento_id", null)
    .order("created_at", { ascending: false });

  if (
    error &&
    (/origem|responsavel|observacoes/i.test(error.message ?? "") ||
      error.code === "42703")
  ) {
    return [];
  }

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) =>
    mapCampanhaRow(row as Record<string, unknown>)
  );
}

export async function buscarCampanhaAtivaPorCliente(
  clienteId: string
): Promise<RiscosCampanhaRecord | null> {
  const id = clienteId.trim();
  if (!id) return null;

  const supabase = createClient();
  let data: Record<string, unknown> | null = null;
  let error: { message?: string; code?: string } | null = null;

  const primary = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("cliente_id", id)
    .in("status", [...RISCOS_CAMPANHA_STATUS_ATIVOS])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  data = (primary.data as Record<string, unknown> | null) ?? null;
  error = primary.error;

  if (
    error &&
    (/origem|responsavel|observacoes/i.test(error.message ?? "") ||
      error.code === "42703")
  ) {
    const fb = await supabase
      .from("riscos_campanhas")
      .select(CAMPANHA_SELECT_LEGACY)
      .eq("cliente_id", id)
      .in("status", [...RISCOS_CAMPANHA_STATUS_ATIVOS])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    data = (fb.data as Record<string, unknown> | null) ?? null;
    error = fb.error;
  }

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  return mapCampanhaRow(data);
}

async function gerarCodigoUnico(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const codigo = gerarCodigoPublicoCampanha(6);
    const { data, error } = await supabase
      .from("riscos_campanhas")
      .select("id")
      .eq("codigo_publico", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!data) return codigo;
  }
  throw new Error("Não foi possível gerar um código único para a campanha.");
}

export async function criarCampanhaRiscos(
  input: RiscosCampanhaCreateInput,
  auditOptions?: CampanhaAuditOptions
): Promise<RiscosCampanhaRecord> {
  const validationError = validateRiscosCampanhaCreateInput(input);
  if (validationError) throw new Error(validationError);

  const existente = await buscarCampanhaPorOrcamento(input.orcamentoId);
  if (existente) {
    throw new Error("Já existe uma campanha para este processo.");
  }

  const supabase = createClient();
  const codigo = await gerarCodigoUnico(supabase);
  const acesso = await gerarCodigoAcessoViaApi();
  const cnpjDigits = input.cnpj.replace(/\D/g, "");
  const usuarioNome = auditOptions?.auditContext?.usuarioNome?.trim() || null;

  const payload = {
    orcamento_id: input.orcamentoId,
    cliente_id: input.clienteId,
    cnpj: cnpjDigits,
    empresa_nome: input.empresaNome.trim(),
    data_inicio: input.dataInicioIso.slice(0, 10),
    data_encerramento: input.dataEncerramentoIso.slice(0, 10),
    quantidade_prevista: Math.trunc(Number(input.quantidadePrevista)),
    status: "em_preparacao" as const,
    codigo_publico: codigo,
    codigo_acesso_salt: acesso.salt,
    codigo_acesso_hash: acesso.hash,
    codigo_acesso_exibicao: acesso.exibicao,
    origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
    criado_por: usuarioNome,
  };

  const { data, error } = await supabase
    .from("riscos_campanhas")
    .insert(payload)
    .select(CAMPANHA_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe uma campanha para este processo.");
    }
    // Migration 100 ainda não aplicada: tenta sem colunas novas.
    if (
      /origem|responsavel|observacoes/i.test(error.message ?? "") ||
      error.code === "42703"
    ) {
      const { origem: _o, ...legacyPayload } = payload;
      void _o;
      const fb = await supabase
        .from("riscos_campanhas")
        .insert(legacyPayload)
        .select(CAMPANHA_SELECT_LEGACY)
        .maybeSingle();
      if (fb.error) {
        if (fb.error.code === "23505") {
          throw new Error("Já existe uma campanha para este processo.");
        }
        throw fb.error;
      }
      if (!fb.data) throw new Error("Não foi possível criar a campanha.");
      const recordLegacy = mapCampanhaRow(fb.data as Record<string, unknown>);
      const nomeLegacy = usuarioNome ?? "Sistema";
      await registrarAuditoria({
        usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
        usuarioNome: nomeLegacy,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
        modulo: AUDITORIA_MODULOS.riscos_psicossociais,
        acao: AUDITORIA_ACOES.riscos_campanha_criada,
        registroId: recordLegacy.id,
        registroNome: recordLegacy.empresa_nome,
        descricao: `${nomeLegacy} criou a campanha ${recordLegacy.codigo_publico} para ${recordLegacy.empresa_nome}.`,
        dadosDepois: {
          codigo_publico: recordLegacy.codigo_publico,
          origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
          orcamento_id: recordLegacy.orcamento_id,
        },
      });
      return recordLegacy;
    }
    throw error;
  }
  if (!data) {
    throw new Error("Não foi possível criar a campanha.");
  }

  const record = mapCampanhaRow(data as Record<string, unknown>);
  const nome = usuarioNome ?? "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_criada,
    registroId: record.id,
    registroNome: record.empresa_nome,
    descricao: `${nome} criou a campanha ${record.codigo_publico} para ${record.empresa_nome}.`,
    dadosDepois: {
      codigo_publico: record.codigo_publico,
      data_inicio: record.data_inicio,
      data_encerramento: record.data_encerramento,
      quantidade_prevista: record.quantidade_prevista,
      status: record.status,
      orcamento_id: record.orcamento_id,
      origem: record.origem,
    },
  });

  return record;
}

/**
 * Inclusão manual pelo cadastro do cliente (clientes antigos / fora do fluxo).
 * Não cria orçamento nem contrato fictícios.
 */
export async function criarCampanhaManualCliente(
  input: RiscosCampanhaManualCreateInput,
  auditOptions?: CampanhaAuditOptions
): Promise<RiscosCampanhaRecord> {
  const validationError = validateRiscosCampanhaManualCreateInput(input);
  if (validationError) throw new Error(validationError);

  const ativa = await buscarCampanhaAtivaPorCliente(input.clienteId);
  if (ativa) {
    throw new Error(MSG_CAMPANHA_ATIVA_CLIENTE);
  }

  const supabase = createClient();
  const codigo = await gerarCodigoUnico(supabase);
  const acesso = await gerarCodigoAcessoViaApi();
  const cnpjDigits = input.cnpj.replace(/\D/g, "");
  const usuarioNome = auditOptions?.auditContext?.usuarioNome?.trim() || null;
  const entradaEm = new Date().toISOString();

  const payload = {
    orcamento_id: null,
    cliente_id: input.clienteId,
    cnpj: cnpjDigits,
    empresa_nome: input.empresaNome.trim(),
    data_inicio: input.dataInicioIso.slice(0, 10),
    data_encerramento: input.dataEncerramentoIso.slice(0, 10),
    quantidade_prevista: Math.trunc(Number(input.quantidadePrevista)),
    status: "em_preparacao" as const,
    codigo_publico: codigo,
    codigo_acesso_salt: acesso.salt,
    codigo_acesso_hash: acesso.hash,
    codigo_acesso_exibicao: acesso.exibicao,
    origem: RISCOS_CAMPANHA_ORIGEM.manual_cliente,
    responsavel: input.responsavel.trim(),
    observacoes: input.observacoes?.trim() || null,
    criado_por: usuarioNome,
  };

  const { data, error } = await supabase
    .from("riscos_campanhas")
    .insert(payload)
    .select(CAMPANHA_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error(MSG_CAMPANHA_ATIVA_CLIENTE);
    }
    throw error;
  }
  if (!data) {
    throw new Error("Não foi possível criar a Pesquisa Psicossocial.");
  }

  const record = mapCampanhaRow(data as Record<string, unknown>);

  const { error: fluxoErr } = await supabase.from("riscos_campanha_fluxo").insert({
    campanha_id: record.id,
    etapa_atual: "lista_presenca",
    etapas_concluidas: 0,
    status: "em_andamento",
    entrada_em: entradaEm,
  });
  if (fluxoErr) {
    console.warn("falha ao criar fluxo manual da campanha:", fluxoErr.message);
  }

  const nome = usuarioNome ?? "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_criada,
    registroId: record.id,
    registroNome: record.empresa_nome,
    descricao: `${nome}: ${HISTORICO_CRIACAO_MANUAL} (${record.codigo_publico}).`,
    dadosDepois: {
      codigo_publico: record.codigo_publico,
      origem: RISCOS_CAMPANHA_ORIGEM.manual_cliente,
      cliente_id: record.cliente_id,
      responsavel: record.responsavel,
      data_inicio: record.data_inicio,
      data_encerramento: record.data_encerramento,
      quantidade_prevista: record.quantidade_prevista,
      orcamento_id: null,
    },
  });

  return record;
}

export async function abrirCampanhaRiscos(
  campanhaId: string,
  auditOptions?: CampanhaAuditOptions
): Promise<RiscosCampanhaRecord> {
  const perfil = await buscarPerfilUsuarioLogado();
  if (!isPerfilAdmin(perfil?.perfil)) {
    throw new Error("Somente administradores podem abrir a pesquisa.");
  }

  const supabase = createClient();
  const { data: atual, error: errAtual } = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("id", campanhaId)
    .maybeSingle();
  if (errAtual) throw errAtual;
  if (!atual) throw new Error("Campanha não encontrada.");

  const before = mapCampanhaRow(atual as Record<string, unknown>);
  const validacao = validateAbrirCampanhaRiscos(before);
  if (validacao) throw new Error(validacao);

  const { data, error } = await supabase
    .from("riscos_campanhas")
    .update({ status: "aberta" })
    .eq("id", campanhaId)
    .eq("status", "em_preparacao")
    .select(CAMPANHA_SELECT)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      "Não foi possível abrir a pesquisa. Verifique se ela ainda está em preparação."
    );
  }

  const record = mapCampanhaRow(data as Record<string, unknown>);
  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_aberta,
    registroId: record.id,
    registroNome: record.empresa_nome,
    descricao: `${nome} abriu a campanha ${record.codigo_publico} para respostas.`,
    dadosAntes: {
      status: before.status,
      codigo_publico: before.codigo_publico,
      data_inicio: before.data_inicio,
      data_encerramento: before.data_encerramento,
    },
    dadosDepois: {
      status: record.status,
      codigo_publico: record.codigo_publico,
      data_inicio: record.data_inicio,
      data_encerramento: record.data_encerramento,
      updated_at: record.updated_at ?? null,
    },
  });

  return record;
}

/**
 * Encerramento manual — estrutura preparada; implementação futura.
 * Não altera dados nesta etapa.
 */
export async function encerrarCampanhaRiscos(
  campanhaId: string,
  _auditOptions?: CampanhaAuditOptions
): Promise<RiscosCampanhaRecord> {
  const perfil = await buscarPerfilUsuarioLogado();
  if (!isPerfilAdmin(perfil?.perfil)) {
    throw new Error("Somente administradores podem encerrar a pesquisa.");
  }

  const supabase = createClient();
  const { data: atual, error } = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("id", campanhaId)
    .maybeSingle();
  if (error) throw error;
  if (!atual) throw new Error("Campanha não encontrada.");

  const record = mapCampanhaRow(atual as Record<string, unknown>);
  const validacao = validateEncerrarCampanhaRiscos(record);
  if (validacao) throw new Error(validacao);

  throw new Error(
    "O encerramento manual da pesquisa será disponibilizado em breve."
  );
}

export async function garantirCodigoAcessoCampanha(
  campanhaId: string,
  options?: { regenerar?: boolean }
): Promise<RiscosCampanhaRecord> {
  const supabase = createClient();
  const { data: atual, error: errAtual } = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("id", campanhaId)
    .maybeSingle();
  if (errAtual) throw errAtual;
  if (!atual) throw new Error("Campanha não encontrada.");

  const mapped = mapCampanhaRow(atual as Record<string, unknown>);
  if (mapped.codigo_acesso_exibicao && !options?.regenerar) return mapped;

  const res = await fetch("/api/riscos/campanha/gerar-codigo-acesso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campanhaId }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Falha ao gerar código de acesso.");
  }

  const { data, error } = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("id", campanhaId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Campanha não encontrada.");
  return mapCampanhaRow(data as Record<string, unknown>);
}
