import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  gerarCodigoPublicoCampanha,
  isRiscosCampanhaStatus,
  mapRiscosCampanhaRow,
  RISCOS_CAMPANHA_SELECT,
  RISCOS_CAMPANHA_SELECT_LEGACY,
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
  RISCOS_CAMPANHA_STATUS_PARA_PROGRESSO,
  escolherCampanhaParaProgresso,
  normalizeRiscosCampanhaOrigem,
} from "@/lib/riscos-campanha-origem";
import {
  CONTRATO_VIGENTE_RISCOS_ERROR_MESSAGE,
  clienteTemContratoVigente,
} from "@/lib/cliente-contrato-vigencia";
import { createClient } from "@/lib/supabase/client";
import { registrarAuditoria } from "@/services/auditoria.service";
import { listarContratosPorCliente } from "@/services/cliente-contrato.service";

const CAMPANHA_SELECT = RISCOS_CAMPANHA_SELECT;
const CAMPANHA_SELECT_LEGACY = RISCOS_CAMPANHA_SELECT_LEGACY;

type CampanhaAuditOptions = {
  auditContext?: AuditoriaUsuarioContext;
};

function mapCampanhaRow(row: Record<string, unknown>): RiscosCampanhaRecord {
  return mapRiscosCampanhaRow(row);
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
  let data: Array<Record<string, unknown>> | null = null;
  let error: { message?: string; code?: string } | null = null;

  const primary = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("orcamento_id", orcamentoId)
    .order("created_at", { ascending: false });
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
      .eq("orcamento_id", orcamentoId)
      .order("created_at", { ascending: false });
    data = (fb.data as Array<Record<string, unknown>> | null) ?? null;
    error = fb.error;
  }

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return null;
    }
    throw error;
  }
  if (!data?.length) return null;
  return escolherCampanhaParaProgresso(data.map(mapCampanhaRow));
}

/** Bloqueia nova criação: só campanha em_preparacao|aberta. */
export async function buscarCampanhaAtivaPorOrcamento(
  orcamentoId: string
): Promise<RiscosCampanhaRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("orcamento_id", orcamentoId)
    .in("status", [...RISCOS_CAMPANHA_STATUS_ATIVOS])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (
      /origem|responsavel|observacoes/i.test(error.message ?? "") ||
      error.code === "42703"
    ) {
      const fb = await supabase
        .from("riscos_campanhas")
        .select(CAMPANHA_SELECT_LEGACY)
        .eq("orcamento_id", orcamentoId)
        .in("status", [...RISCOS_CAMPANHA_STATUS_ATIVOS])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fb.error) {
        if (
          fb.error.code === "42P01" ||
          fb.error.message?.includes("does not exist")
        ) {
          return null;
        }
        throw fb.error;
      }
      if (!fb.data) return null;
      return mapCampanhaRow(fb.data as Record<string, unknown>);
    }
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  return mapCampanhaRow(data as Record<string, unknown>);
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

  const porOrcamento = new Map<string, RiscosCampanhaRecord[]>();
  for (const row of data ?? []) {
    const mapped = mapCampanhaRow(row);
    if (!mapped.orcamento_id) continue;
    const list = porOrcamento.get(mapped.orcamento_id) ?? [];
    list.push(mapped);
    porOrcamento.set(mapped.orcamento_id, list);
  }

  for (const [orcamentoId, camps] of Array.from(porOrcamento.entries())) {
    const escolhida = escolherCampanhaParaProgresso(camps);
    if (escolhida) map.set(orcamentoId, escolhida);
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
    .in("status", [...RISCOS_CAMPANHA_STATUS_PARA_PROGRESSO])
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

export async function buscarCampanhaPorId(
  campanhaId: string
): Promise<RiscosCampanhaRecord | null> {
  const id = campanhaId.trim();
  if (!id) return null;

  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(id)}`,
    { method: "GET", cache: "no-store" }
  );
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    campanha?: RiscosCampanhaRecord;
  };

  if (res.status === 404) return null;
  if (!res.ok || !json.ok || !json.campanha) {
    throw new Error(json.error || "Não foi possível carregar a campanha.");
  }
  return json.campanha;
}

/**
 * Fonte alinhada ao portal: mesma chave codigo_publico.
 * Uma única leitura autenticada (por-codigo) — não compara com /info
 * (evita falso positivo por cache CDN do GET público).
 */
export async function buscarCampanhaPorCodigoPublico(
  codigoPublico: string
): Promise<RiscosCampanhaRecord | null> {
  const codigo = codigoPublico.trim().toUpperCase();
  if (!codigo) return null;

  const adminRes = await fetch(
    `/api/riscos/campanha/por-codigo/${encodeURIComponent(codigo)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    }
  );

  const adminJson = (await adminRes.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    campanha?: RiscosCampanhaRecord;
  };

  if (adminRes.status === 404) return null;
  if (!adminRes.ok || !adminJson.ok || !adminJson.campanha) {
    throw new Error(adminJson.error || "Não foi possível carregar a campanha.");
  }

  // Substitui completamente — nunca preserva status antigo da listagem.
  return { ...adminJson.campanha };
}

export async function encerrarCampanhaRiscos(
  campanhaId: string,
  auditOptions?: CampanhaAuditOptions
): Promise<RiscosCampanhaRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(id)}/encerrar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    campanha?: RiscosCampanhaRecord;
  };

  if (!res.ok || !json.ok || !json.campanha) {
    throw new Error(json.error || "Não foi possível encerrar a pesquisa.");
  }

  if (json.campanha.status !== "encerrada") {
    throw new Error(
      "O encerramento não foi confirmado no banco. O status da campanha não foi alterado."
    );
  }

  return json.campanha;
}

export async function cancelarProcessoRiscos(
  campanhaId: string,
  motivo: string,
  auditOptions?: CampanhaAuditOptions
): Promise<RiscosCampanhaRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(id)}/cancelar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        motivo,
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    campanha?: RiscosCampanhaRecord;
  };

  if (!res.ok || !json.ok || !json.campanha) {
    throw new Error(json.error || "Não foi possível cancelar o processo.");
  }

  if (json.campanha.status !== "cancelada") {
    throw new Error(
      "O cancelamento não foi confirmado no banco. O status da campanha não foi alterado."
    );
  }

  return json.campanha;
}

export async function excluirCampanhaRiscos(
  campanhaId: string,
  confirmacaoCodigo: string,
  auditOptions?: CampanhaAuditOptions
): Promise<{ codigo_publico: string; empresa_nome: string }> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(id)}/excluir`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmacaoCodigo,
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    codigo_publico?: string;
    empresa_nome?: string;
  };

  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Não foi possível excluir a campanha.");
  }

  return {
    codigo_publico: String(json.codigo_publico ?? ""),
    empresa_nome: String(json.empresa_nome ?? ""),
  };
}

/** Remoção definitiva do processo (admin, produção). */
export async function removerProcessoRiscos(
  campanhaId: string,
  input: {
    confirmacaoCodigo: string;
    motivoOpcao: string;
    motivoOutro?: string;
  },
  auditOptions?: CampanhaAuditOptions
): Promise<{ codigo_publico: string; empresa_nome: string }> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(id)}/remover`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmacaoCodigo: input.confirmacaoCodigo,
        motivoOpcao: input.motivoOpcao,
        motivoOutro: input.motivoOutro,
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    codigo_publico?: string;
    empresa_nome?: string;
  };

  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Não foi possível remover o processo.");
  }

  return {
    codigo_publico: String(json.codigo_publico ?? ""),
    empresa_nome: String(json.empresa_nome ?? ""),
  };
}

/** UI: exclusão definitiva só em dev ou com flag pública espelhando o servidor. */
export function exclusaoDefinitivaDisponivelNoClient(): boolean {
  if (process.env.NEXT_PUBLIC_RISCOS_PERMITIR_EXCLUSAO_DEFINITIVA === "true") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
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

  const existente = await buscarCampanhaAtivaPorOrcamento(input.orcamentoId);
  if (existente) {
    throw new Error("Já existe uma campanha ativa para este processo.");
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
    // Coluna legada (check > 0). Quantidade oficial = participantes cadastrados.
    quantidade_prevista: 1,
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
  try {
    const { precarregarLogoEmpresaNaCampanha } = await import(
      "@/services/riscos-campanha-logo.service"
    );
    const withLogo = await precarregarLogoEmpresaNaCampanha(record);
    if (withLogo) {
      Object.assign(record, withLogo);
    }
  } catch (err) {
    console.warn("pré-carga de logo da campanha:", err);
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
    descricao: `${nome} criou a campanha ${record.codigo_publico} para ${record.empresa_nome}.`,
    dadosDepois: {
      codigo_publico: record.codigo_publico,
      data_inicio: record.data_inicio,
      data_encerramento: record.data_encerramento,
      quantidade_prevista: record.quantidade_prevista,
      status: record.status,
      orcamento_id: record.orcamento_id,
      origem: record.origem,
      logo_origem: record.logo_origem,
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

  const contratos = await listarContratosPorCliente(input.clienteId);
  if (!clienteTemContratoVigente(contratos)) {
    throw new Error(CONTRATO_VIGENTE_RISCOS_ERROR_MESSAGE);
  }

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
    // Coluna permanece no banco (check > 0); formulário manual não coleta mais.
    quantidade_prevista: 1,
    status: "em_preparacao" as const,
    codigo_publico: codigo,
    codigo_acesso_salt: acesso.salt,
    codigo_acesso_hash: acesso.hash,
    codigo_acesso_exibicao: acesso.exibicao,
    origem: RISCOS_CAMPANHA_ORIGEM.manual_cliente,
    responsavel: input.responsavel.trim(),
    observacoes: null,
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

  try {
    const { precarregarLogoEmpresaNaCampanha } = await import(
      "@/services/riscos-campanha-logo.service"
    );
    const withLogo = await precarregarLogoEmpresaNaCampanha(record);
    if (withLogo) {
      Object.assign(record, withLogo);
    }
  } catch (err) {
    console.warn("pré-carga de logo (manual):", err);
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
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const res = await fetch(
    `/api/riscos/campanha/${encodeURIComponent(id)}/abrir`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuarioNome: auditOptions?.auditContext?.usuarioNome,
        usuarioEmail: auditOptions?.auditContext?.usuarioEmail,
      }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    campanha?: RiscosCampanhaRecord;
  };

  if (!res.ok || !json.ok || !json.campanha) {
    throw new Error(json.error || "Não foi possível abrir a pesquisa.");
  }

  if (json.campanha.status !== "aberta") {
    throw new Error(
      "A abertura não foi confirmada no banco. O status da campanha não foi alterado."
    );
  }

  return json.campanha;
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
