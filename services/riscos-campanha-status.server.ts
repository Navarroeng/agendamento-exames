import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  isRiscosCampanhaSelectSchemaError,
  mapRiscosCampanhaRow,
  RISCOS_CAMPANHA_SELECT,
  RISCOS_CAMPANHA_SELECT_LEGACY,
  RISCOS_CAMPANHA_SELECT_SEM_LOGO,
  validateEncerrarCampanhaRiscos,
  type RiscosCampanhaRecord,
} from "@/lib/riscos-campanha";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/services/auditoria.service";
import { assertProcessoRiscosNaoCanceladoNoServidor } from "@/services/riscos-campanha-cancelar.server";

const CAMPANHA_SELECT = RISCOS_CAMPANHA_SELECT;
const CAMPANHA_SELECT_SEM_LOGO = RISCOS_CAMPANHA_SELECT_SEM_LOGO;
const CAMPANHA_SELECT_LEGACY = RISCOS_CAMPANHA_SELECT_LEGACY;

function mapCampanhaRow(row: Record<string, unknown>): RiscosCampanhaRecord {
  return mapRiscosCampanhaRow(row);
}

async function selectCampanhaRow(
  build: (select: string) => Promise<{
    data: Record<string, unknown> | null;
    error: { message?: string; code?: string } | null;
  }>
): Promise<RiscosCampanhaRecord | null> {
  const primary = await build(CAMPANHA_SELECT);
  if (isRiscosCampanhaSelectSchemaError(primary.error)) {
    const semLogo = await build(CAMPANHA_SELECT_SEM_LOGO);
    if (isRiscosCampanhaSelectSchemaError(semLogo.error)) {
      const legacy = await build(CAMPANHA_SELECT_LEGACY);
      if (legacy.error) throw legacy.error;
      if (!legacy.data) return null;
      return mapCampanhaRow(legacy.data);
    }
    if (semLogo.error) throw semLogo.error;
    if (!semLogo.data) return null;
    return mapCampanhaRow(semLogo.data);
  }
  if (primary.error) throw primary.error;
  if (!primary.data) return null;
  return mapCampanhaRow(primary.data);
}

async function selecionarCampanhaPorId(
  campanhaId: string
): Promise<RiscosCampanhaRecord | null> {
  const admin = createAdminClient();
  return selectCampanhaRow(async (select) => {
    const res = await admin
      .from("riscos_campanhas")
      .select(select)
      .eq("id", campanhaId)
      .maybeSingle();
    return {
      data: (res.data as Record<string, unknown> | null) ?? null,
      error: res.error,
    };
  });
}

export async function selecionarCampanhaPorCodigoPublico(
  codigoPublico: string
): Promise<RiscosCampanhaRecord | null> {
  const codigo = codigoPublico.trim().toUpperCase();
  if (!codigo) return null;

  const admin = createAdminClient();
  return selectCampanhaRow(async (select) => {
    const res = await admin
      .from("riscos_campanhas")
      .select(select)
      .eq("codigo_publico", codigo)
      .maybeSingle();
    return {
      data: (res.data as Record<string, unknown> | null) ?? null,
      error: res.error,
    };
  });
}

export async function encerrarCampanhaRiscosNoServidor(
  campanhaId: string,
  auditOptions?: { auditContext?: AuditoriaUsuarioContext }
): Promise<RiscosCampanhaRecord> {
  const id = campanhaId.trim();
  if (!id) throw new Error("Campanha inválida.");

  const before = await selecionarCampanhaPorId(id);
  if (!before) throw new Error("Campanha não encontrada.");

  await assertProcessoRiscosNaoCanceladoNoServidor({
    orcamentoId: before.orcamento_id,
    campanhaId: before.id,
  });

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

  if (isRiscosCampanhaSelectSchemaError(updateError)) {
    const fb = await admin
      .from("riscos_campanhas")
      .update({ status: "encerrada" })
      .eq("id", id)
      .eq("status", "aberta")
      .select(CAMPANHA_SELECT_SEM_LOGO)
      .maybeSingle();
    updateError = fb.error;
    if (isRiscosCampanhaSelectSchemaError(updateError)) {
      const fbLegacy = await admin
        .from("riscos_campanhas")
        .update({ status: "encerrada" })
        .eq("id", id)
        .eq("status", "aberta")
        .select(CAMPANHA_SELECT_LEGACY)
        .maybeSingle();
      updateError = fbLegacy.error;
    }
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
