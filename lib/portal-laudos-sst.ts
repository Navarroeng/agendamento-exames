/**
 * Portal do Cliente — módulo Laudos SST.
 * Só documentos liberados após etapa "Envio para o cliente".
 */

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  laudoAnexoLabel,
  type LaudosSstAnexoTipo,
} from "@/lib/laudos-sst-anexos";
import {
  isLaudosEtapaConcluida,
  type LaudosSstWorkflow,
} from "@/lib/laudos-sst-etapas";
import { mapLaudosWorkflowFromRecord } from "@/lib/laudos-sst";
import type { OrcamentoLaudosSstRecord } from "@/lib/laudos-sst";

export type PortalLaudoDocumentoTipo = LaudosSstAnexoTipo;

export type PortalLaudoDocumento = {
  id: string;
  orcamentoId: string;
  tipo: PortalLaudoDocumentoTipo;
  tipoLabel: string;
  nomeArquivo: string;
  dataIso: string | null;
  dataLabel: string;
  tamanho: number;
};

export type PortalLaudosSstResumo = {
  totalDocumentos: number;
  temDocumentos: boolean;
  linhaResumo: string;
  /** Labels únicos dos tipos presentes (ex.: PGR, PCMSO), na ordem canônica. */
  tiposDisponiveis: string[];
};

const ORDEM_TIPOS_PORTAL: PortalLaudoDocumentoTipo[] = ["pgr", "pcmso", "ltcat"];

export function laudosSstLiberadoAoPortal(
  tracking: OrcamentoLaudosSstRecord | null | undefined
): boolean {
  if (!tracking) return false;
  const workflow: LaudosSstWorkflow = mapLaudosWorkflowFromRecord(tracking);
  return isLaudosEtapaConcluida("envio_cliente", workflow);
}

export function calcPortalLaudosSstResumo(
  documentos: PortalLaudoDocumento[]
): PortalLaudosSstResumo {
  const total = documentos.length;
  const presentes = new Set(documentos.map((d) => d.tipo));
  const tiposDisponiveis = ORDEM_TIPOS_PORTAL.filter((t) => presentes.has(t)).map(
    (t) => laudoAnexoLabel(t)
  );
  return {
    totalDocumentos: total,
    temDocumentos: total > 0,
    linhaResumo:
      total === 0
        ? "Nenhum laudo disponível"
        : total === 1
          ? "1 documento disponível"
          : `${total} documentos disponíveis`,
    tiposDisponiveis,
  };
}

export function extrairDocumentosPortalLaudosSst(
  tracking: OrcamentoLaudosSstRecord
): PortalLaudoDocumento[] {
  if (!laudosSstLiberadoAoPortal(tracking)) return [];

  const dataIso = tracking.enviado_cliente_data
    ? String(tracking.enviado_cliente_data).slice(0, 10)
    : null;
  const dataLabel =
    dataIso && /^\d{4}-\d{2}-\d{2}$/.test(dataIso)
      ? formatDateIsoToBR(dataIso)
      : "—";

  const itens: {
    tipo: PortalLaudoDocumentoTipo;
    path: string | null | undefined;
    nome: string | null | undefined;
    tamanho: number | null | undefined;
  }[] = [
    {
      tipo: "pgr",
      path: tracking.pgr_anexo_path,
      nome: tracking.pgr_anexo_nome,
      tamanho: tracking.pgr_anexo_tamanho,
    },
    {
      tipo: "pcmso",
      path: tracking.pcmso_anexo_path,
      nome: tracking.pcmso_anexo_nome,
      tamanho: tracking.pcmso_anexo_tamanho,
    },
    {
      tipo: "ltcat",
      path: tracking.ltcat_anexo_path,
      nome: tracking.ltcat_anexo_nome,
      tamanho: tracking.ltcat_anexo_tamanho,
    },
  ];

  const docs: PortalLaudoDocumento[] = [];
  for (const item of itens) {
    const path = item.path?.trim();
    if (!path) continue;
    docs.push({
      id: `${tracking.orcamento_id}:${item.tipo}`,
      orcamentoId: tracking.orcamento_id,
      tipo: item.tipo,
      tipoLabel: laudoAnexoLabel(item.tipo),
      nomeArquivo: item.nome?.trim() || `${laudoAnexoLabel(item.tipo)}.pdf`,
      dataIso,
      dataLabel,
      tamanho:
        typeof item.tamanho === "number" && Number.isFinite(item.tamanho)
          ? item.tamanho
          : 0,
    });
  }
  return docs;
}

export function linhasResumoLaudosSstHome(
  resumo: PortalLaudosSstResumo | null
): string[] {
  if (!resumo) {
    return ["Documentos de PGR, PCMSO e LTCAT liberados pela Navarro."];
  }
  if (!resumo.temDocumentos) {
    return ["Nenhum laudo disponível no momento"];
  }
  return [resumo.linhaResumo];
}
