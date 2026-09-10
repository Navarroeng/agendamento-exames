/**
 * Portal — Laudos SST (server-only).
 * Isolamento por orcamentos.cliente_id + liberação envio_cliente.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  LAUDOS_SST_ANEXOS_BUCKET,
  isLaudosSstAnexoTipo,
  type LaudosSstAnexoTipo,
} from "@/lib/laudos-sst-anexos";
import type { OrcamentoLaudosSstRecord } from "@/lib/laudos-sst";
import {
  calcPortalLaudosSstResumo,
  extrairDocumentosPortalLaudosSst,
  laudosSstLiberadoAoPortal,
  type PortalLaudoDocumento,
  type PortalLaudosSstResumo,
} from "@/lib/portal-laudos-sst";

const TRACKING_SELECT = [
  "orcamento_id",
  "etapa_atual",
  "etapas_concluidas",
  "status",
  "enviado_cliente",
  "enviado_cliente_email",
  "enviado_cliente_data",
  "enviado_pedro",
  "pgr_realizado",
  "pgr_data",
  "pcmso_realizado",
  "pcmso_data",
  "ltcat_realizado",
  "ltcat_data",
  "aprovacao_pedro",
  "pgr_anexo_path",
  "pgr_anexo_nome",
  "pgr_anexo_tipo",
  "pgr_anexo_tamanho",
  "pcmso_anexo_path",
  "pcmso_anexo_nome",
  "pcmso_anexo_tipo",
  "pcmso_anexo_tamanho",
  "ltcat_anexo_path",
  "ltcat_anexo_nome",
  "ltcat_anexo_tipo",
  "ltcat_anexo_tamanho",
].join(", ");

async function listarOrcamentoIdsDoCliente(
  clienteId: string
): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orcamentos")
    .select("id")
    .eq("cliente_id", clienteId);

  if (error) throw error;
  return (data ?? [])
    .map((row) => String((row as { id?: string }).id ?? "").trim())
    .filter(Boolean);
}

export async function listarLaudosSstPortal(clienteId: string): Promise<{
  documentos: PortalLaudoDocumento[];
  resumo: PortalLaudosSstResumo;
}> {
  const orcamentoIds = await listarOrcamentoIdsDoCliente(clienteId);
  if (orcamentoIds.length === 0) {
    return { documentos: [], resumo: calcPortalLaudosSstResumo([]) };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orcamento_laudos_sst")
    .select(TRACKING_SELECT)
    .in("orcamento_id", orcamentoIds);

  if (error) throw error;

  const documentos: PortalLaudoDocumento[] = [];
  for (const row of data ?? []) {
    const tracking = row as unknown as OrcamentoLaudosSstRecord;
    documentos.push(...extrairDocumentosPortalLaudosSst(tracking));
  }

  documentos.sort((a, b) => {
    const da = a.dataIso ?? "";
    const db = b.dataIso ?? "";
    if (da !== db) return db.localeCompare(da);
    return a.tipoLabel.localeCompare(b.tipoLabel, "pt-BR");
  });

  return {
    documentos,
    resumo: calcPortalLaudosSstResumo(documentos),
  };
}

export async function obterUrlAnexoLaudoSstPortal(input: {
  clienteId: string;
  orcamentoId: string;
  tipo: string;
}): Promise<{ url: string; nomeArquivo: string } | null> {
  const orcamentoId = input.orcamentoId.trim();
  const clienteId = input.clienteId.trim();
  if (!orcamentoId || !clienteId) return null;
  if (!isLaudosSstAnexoTipo(input.tipo)) return null;
  const tipo = input.tipo as LaudosSstAnexoTipo;

  const admin = createAdminClient();

  const { data: orcamento, error: errOrc } = await admin
    .from("orcamentos")
    .select("id, cliente_id")
    .eq("id", orcamentoId)
    .maybeSingle();

  if (errOrc) throw errOrc;
  if (!orcamento) return null;
  if (String((orcamento as { cliente_id?: string }).cliente_id ?? "") !== clienteId) {
    return null;
  }

  const { data: trackingRow, error: errTrack } = await admin
    .from("orcamento_laudos_sst")
    .select(TRACKING_SELECT)
    .eq("orcamento_id", orcamentoId)
    .maybeSingle();

  if (errTrack) throw errTrack;
  if (!trackingRow) return null;

  const tracking = trackingRow as unknown as OrcamentoLaudosSstRecord;
  if (!laudosSstLiberadoAoPortal(tracking)) return null;

  const path =
    tipo === "pgr"
      ? tracking.pgr_anexo_path
      : tipo === "pcmso"
        ? tracking.pcmso_anexo_path
        : tracking.ltcat_anexo_path;
  const nome =
    tipo === "pgr"
      ? tracking.pgr_anexo_nome
      : tipo === "pcmso"
        ? tracking.pcmso_anexo_nome
        : tracking.ltcat_anexo_nome;

  const trimmed = path?.trim();
  if (!trimmed) return null;

  // Path must belong to this orçamento folder
  if (!trimmed.startsWith(`${orcamentoId}/`)) return null;

  const { data: signed, error: errSign } = await admin.storage
    .from(LAUDOS_SST_ANEXOS_BUCKET)
    .createSignedUrl(trimmed, 3600);

  if (errSign) throw errSign;
  if (!signed?.signedUrl) return null;

  return {
    url: signed.signedUrl,
    nomeArquivo: nome?.trim() || `${tipo}.pdf`,
  };
}
