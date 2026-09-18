/**
 * PDF do relatório técnico no Portal — mesmo RelatorioDocumento da área administrativa.
 */

import { autorizarDownloadRelatorioPortal } from "@/lib/portal-riscos-relatorio";
import { nomeArquivoPdfRelatorioRiscos } from "@/lib/riscos-relatorio-pdf";
import {
  gerarPdfRelatorioRiscosBuffer,
  resolveAppBaseUrl,
} from "@/lib/riscos-relatorio-pdf-server";
import { criarRelatorioPrintToken } from "@/lib/riscos-relatorio-print-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { buscarRelatorioPorCampanhaId } from "@/services/riscos-relatorio.server";

export type PortalPdfRelatorioResultado =
  | { ok: true; buffer: Buffer; filename: string }
  | { ok: false; status: number; error: string };

export async function gerarPdfRelatorioPortalCliente(input: {
  clienteId: string;
  campanhaId: string;
  request: Request;
}): Promise<PortalPdfRelatorioResultado> {
  const admin = createAdminClient();
  const { data: campanha, error } = await admin
    .from("riscos_campanhas")
    .select("id, cliente_id, empresa_nome, status")
    .eq("id", input.campanhaId)
    .maybeSingle();

  if (error) throw error;

  const relatorio = await buscarRelatorioPorCampanhaId(input.campanhaId);
  const authz = autorizarDownloadRelatorioPortal({
    campanhaId: input.campanhaId,
    clienteId: input.clienteId,
    campanha: campanha
      ? {
          id: String((campanha as { id?: string }).id ?? ""),
          cliente_id:
            (campanha as { cliente_id?: string | null }).cliente_id ?? null,
          empresa_nome:
            (campanha as { empresa_nome?: string | null }).empresa_nome ?? null,
          status: (campanha as { status?: string | null }).status ?? null,
        }
      : null,
    relatorio,
  });

  if (!authz.ok) {
    return { ok: false, status: authz.status, error: authz.error };
  }

  const token = criarRelatorioPrintToken({
    campanhaId: authz.campanhaId,
    relatorioId: authz.relatorioId,
  });
  const buffer = await gerarPdfRelatorioRiscosBuffer({
    baseUrl: resolveAppBaseUrl(input.request),
    token,
  });

  return {
    ok: true,
    buffer,
    filename: nomeArquivoPdfRelatorioRiscos(
      authz.empresaNome,
      authz.geradoEm ?? new Date()
    ),
  };
}
