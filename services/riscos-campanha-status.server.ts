import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  isRiscosCampanhaStatus,
  validateEncerrarCampanhaRiscos,
  type RiscosCampanhaRecord,
  type RiscosCampanhaStatus,
} from "@/lib/riscos-campanha";
import { normalizeRiscosCampanhaOrigem } from "@/lib/riscos-campanha-origem";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/services/auditoria.service";

const CAMPANHA_SELECT =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, codigo_acesso_exibicao, origem, responsavel, observacoes, criado_por, created_at, updated_at";

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
    /origem|responsavel|observacoes/i.test(error.message ?? "") ||
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

export async function selecionarCampanhaPorCodigoPublico(
  codigoPublico: string
): Promise<RiscosCampanhaRecord | null> {
  const codigo = codigoPublico.trim().toUpperCase();
  if (!codigo) return null;

  const admin = createAdminClient();
  const primary = await admin
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("codigo_publico", codigo)
    .maybeSingle();

  if (isMissingColumnError(primary.error)) {
    const fb = await admin
      .from("riscos_campanhas")
      .select(CAMPANHA_SELECT_LEGACY)
      .eq("codigo_publico", codigo)
      .maybeSingle();
    if (fb.error) throw fb.error;
    if (!fb.data) return null;
    return mapCampanhaRow(fb.data as Record<string, unknown>);
  }

  if (primary.error) throw primary.error;
  if (!primary.data) return null;
  return mapCampanhaRow(primary.data as Record<string, unknown>);
}

export async function encerrarCampanhaRiscosNoServidor(
  campanhaId: string,
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosCampanhaRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const before = await selecionarCampanhaPorId(id);
  if (!before) throw new Error("Campanha não encontrada.");

  if (before.status === "encerrada") {
    return before;
  }

  const validacao = validateEncerrarCampanhaRiscos(before);
  if (validacao) throw new Error(validacao);

  const admin = createAdminClient();
  const updatePrimary = await admin
    .from("riscos_campanhas")
    .update({ status: "encerrada" })
    .eq("id", id)
    .eq("status", "aberta")
    .select(CAMPANHA_SELECT)
    .maybeSingle();

  let updateError = updatePrimary.error;

  if (isMissingColumnError(updateError)) {
    const fb = await admin
      .from("riscos_campanhas")
      .update({ status: "encerrada" })
      .eq("id", id)
      .eq("status", "aberta")
      .select(CAMPANHA_SELECT_LEGACY)
      .maybeSingle();
    updateError = fb.error;
  }

  if (updateError) throw updateError;

  const confirmed = await selecionarCampanhaPorId(id);
  if (!confirmed || confirmed.status !== "encerrada") {
    throw new Error(
      `O encerramento não foi confirmado no banco (status atual: ${confirmed?.status ?? "desconhecido"}).`
    );
  }

  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_encerrada,
    registroId: confirmed.id,
    registroNome: confirmed.empresa_nome,
    descricao: `${nome} encerrou a campanha ${confirmed.codigo_publico}.`,
    dadosAntes: {
      status: before.status,
      codigo_publico: before.codigo_publico,
    },
    dadosDepois: {
      status: confirmed.status,
      codigo_publico: confirmed.codigo_publico,
      updated_at: confirmed.updated_at ?? null,
    },
  });

  return confirmed;
}
