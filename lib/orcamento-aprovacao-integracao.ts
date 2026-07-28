import { formatCNPJ } from "@/lib/cnpj";
import { normalizeCnpjDigits } from "@/lib/cliente-cnpj";
import { ORCAMENTO_JA_APROVADO_MSG } from "@/lib/orcamento-acoes";

export { ORCAMENTO_JA_APROVADO_MSG } from "@/lib/orcamento-acoes";

export const ORCAMENTO_APROVACAO_CNPJ_OBRIGATORIO_MSG =
  "Para concluir a aprovação e vincular o contrato ao cliente, informe um CNPJ válido.";

export const ORCAMENTO_CONTRATO_JA_VINCULADO_MSG =
  "Este orçamento já possui um contrato vinculado.";

export function resolveOrcamentoCnpjDigits(
  cnpj: string | null | undefined
): string | null {
  const digits = normalizeCnpjDigits(cnpj);
  return digits.length === 14 ? digits : null;
}

export function assertOrcamentoCnpjParaAprovacao(
  cnpj: string | null | undefined
): string {
  const digits = resolveOrcamentoCnpjDigits(cnpj);
  if (!digits) {
    throw new Error(ORCAMENTO_APROVACAO_CNPJ_OBRIGATORIO_MSG);
  }
  return digits;
}

export function formatCnpjAuditoria(cnpj: string | null | undefined): string {
  const digits = normalizeCnpjDigits(cnpj);
  if (digits.length === 14) return formatCNPJ(digits);
  return cnpj?.trim() || "—";
}

export interface OrcamentoAprovacaoIntegracaoResult {
  aprovacao_id: string;
  cliente_id: string;
  contrato_id: string;
  numero_contrato: string;
  cliente_criado: boolean;
  cliente_localizado: boolean;
  contrato_criado: boolean;
  contrato_ja_existia: boolean;
  cnpj_digits: string;
  cliente_nome: string;
  numero_orcamento: string;
}

export function parseAprovacaoIntegracaoError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";

  if (raw.includes("CNPJ_OBRIGATORIO")) {
    return ORCAMENTO_APROVACAO_CNPJ_OBRIGATORIO_MSG;
  }
  if (
    raw.includes("ORCAMENTO_JA_APROVADO") ||
    raw.includes(ORCAMENTO_JA_APROVADO_MSG)
  ) {
    return ORCAMENTO_JA_APROVADO_MSG;
  }
  if (raw.includes("ORCAMENTO_CANCELADO")) {
    return "Orçamento cancelado não pode ser aprovado.";
  }
  if (raw.includes("ORCAMENTO_INVALIDO")) {
    return "Orçamento não encontrado.";
  }
  if (raw.includes("APROVACAO_INVALIDA")) {
    return "Dados da aprovação inválidos.";
  }
  return raw || "Erro ao aprovar orçamento e vincular cliente/contrato.";
}
