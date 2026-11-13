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
