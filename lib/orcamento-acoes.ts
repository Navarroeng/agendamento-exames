import type { OrcamentoStatus } from "@/lib/orcamento-types";

export type OrcamentoAcaoMenu =
  | "editar"
  | "gerar_pdf"
  | "aprovar"
  | "cancelar";

export const ORCAMENTO_JA_APROVADO_MSG = "Este orçamento já foi aprovado.";

/** Ações exibidas no menu ⋯ conforme o status. */
export function resolveOrcamentoAcoesMenu(
  status: OrcamentoStatus
): OrcamentoAcaoMenu[] {
  switch (status) {
    case "em_elaboracao":
      return ["editar", "gerar_pdf", "cancelar"];
    case "enviado":
    case "em_negociacao":
      return ["editar", "gerar_pdf", "aprovar", "cancelar"];
    case "aprovado":
      return ["gerar_pdf", "cancelar"];
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
  return resolveOrcamentoAcoesMenu(status).includes("editar");
}

export function orcamentoPermiteAprovar(status: OrcamentoStatus): boolean {
  return resolveOrcamentoAcoesMenu(status).includes("aprovar");
}

export function orcamentoPermiteCancelar(status: OrcamentoStatus): boolean {
  return resolveOrcamentoAcoesMenu(status).includes("cancelar");
}
