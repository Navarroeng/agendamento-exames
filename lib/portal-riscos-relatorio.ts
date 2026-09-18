/**
 * Autorização do PDF do relatório técnico no Portal.
 * Reutiliza o snapshot persistido — não recalcula COPSOQ e não duplica template.
 */

import {
  isPortalUuid,
  snapshotTemResultadoConsolidado,
} from "@/lib/portal-cliente";
import { relatorioLiberadoAoClientePortal } from "@/lib/riscos-relatorio-envio";
import type { RiscosRelatorioResultadoJson } from "@/lib/riscos-relatorio";

export type PortalRelatorioPdfCampanha = {
  id: string;
  cliente_id: string | null;
  empresa_nome?: string | null;
  status?: string | null;
};

export type PortalRelatorioPdfFonte = {
  id: string;
  campanha_id: string;
  cliente_id?: string | null;
  empresa_nome?: string | null;
  gerado_em?: string | null;
  relatorio_enviado_em?: string | null;
  resultado_json?: RiscosRelatorioResultadoJson | Record<string, unknown> | null;
};

export type PortalRelatorioPdfAutorizacao =
  | {
      ok: true;
      campanhaId: string;
      relatorioId: string;
      empresaNome: string;
      geradoEm: string | null;
    }
  | { ok: false; status: 400 | 404; error: string };

const NAO_ENCONTRADO = "Relatório não encontrado." as const;

export function autorizarDownloadRelatorioPortal(input: {
  campanhaId: string;
  clienteId: string;
  campanha: PortalRelatorioPdfCampanha | null;
  relatorio: PortalRelatorioPdfFonte | null;
}): PortalRelatorioPdfAutorizacao {
  const campanhaId = String(input.campanhaId ?? "").trim();
  const clienteId = String(input.clienteId ?? "").trim();
  if (!isPortalUuid(campanhaId) || !isPortalUuid(clienteId)) {
    return { ok: false, status: 400, error: "Parâmetros inválidos." };
  }

  const campanha = input.campanha;
  if (!campanha || campanha.id !== campanhaId) {
    return { ok: false, status: 404, error: NAO_ENCONTRADO };
  }
  if (String(campanha.cliente_id ?? "").trim() !== clienteId) {
    return { ok: false, status: 404, error: NAO_ENCONTRADO };
  }
  if (String(campanha.status ?? "").trim() === "cancelada") {
    return { ok: false, status: 404, error: NAO_ENCONTRADO };
  }

  const relatorio = input.relatorio;
  if (!relatorio || !relatorio.id || relatorio.campanha_id !== campanhaId) {
    return { ok: false, status: 404, error: NAO_ENCONTRADO };
  }
  const relCliente = String(relatorio.cliente_id ?? "").trim();
  if (relCliente && relCliente !== clienteId) {
    return { ok: false, status: 404, error: NAO_ENCONTRADO };
  }

  const liberado = relatorioLiberadoAoClientePortal({
    temSnapshot: snapshotTemResultadoConsolidado(relatorio.resultado_json),
    relatorioGeradoEm: relatorio.gerado_em,
    relatorioEnviadoEm: relatorio.relatorio_enviado_em,
  });
  if (!liberado) {
    return { ok: false, status: 404, error: NAO_ENCONTRADO };
  }

  return {
    ok: true,
    campanhaId,
    relatorioId: relatorio.id,
    empresaNome:
      String(relatorio.empresa_nome ?? "").trim() ||
      String(campanha.empresa_nome ?? "").trim() ||
      "Empresa",
    geradoEm: String(relatorio.gerado_em ?? "").trim() || null,
  };
}
