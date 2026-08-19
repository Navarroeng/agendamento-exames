/**
 * Home do Portal do Cliente — somente server-side (service role).
 * Não consulta sessões, vínculos nem respostas.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  escolherCampanhaAtualPortal,
  montarPortalResumo,
  portalResumoVazio,
  resolvePortalDevClienteId,
  type PortalCampanhaFonte,
  type PortalParticipanteFonte,
  type PortalResumo,
  type PortalSnapshotFonte,
} from "@/lib/portal-cliente";
import type { RiscosRelatorioResultadoJson } from "@/lib/riscos-relatorio";

const CAMPANHA_SELECT =
  "id, empresa_nome, status, data_inicio, data_encerramento, created_at";

const PARTICIPANTE_SELECT = "nome_completo, status, removido_em";

const RELATORIO_SELECT = "gerado_em, resultado_json";

export type PortalHomeResultado = {
  habilitado: boolean;
  resumo: PortalResumo;
};

export async function carregarPortalHome(): Promise<PortalHomeResultado> {
  const clienteId = resolvePortalDevClienteId();
  if (!clienteId) {
    return { habilitado: false, resumo: portalResumoVazio() };
  }

  const admin = createAdminClient();

  const { data: campanhasRaw, error: campanhasError } = await admin
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("cliente_id", clienteId)
    .neq("status", "cancelada");

  if (campanhasError) throw campanhasError;

  const campanhas: PortalCampanhaFonte[] = (campanhasRaw ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    empresa_nome: String((row as { empresa_nome?: string }).empresa_nome ?? ""),
    status: String((row as { status?: string }).status ?? ""),
    data_inicio: String((row as { data_inicio?: string }).data_inicio ?? ""),
    data_encerramento: String(
      (row as { data_encerramento?: string }).data_encerramento ?? ""
    ),
    created_at: (row as { created_at?: string | null }).created_at ?? null,
  }));

  const campanha = escolherCampanhaAtualPortal(campanhas);
  if (!campanha) {
    return { habilitado: true, resumo: portalResumoVazio() };
  }

  const { data: participantesRaw, error: participantesError } = await admin
    .from("riscos_campanha_participantes")
    .select(PARTICIPANTE_SELECT)
    .eq("campanha_id", campanha.id);

  if (participantesError) throw participantesError;

  const participantes: PortalParticipanteFonte[] = (participantesRaw ?? []).map(
    (row) => ({
      nome_completo: String(
        (row as { nome_completo?: string }).nome_completo ?? ""
      ),
      status: String((row as { status?: string }).status ?? "pendente"),
      removido_em: (row as { removido_em?: string | null }).removido_em ?? null,
    })
  );

  const { data: relatorioRaw, error: relatorioError } = await admin
    .from("riscos_relatorios")
    .select(RELATORIO_SELECT)
    .eq("campanha_id", campanha.id)
    .maybeSingle();

  if (relatorioError) {
    if (
      relatorioError.code === "42P01" ||
      /does not exist/i.test(relatorioError.message ?? "")
    ) {
      return {
        habilitado: true,
        resumo: montarPortalResumo({
          campanha,
          participantes,
          snapshot: null,
        }),
      };
    }
    throw relatorioError;
  }

  let snapshot: PortalSnapshotFonte | null = null;
  if (relatorioRaw) {
    snapshot = {
      gerado_em: (relatorioRaw as { gerado_em?: string | null }).gerado_em
        ? String((relatorioRaw as { gerado_em: string }).gerado_em)
        : null,
      resultado_json: ((relatorioRaw as { resultado_json?: unknown })
        .resultado_json ?? null) as RiscosRelatorioResultadoJson | null,
    };
  }

  return {
    habilitado: true,
    resumo: montarPortalResumo({
      campanha,
      participantes,
      snapshot,
    }),
  };
}
