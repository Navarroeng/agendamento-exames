import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { normalizeCpfDigits } from "@/lib/cpf";
import {
  gerarCodigoAcessoParticipante,
  isRiscosParticipanteStatus,
  validateRiscosParticipanteInput,
  type RiscosCampanhaParticipanteRecord,
  type RiscosParticipanteInput,
  type RiscosParticipanteOrigem,
  type RiscosParticipanteStatus,
} from "@/lib/riscos-campanha-participantes";
import { createClient } from "@/lib/supabase/client";
import { registrarAuditoria } from "@/services/auditoria.service";
import { buscarCampanhaPorOrcamento } from "@/services/riscos-campanha.service";

const PARTICIPANTE_SELECT =
  "id, campanha_id, orcamento_id, cliente_id, nome_completo, cpf, cargo, setor, email, status, codigo_acesso, origem, criado_por, created_at, updated_at";

type AuditOptions = { auditContext?: AuditoriaUsuarioContext };

function mapParticipante(
  row: Record<string, unknown>
): RiscosCampanhaParticipanteRecord {
  const statusRaw = String(row.status ?? "pendente");
  const status: RiscosParticipanteStatus = isRiscosParticipanteStatus(statusRaw)
    ? statusRaw
    : "pendente";
  const origemRaw = String(row.origem ?? "manual");
  const origem: RiscosParticipanteOrigem =
    origemRaw === "importacao" ? "importacao" : "manual";

  return {
    id: String(row.id),
    campanha_id: String(row.campanha_id),
    orcamento_id: String(row.orcamento_id),
    cliente_id: row.cliente_id ? String(row.cliente_id) : null,
    nome_completo: String(row.nome_completo ?? ""),
    cpf: String(row.cpf ?? ""),
    cargo: row.cargo ? String(row.cargo) : null,
    setor: row.setor ? String(row.setor) : null,
    email: row.email ? String(row.email) : null,
    status,
    codigo_acesso: String(row.codigo_acesso ?? ""),
    origem,
    criado_por: row.criado_por ? String(row.criado_por) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

async function gerarCodigoAcessoUnico(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  for (let i = 0; i < 12; i += 1) {
    const codigo = gerarCodigoAcessoParticipante(8);
    const { data, error } = await supabase
      .from("riscos_campanha_participantes")
      .select("id")
      .eq("codigo_acesso", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!data) return codigo;
  }
  throw new Error("Não foi possível gerar o identificador do participante.");
}

export async function listarParticipantesCampanha(
  campanhaId: string
): Promise<RiscosCampanhaParticipanteRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("riscos_campanha_participantes")
    .select(PARTICIPANTE_SELECT)
    .eq("campanha_id", campanhaId)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) =>
    mapParticipante(row as Record<string, unknown>)
  );
}

export async function criarParticipanteCampanha(
  params: {
    campanhaId: string;
    input: RiscosParticipanteInput;
  },
  auditOptions?: AuditOptions
): Promise<RiscosCampanhaParticipanteRecord> {
  const validationError = validateRiscosParticipanteInput(params.input);
  if (validationError) throw new Error(validationError);

  const campanha = await buscarCampanhaPorId(params.campanhaId);
  if (!campanha) throw new Error("Campanha/pesquisa não encontrada.");

  const cpf = normalizeCpfDigits(params.input.cpf);
  const supabase = createClient();

  const { data: duplicado, error: dupErr } = await supabase
    .from("riscos_campanha_participantes")
    .select("id")
    .eq("campanha_id", params.campanhaId)
    .eq("cpf", cpf)
    .maybeSingle();
  if (dupErr) throw dupErr;
  if (duplicado) {
    throw new Error("Já existe um participante com este CPF nesta pesquisa.");
  }

  const codigo = await gerarCodigoAcessoUnico(supabase);
  const usuarioNome = auditOptions?.auditContext?.usuarioNome?.trim() || null;

  const { data, error } = await supabase
    .from("riscos_campanha_participantes")
    .insert({
      campanha_id: campanha.id,
      orcamento_id: campanha.orcamento_id,
      cliente_id: campanha.cliente_id,
      nome_completo: params.input.nomeCompleto.trim(),
      cpf,
      cargo: params.input.cargo?.trim() || null,
      setor: params.input.setor?.trim() || null,
      email: params.input.email?.trim() || null,
      status: "pendente",
      codigo_acesso: codigo,
      origem: "manual",
      criado_por: usuarioNome,
    })
    .select(PARTICIPANTE_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um participante com este CPF nesta pesquisa.");
    }
    throw error;
  }
  if (!data) throw new Error("Não foi possível cadastrar o participante.");

  const record = mapParticipante(data as Record<string, unknown>);
  const nome = usuarioNome ?? "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_participante_criado,
    registroId: record.id,
    registroNome: record.nome_completo,
    descricao: `${nome} cadastrou o participante ${record.nome_completo} na pesquisa ${campanha.codigo_publico}.`,
    dadosDepois: {
      campanha_id: record.campanha_id,
      cpf: record.cpf,
      status: record.status,
      codigo_acesso: record.codigo_acesso,
    },
  });

  return record;
}

export async function atualizarParticipanteCampanha(
  params: {
    participanteId: string;
    input: RiscosParticipanteInput;
  },
  auditOptions?: AuditOptions
): Promise<RiscosCampanhaParticipanteRecord> {
  const validationError = validateRiscosParticipanteInput(params.input);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const { data: atual, error: findErr } = await supabase
    .from("riscos_campanha_participantes")
    .select(PARTICIPANTE_SELECT)
    .eq("id", params.participanteId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!atual) throw new Error("Participante não encontrado.");

  const before = mapParticipante(atual as Record<string, unknown>);
  const cpf = normalizeCpfDigits(params.input.cpf);

  if (cpf !== before.cpf) {
    const { data: duplicado, error: dupErr } = await supabase
      .from("riscos_campanha_participantes")
      .select("id")
      .eq("campanha_id", before.campanha_id)
      .eq("cpf", cpf)
      .neq("id", before.id)
      .maybeSingle();
    if (dupErr) throw dupErr;
    if (duplicado) {
      throw new Error("Já existe um participante com este CPF nesta pesquisa.");
    }
  }

  const { data, error } = await supabase
    .from("riscos_campanha_participantes")
    .update({
      nome_completo: params.input.nomeCompleto.trim(),
      cpf,
      cargo: params.input.cargo?.trim() || null,
      setor: params.input.setor?.trim() || null,
      email: params.input.email?.trim() || null,
    })
    .eq("id", params.participanteId)
    .select(PARTICIPANTE_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um participante com este CPF nesta pesquisa.");
    }
    throw error;
  }
  if (!data) throw new Error("Não foi possível atualizar o participante.");

  const record = mapParticipante(data as Record<string, unknown>);
  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_participante_editado,
    registroId: record.id,
    registroNome: record.nome_completo,
    descricao: `${nome} editou o participante ${record.nome_completo}.`,
    dadosAntes: {
      nome_completo: before.nome_completo,
      cpf: before.cpf,
      cargo: before.cargo,
      setor: before.setor,
      email: before.email,
    },
    dadosDepois: {
      nome_completo: record.nome_completo,
      cpf: record.cpf,
      cargo: record.cargo,
      setor: record.setor,
      email: record.email,
    },
  });

  return record;
}

export async function removerParticipanteCampanha(
  participanteId: string,
  auditOptions?: AuditOptions
): Promise<void> {
  const supabase = createClient();
  const { data: atual, error: findErr } = await supabase
    .from("riscos_campanha_participantes")
    .select(PARTICIPANTE_SELECT)
    .eq("id", participanteId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!atual) throw new Error("Participante não encontrado.");

  const before = mapParticipante(atual as Record<string, unknown>);
  const { error } = await supabase
    .from("riscos_campanha_participantes")
    .delete()
    .eq("id", participanteId);
  if (error) throw error;

  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_participante_removido,
    registroId: before.id,
    registroNome: before.nome_completo,
    descricao: `${nome} removeu o participante ${before.nome_completo}.`,
    dadosAntes: {
      campanha_id: before.campanha_id,
      cpf: before.cpf,
      status: before.status,
    },
  });
}

async function buscarCampanhaPorId(campanhaId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("riscos_campanhas")
    .select(
      "id, orcamento_id, cliente_id, cnpj, empresa_nome, codigo_publico, quantidade_prevista"
    )
    .eq("id", campanhaId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Reexport útil para o fluxo por orçamento. */
export { buscarCampanhaPorOrcamento };
