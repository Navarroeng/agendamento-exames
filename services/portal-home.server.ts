/**
 * Home do Portal do Cliente — somente server-side (service role).
 * Não consulta sessões, vínculos nem respostas.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  consolidarEmpresasPortalPreview,
  escolherCampanhaAtualPortal,
  montarHistoricoRiscosPortal,
  montarPortalResumo,
  portalResumoVazio,
  type PortalCampanhaFonte,
  type PortalEmpresaOpcao,
  type PortalHistoricoSnapshotFonte,
  type PortalParticipanteFonte,
  type PortalResumo,
  type PortalSnapshotFonte,
} from "@/lib/portal-cliente";
import {
  montarPortalContratoResumo,
  PORTAL_CONTRATO_SELECT,
  type PortalClienteContratoFonte,
  type PortalContratoFonte,
} from "@/lib/portal-contrato";
import type { RiscosRelatorioResultadoJson } from "@/lib/riscos-relatorio";
import { resolverUrlLogoCampanhaAdmin } from "@/services/riscos-campanha-logo.server";

const CAMPANHA_SELECT =
  "id, cliente_id, empresa_nome, status, data_inicio, data_encerramento, created_at, logo_storage_path, orcamento_id, cnpj";

const PARTICIPANTE_SELECT = "nome_completo, status, removido_em";

const RELATORIO_SELECT =
  "campanha_id, cliente_id, gerado_em, relatorio_enviado_em, resultado_json";

const CAMPANHA_LISTA_SELECT = "cliente_id, empresa_nome, status";

export type PortalHomeResultado = {
  resumo: PortalResumo;
};

function mapCampanhas(
  rows: Array<Record<string, unknown>> | null
): PortalCampanhaFonte[] {
  return (rows ?? []).map((row) => ({
    id: String(row.id ?? ""),
    empresa_nome: String(row.empresa_nome ?? ""),
    status: String(row.status ?? ""),
    data_inicio: String(row.data_inicio ?? ""),
    data_encerramento: String(row.data_encerramento ?? ""),
    created_at: row.created_at ? String(row.created_at) : null,
    cnpj: row.cnpj ? String(row.cnpj) : null,
  }));
}

type CampanhaLogoRow = {
  logo_storage_path?: string | null;
  orcamento_id?: string | null;
  cliente_id?: string | null;
};

export async function listarEmpresasPortalPreview(): Promise<
  PortalEmpresaOpcao[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("riscos_campanhas")
    .select(CAMPANHA_LISTA_SELECT)
    .not("cliente_id", "is", null);

  if (error) throw error;

  const campanhas = (data ?? []) as Array<{
    cliente_id: string | null;
    empresa_nome: string | null;
    status: string | null;
  }>;
  const ids = Array.from(
    new Set(
      campanhas
        .map((c) => String(c.cliente_id ?? "").trim())
        .filter(Boolean)
    )
  );

  let clientes: Array<{ id: string; nome: string | null }> = [];
  if (ids.length > 0) {
    const cli = await admin.from("clientes").select("id, nome").in("id", ids);
    if (cli.error) throw cli.error;
    clientes = (cli.data ?? []) as Array<{ id: string; nome: string | null }>;
  }

  return consolidarEmpresasPortalPreview(campanhas, clientes);
}

export async function carregarPortalHome(
  clienteId: string
): Promise<PortalHomeResultado> {
  const admin = createAdminClient();

  const { data: campanhasRaw, error: campanhasError } = await admin
    .from("riscos_campanhas")
    .select(CAMPANHA_SELECT)
    .eq("cliente_id", clienteId)
    .neq("status", "cancelada");

  if (campanhasError) throw campanhasError;

  const campanhas = mapCampanhas(
    (campanhasRaw ?? []) as Array<Record<string, unknown>>
  );
  const campanha = escolherCampanhaAtualPortal(campanhas);
  const campanhaLogoRow = campanhasRaw?.find(
    (row) => String((row as { id?: string }).id ?? "") === campanha?.id
  ) as CampanhaLogoRow | undefined;

  if (!campanha) {
    const cliente = await admin
      .from("clientes")
      .select("nome")
      .eq("id", clienteId)
      .maybeSingle();
    const vazio = portalResumoVazio();
    const nome = String(
      (cliente.data as { nome?: string } | null)?.nome ?? ""
    ).trim();
    const contrato = await carregarPortalContrato(admin, clienteId);
    return {
      resumo: {
        ...vazio,
        empresaNome: nome || null,
        contrato,
      },
    };
  }

  const logoUrl = await resolverUrlLogoCampanhaAdmin({
    logo_storage_path: campanhaLogoRow?.logo_storage_path ?? null,
    orcamento_id: campanhaLogoRow?.orcamento_id ?? null,
    cliente_id: clienteId,
  });

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

  const campanhaIds = campanhas.map((c) => c.id).filter(Boolean);
  const snapshots = await carregarSnapshotsPortal(admin, campanhaIds);
  const historicoRiscos = montarHistoricoRiscosPortal({
    clienteId,
    campanhas,
    snapshots,
  });
  const snapshotAtual = snapshots.find((s) => s.campanha_id === campanha.id);
  const snapshot: PortalSnapshotFonte | null = snapshotAtual?.resultado_json
    ? {
        gerado_em: snapshotAtual.gerado_em ?? null,
        relatorio_enviado_em: snapshotAtual.relatorio_enviado_em ?? null,
        resultado_json: snapshotAtual.resultado_json,
      }
    : null;

  return {
    resumo: {
      ...montarPortalResumo({
        campanha,
        participantes,
        snapshot,
        logoUrl,
        historicoRiscos,
      }),
      contrato: await carregarPortalContrato(admin, clienteId),
    },
  };
}

async function carregarPortalContrato(
  admin: ReturnType<typeof createAdminClient>,
  clienteId: string
) {
  const { data: clienteRaw, error: clienteError } = await admin
    .from("clientes")
    .select(
      "id, procuracao, disponivel_agendamento, agendamento_bloqueio_manual"
    )
    .eq("id", clienteId)
    .maybeSingle();

  if (clienteError) throw clienteError;

  const { data: contratosRaw, error: contratosError } = await admin
    .from("cliente_contratos")
    .select(PORTAL_CONTRATO_SELECT)
    .eq("cliente_id", clienteId)
    .order("aprovado_em", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("data_inicio", { ascending: false });

  if (contratosError) throw contratosError;

  return montarPortalContratoResumo({
    clienteId,
    cliente: (clienteRaw ?? null) as PortalClienteContratoFonte | null,
    contratos: (contratosRaw ?? []) as unknown as PortalContratoFonte[],
  });
}

async function carregarSnapshotsPortal(
  admin: ReturnType<typeof createAdminClient>,
  campanhaIds: string[]
): Promise<PortalHistoricoSnapshotFonte[]> {
  if (campanhaIds.length === 0) return [];
  const { data, error } = await admin
    .from("riscos_relatorios")
    .select(RELATORIO_SELECT)
    .in("campanha_id", campanhaIds);

  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => ({
    campanha_id: String((row as { campanha_id?: string }).campanha_id ?? ""),
    cliente_id: (row as { cliente_id?: string | null }).cliente_id ?? null,
    gerado_em: (row as { gerado_em?: string | null }).gerado_em
      ? String((row as { gerado_em: string }).gerado_em)
      : null,
    relatorio_enviado_em: (row as { relatorio_enviado_em?: string | null })
      .relatorio_enviado_em
      ? String((row as { relatorio_enviado_em: string }).relatorio_enviado_em)
      : null,
    resultado_json: ((row as { resultado_json?: unknown }).resultado_json ??
      null) as RiscosRelatorioResultadoJson | null,
  }));
}
