import type { OrcamentoStatus } from "@/lib/orcamento-types";

export type OrcamentoAcaoMenu =
  | "editar"
  | "gerar_pdf"
  | "aprovar"
  | "alterar_responsavel"
  | "cancelar";

export const ORCAMENTO_JA_APROVADO_MSG = "Este orçamento já foi aprovado.";

export type ResolveOrcamentoAcoesOptions = {
  /** Só ADM pode cancelar/encerrar quando o orçamento já virou contrato (aprovado). */
  podeEncerrarContrato?: boolean;
  /** Pode transferir o responsável atual do processo. */
  podeAlterarResponsavel?: boolean;
};

function withAlterarResponsavel(
  actions: OrcamentoAcaoMenu[],
  podeAlterar: boolean
): OrcamentoAcaoMenu[] {
  if (!podeAlterar) return actions;
  const cancelIdx = actions.indexOf("cancelar");
  if (cancelIdx >= 0) {
    return [
      ...actions.slice(0, cancelIdx),
      "alterar_responsavel",
      ...actions.slice(cancelIdx),
    ];
  }
  return [...actions, "alterar_responsavel"];
}

/** Ações exibidas no menu ⋯ conforme o status e permissões. */
export function resolveOrcamentoAcoesMenu(
  status: OrcamentoStatus,
  options?: ResolveOrcamentoAcoesOptions
): OrcamentoAcaoMenu[] {
  const podeEncerrar = options?.podeEncerrarContrato === true;
  const podeAlterar = options?.podeAlterarResponsavel === true;

  switch (status) {
    case "em_elaboracao":
      return withAlterarResponsavel(
        ["editar", "gerar_pdf", "cancelar"],
        podeAlterar
      );
    case "enviado":
    case "em_negociacao":
      return withAlterarResponsavel(
        ["editar", "gerar_pdf", "aprovar", "cancelar"],
        podeAlterar
      );
    case "aprovado":
      return withAlterarResponsavel(
        podeEncerrar ? ["gerar_pdf", "cancelar"] : ["gerar_pdf"],
        podeAlterar
      );
    case "reprovado":
      return withAlterarResponsavel(["gerar_pdf"], podeAlterar);
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
    podeAlterarResponsavel: true,
  }).includes("editar");
}

export function orcamentoPermiteAprovar(status: OrcamentoStatus): boolean {
  return resolveOrcamentoAcoesMenu(status, {
    podeEncerrarContrato: true,
    podeAlterarResponsavel: true,
  }).includes("aprovar");
}

export function orcamentoPermiteCancelar(
  status: OrcamentoStatus,
  options?: ResolveOrcamentoAcoesOptions
): boolean {
  return resolveOrcamentoAcoesMenu(status, options).includes("cancelar");
}
