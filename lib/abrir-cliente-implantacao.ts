import {
  canAccessPath,
  type PerfilUsuarioTipo,
} from "@/lib/permissions";

export type SecaoCadastroCliente = "colaboradores";

/** Aba Lista de funcionários abre o cadastro já na seção Colaboradores. */
export function secaoInicialAoAbrirCliente(
  abaAtiva: string
): SecaoCadastroCliente | null {
  return abaAtiva === "funcionarios" ? "colaboradores" : null;
}

/**
 * ID do cliente da contratação. O orçamento guarda o vínculo quando a
 * aprovação o gravou; se esse campo estiver vazio, vale o cliente do contrato.
 * Não usa o nome digitado na proposta.
 */
export function clienteIdVinculadoAContratacao(
  orcamentoClienteId: string | null | undefined,
  contratoClienteId: string | null | undefined
): string {
  const doOrcamento = String(orcamentoClienteId ?? "").trim();
  if (doOrcamento) return doOrcamento;
  return String(contratoClienteId ?? "").trim();
}

/**
 * O botão existe na Implantação quando a contratação tem cliente
 * e o perfil alcança o cadastro de Clientes.
 */
export function podeAbrirClienteDaImplantacao(input: {
  contextoImplantacao: boolean;
  clienteId: string | null | undefined;
  perfil: PerfilUsuarioTipo | null | undefined;
}): boolean {
  if (!input.contextoImplantacao) return false;
  if (!String(input.clienteId ?? "").trim()) return false;
  return canAccessPath(input.perfil, "/clientes");
}
