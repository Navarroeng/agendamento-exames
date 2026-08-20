import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  mapRiscosCampanhaRow,
  RISCOS_CAMPANHA_SELECT,
  RISCOS_CAMPANHA_SELECT_LEGACY,
  validateAbrirCampanhaRiscos,
  type RiscosCampanhaRecord,
} from "@/lib/riscos-campanha";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/services/auditoria.service";
import { assertProcessoRiscosNaoCanceladoNoServidor } from "@/services/riscos-campanha-cancelar.server";

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

/** Garante que o status persistido no banco é aberta (fonte de verdade). */
export function assertStatusAbertaPersistido(
  campanha: Pick<RiscosCampanhaRecord, "status" | "codigo_publico"> | null
): asserts campanha is RiscosCampanhaRecord {
  if (!campanha) {
    throw new Error("Campanha não encontrada após a abertura.");
  }
  if (campanha.status !== "aberta") {
    throw new Error(
      `A abertura não foi confirmada no banco (status atual: ${campanha.status}). Tente novamente.`
    );
  }
}

/**
 * Abre a campanha no servidor (service role) e re-lê o registro.
 * Não altera a regra do portal — apenas persiste status=aberta com confirmação.
 */
export async function abrirCampanhaRiscosNoServidor(
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

  if (before.status === "aberta") {
    return before;
  }

  const validacao = validateAbrirCampanhaRiscos(before);
  if (validacao) throw new Error(validacao);

  const admin = createAdminClient();
  const updatePrimary = await admin
    .from("riscos_campanhas")
    .update({ status: "aberta" })
    .eq("id", id)
    .eq("status", "em_preparacao")
    .select(CAMPANHA_SELECT)
    .maybeSingle();

  let updateError = updatePrimary.error;
  let updateData = updatePrimary.data as Record<string, unknown> | null;

  if (isMissingColumnError(updateError)) {
    const fb = await admin
      .from("riscos_campanhas")
      .update({ status: "aberta" })
      .eq("id", id)
      .eq("status", "em_preparacao")
      .select(CAMPANHA_SELECT_LEGACY)
      .maybeSingle();
    updateError = fb.error;
    updateData = fb.data as Record<string, unknown> | null;
  }

  if (updateError) throw updateError;

  // Re-leitura obrigatória: nunca confiar só no retorno do UPDATE.
  const confirmed = await selecionarCampanhaPorId(id);
  assertStatusAbertaPersistido(confirmed);

  if (!updateData) {
    // UPDATE não retornou linha, mas a re-leitura confirmou aberta (ok).
    console.warn(
      "[abrirCampanhaRiscosNoServidor] UPDATE sem representação; status confirmado por re-leitura.",
      { campanhaId: id, codigo: confirmed.codigo_publico }
    );
  }

  const nome = auditOptions?.auditContext?.usuarioNome?.trim() || "Sistema";
  await registrarAuditoria({
    usuarioId: auditOptions?.auditContext?.usuarioId ?? null,
    usuarioNome: nome,
    usuarioEmail: auditOptions?.auditContext?.usuarioEmail ?? "",
    modulo: AUDITORIA_MODULOS.riscos_psicossociais,
    acao: AUDITORIA_ACOES.riscos_campanha_aberta,
    registroId: confirmed.id,
    registroNome: confirmed.empresa_nome,
    descricao: `${nome} abriu a campanha ${confirmed.codigo_publico} para respostas.`,
    dadosAntes: {
      status: before.status,
      codigo_publico: before.codigo_publico,
      data_inicio: before.data_inicio,
      data_encerramento: before.data_encerramento,
    },
    dadosDepois: {
      status: confirmed.status,
      codigo_publico: confirmed.codigo_publico,
      data_inicio: confirmed.data_inicio,
      data_encerramento: confirmed.data_encerramento,
      updated_at: confirmed.updated_at ?? null,
    },
  });

  return confirmed;
}
