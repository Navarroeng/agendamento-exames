/**
 * Contratações pontuais independentes do contrato operacional SST
 * (`cliente_contratos`). Hoje: Laudo AET exclusivo. Extensível para perícia
 * e outros laudos avulsos, sempre a partir do snapshot da aprovação.
 */

import {
  IMPLANTACAO_ETAPA_LABELS,
  resolveImplantacaoEtapaAtual,
  type ImplantacaoEtapaId,
} from "@/lib/implantacao-clientes";
import type { ImplantacaoAetRecord } from "@/lib/implantacao-aet";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import { orcamentoEhExclusivoAet } from "@/lib/servico-aet";
import type { ServicoItemRef } from "@/lib/servico-treinamentos";

export type ServicoPontualKind = "aet";

export interface ServicoPontualContratado {
  kind: ServicoPontualKind;
  orcamentoId: string;
  aprovacaoId: string;
  numeroOrcamento: string;
  servicoNome: string;
  valorFinal: number;
  contratadoEm: string | null;
  statusId: ImplantacaoEtapaId;
  statusLabel: string;
  href: string;
}

export function resolveServicoPontualKind(
  itens: ServicoItemRef[] | null | undefined
): ServicoPontualKind | null {
  if (orcamentoEhExclusivoAet(itens)) return "aet";
  return null;
}

export function isContratacaoServicoPontual(
  itens: ServicoItemRef[] | null | undefined
): boolean {
  return resolveServicoPontualKind(itens) !== null;
}

export function hrefAcompanhamentoServicoPontual(orcamentoId: string): string {
  return `/implantacao?orcamentoId=${encodeURIComponent(orcamentoId)}`;
}

export function readImplantacaoOrcamentoIdFromSearch(
  search: string
): string | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const value = new URLSearchParams(raw).get("orcamentoId")?.trim() ?? "";
  return value || null;
}

export function labelStatusServicoPontual(etapa: ImplantacaoEtapaId): string {
  if (etapa === "contrato") return "Aguardando contrato";
  return IMPLANTACAO_ETAPA_LABELS[etapa];
}

export function nomeServicoPontualDoSnapshot(
  itens: Array<{ servico_nome?: string | null }> | null | undefined
): string {
  const found = (itens ?? []).find((item) => (item.servico_nome ?? "").trim());
  return (found?.servico_nome ?? "").trim();
}

export function resolveStatusServicoPontual(params: {
  kind: ServicoPontualKind;
  aprovacao: OrcamentoAprovacaoRecord | null;
  aet?: ImplantacaoAetRecord | null;
}): { id: ImplantacaoEtapaId; label: string } {
  const id =
    params.kind === "aet"
      ? resolveImplantacaoEtapaAtual(params.aprovacao, {
          fluxo: "aet",
          aet: params.aet ?? null,
        })
      : resolveImplantacaoEtapaAtual(params.aprovacao);
  return { id, label: labelStatusServicoPontual(id) };
}

export function buildServicoPontualContratado(params: {
  orcamento: { id: string; numero: string | null };
  aprovacao: OrcamentoAprovacaoRecord;
  aet?: ImplantacaoAetRecord | null;
}): ServicoPontualContratado | null {
  const itens = params.aprovacao.orcamento_aprovacao_itens ?? [];
  const kind = resolveServicoPontualKind(itens);
  if (!kind) return null;
  const status = resolveStatusServicoPontual({
    kind,
    aprovacao: params.aprovacao,
    aet: params.aet ?? null,
  });
  const servicoNome = nomeServicoPontualDoSnapshot(itens);
  if (!servicoNome) return null;
  return {
    kind,
    orcamentoId: params.orcamento.id,
    aprovacaoId: params.aprovacao.id,
    numeroOrcamento: (params.orcamento.numero ?? "").trim(),
    servicoNome,
    valorFinal: Number(params.aprovacao.valor_final) || 0,
    contratadoEm: params.aprovacao.aprovado_em ?? null,
    statusId: status.id,
    statusLabel: status.label,
    href: hrefAcompanhamentoServicoPontual(params.orcamento.id),
  };
}

export function listServicosPontuaisContratados(params: {
  orcamentos: Array<{ id: string; numero: string | null }>;
  aprovacoesByOrcamentoId: Map<string, OrcamentoAprovacaoRecord>;
  aetByOrcamentoId?: Map<string, ImplantacaoAetRecord>;
}): ServicoPontualContratado[] {
  const list: ServicoPontualContratado[] = [];
  for (const orcamento of params.orcamentos) {
    const aprovacao = params.aprovacoesByOrcamentoId.get(orcamento.id);
    if (!aprovacao) continue;
    const item = buildServicoPontualContratado({
      orcamento,
      aprovacao,
      aet: params.aetByOrcamentoId?.get(orcamento.id) ?? null,
    });
    if (item) list.push(item);
  }
  return list.sort((a, b) =>
    (b.contratadoEm ?? "").localeCompare(a.contratadoEm ?? "")
  );
}
