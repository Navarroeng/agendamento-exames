import {
  COMPROVANTE_ALLOWED_EXTENSIONS,
  COMPROVANTE_BUCKET,
  COMPROVANTE_MAX_BYTES,
  getComprovanteExtension,
  resolveComprovanteContentType,
  validateComprovanteFile,
} from "@/lib/fatura-comprovante";

export { COMPROVANTE_BUCKET, COMPROVANTE_ALLOWED_EXTENSIONS };

export const CONFERENCIA_DATA_OBRIGATORIA_MSG =
  "Informe a data da conferência.";

export const CONFERENCIA_FATURA_OBRIGATORIA_MSG =
  "Anexe a fatura da clínica para concluir a conferência.";

export function buildFaturaClinicaStoragePath(
  faturaId: string,
  fileName: string
): string {
  const ext = getComprovanteExtension(fileName) ?? "bin";
  return `${faturaId}/faturas/fatura-clinica-${Date.now()}.${ext}`;
}

export function validateFaturaClinicaFile(file: File): void {
  validateComprovanteFile(file);
}

export function resolveFaturaClinicaContentType(
  file: Pick<File, "name" | "type">
): string {
  return resolveComprovanteContentType(file);
}

export function formatFaturaClinicaTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CONFERENCIA_FATURA_MAX_BYTES = COMPROVANTE_MAX_BYTES;
