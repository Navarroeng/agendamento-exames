import {
  COMPROVANTE_ALLOWED_EXTENSIONS,
  COMPROVANTE_ALLOWED_MIME_TYPES,
  COMPROVANTE_MAX_BYTES,
  COMPROVANTE_OBRIGATORIO_MSG,
  COMPROVANTE_TAMANHO_INVALIDO_MSG,
  COMPROVANTE_TIPO_INVALIDO_MSG,
  ComprovanteValidationError,
  getComprovanteExtension,
  resolveComprovanteContentType,
  validateComprovanteFile,
} from "@/lib/fatura-comprovante";

export const ORCAMENTO_COMPROVANTE_BUCKET = "orcamentos-comprovantes";

export {
  COMPROVANTE_MAX_BYTES as ORCAMENTO_COMPROVANTE_MAX_BYTES,
  COMPROVANTE_ALLOWED_MIME_TYPES as ORCAMENTO_COMPROVANTE_MIME_TYPES,
  COMPROVANTE_ALLOWED_EXTENSIONS as ORCAMENTO_COMPROVANTE_EXTENSIONS,
  COMPROVANTE_OBRIGATORIO_MSG as ORCAMENTO_COMPROVANTE_OBRIGATORIO_MSG,
  COMPROVANTE_TIPO_INVALIDO_MSG as ORCAMENTO_COMPROVANTE_TIPO_INVALIDO_MSG,
  COMPROVANTE_TAMANHO_INVALIDO_MSG as ORCAMENTO_COMPROVANTE_TAMANHO_INVALIDO_MSG,
  ComprovanteValidationError as OrcamentoComprovanteValidationError,
  validateComprovanteFile as validateOrcamentoComprovanteFile,
  resolveComprovanteContentType as resolveOrcamentoComprovanteContentType,
};

export function buildOrcamentoComprovanteStoragePath(
  aprovacaoId: string,
  fileName: string
): string {
  const ext = getComprovanteExtension(fileName) ?? "bin";
  return `${aprovacaoId}/comprovante-${Date.now()}.${ext}`;
}
