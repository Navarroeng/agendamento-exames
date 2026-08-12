import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  mapRiscosCampanhaRow,
  RISCOS_CAMPANHA_SELECT,
  RISCOS_CAMPANHA_SELECT_LEGACY,
  validateEncerrarCampanhaRiscos,
  type RiscosCampanhaRecord,
} from "@/lib/riscos-campanha";
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
