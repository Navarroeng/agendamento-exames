import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  gerarCodigoPublicoCampanha,
  isRiscosCampanhaStatus,
  validateRiscosCampanhaCreateInput,
  type RiscosCampanhaCreateInput,
  type RiscosCampanhaRecord,
  type RiscosCampanhaStatus,
} from "@/lib/riscos-campanha";
import { createClient } from "@/lib/supabase/client";
import { registrarAuditoria } from "@/services/auditoria.service";

const CAMPANHA_SELECT =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, criado_por, created_at, updated_at";

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
    orcamento_id: String(row.orcamento_id),
    cliente_id: row.cliente_id ? String(row.cliente_id) : null,
    cnpj: String(row.cnpj ?? ""),
    empresa_nome: String(row.empresa_nome ?? ""),
    data_inicio: String(row.data_inicio ?? "").slice(0, 10),
    data_encerramento: String(row.data_encerramento ?? "").slice(0, 10),
    quantidade_prevista: Number(row.quantidade_prevista) || 0,
    status,
    codigo_publico: String(row.codigo_publico ?? ""),
    criado_por: row.criado_por ? String(row.criado_por) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function buscarCampanhaPorOrcamento(
  orcamentoId: string
): Promise<RiscosCampanhaRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("orcamento_id", orcamentoId)
    .maybeSingle();

  if (error) {
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
  const { data, error } = await supabase
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .in("orcamento_id", orcamentoIds);

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return map;
    }
    throw error;
  }

  for (const row of data ?? []) {
    const mapped = mapCampanhaRow(row as Record<string, unknown>);
    map.set(mapped.orcamento_id, mapped);
  }
  return map;
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
    },
  });

  return record;
}
