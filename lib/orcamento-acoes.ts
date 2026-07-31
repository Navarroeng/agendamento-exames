import type { OrcamentoStatus } from "@/lib/orcamento-types";

export type OrcamentoAcaoMenu =
  | "editar"
  | "gerar_pdf"
  | "aprovar"
  | "cancelar";

export const ORCAMENTO_JA_APROVADO_MSG = "Este orçamento já foi aprovado.";

export type ResolveOrcamentoAcoesOptions = {
  /** Só ADM pode cancelar/encerrar quando o orçamento já virou contrato (aprovado). */
  podeEncerrarContrato?: boolean;
};

/** Ações exibidas no menu ⋯ conforme o status e permissões. */
export function resolveOrcamentoAcoesMenu(
  status: OrcamentoStatus,
  options?: ResolveOrcamentoAcoesOptions
): OrcamentoAcaoMenu[] {
  const podeEncerrar = options?.podeEncerrarContrato === true;

  switch (status) {
    case "em_elaboracao":
      return ["editar", "gerar_pdf", "cancelar"];
    case "enviado":
    case "em_negociacao":
      return ["editar", "gerar_pdf", "aprovar", "cancelar"];
    case "aprovado":
      return podeEncerrar ? ["gerar_pdf", "cancelar"] : ["gerar_pdf"];
    case "reprovado":
      return ["gerar_pdf"];
    case "cancelado":
      return ["gerar_pdf"];
    case "contrato_encerrado":
      return ["gerar_pdf"];
    default:
      return ["gerar_pdf"];
  }
}

export function orcamentoPermiteEditar(status: OrcamentoStatus): boolean {
  return resolveOrcamentoAcoesMenu(status, {
    podeEncerrarContrato: true,
  }).includes("editar");
}

export function orcamentoPermiteAprovar(status: OrcamentoStatus): boolean {
  return resolveOrcamentoAcoesMenu(status, {
    podeEncerrarContrato: true,
  }).includes("aprovar");
}

export function orcamentoPermiteCancelar(
  status: OrcamentoStatus,
  options?: ResolveOrcamentoAcoesOptions
): boolean {
  return resolveOrcamentoAcoesMenu(status, options).includes("cancelar");
}
