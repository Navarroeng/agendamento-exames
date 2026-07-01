export const COMPROVANTE_BUCKET = "faturas-comprovantes";

export const COMPROVANTE_MAX_BYTES = 5 * 1024 * 1024;

export const COMPROVANTE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const COMPROVANTE_ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
] as const;

export const COMPROVANTE_OBRIGATORIO_MSG =
  "Anexe o comprovante de pagamento para confirmar.";

export const COMPROVANTE_TIPO_INVALIDO_MSG =
  "Formato não permitido. Envie PDF, JPG, JPEG ou PNG.";

export const COMPROVANTE_TAMANHO_INVALIDO_MSG =
  "Arquivo muito grande. O limite é 5 MB.";

export class ComprovanteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComprovanteValidationError";
  }
}

export function getComprovanteExtension(fileName: string): string | null {
  const parts = fileName.trim().toLowerCase().split(".");
  if (parts.length < 2) return null;
  const ext = parts[parts.length - 1];
  return COMPROVANTE_ALLOWED_EXTENSIONS.includes(
    ext as (typeof COMPROVANTE_ALLOWED_EXTENSIONS)[number]
  )
    ? ext
    : null;
}

export function resolveComprovanteContentType(
  file: Pick<File, "name" | "type">
): string {
  if (
    file.type &&
    COMPROVANTE_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof COMPROVANTE_ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return file.type;
  }

  const ext = getComprovanteExtension(file.name);
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";

  return file.type || "application/octet-stream";
}

export function validateComprovanteFile(file: File): void {
  if (file.size <= 0) {
    throw new ComprovanteValidationError(COMPROVANTE_OBRIGATORIO_MSG);
  }

  if (file.size > COMPROVANTE_MAX_BYTES) {
    throw new ComprovanteValidationError(COMPROVANTE_TAMANHO_INVALIDO_MSG);
  }

  const ext = getComprovanteExtension(file.name);
  const mimeOk =
    !!file.type &&
    COMPROVANTE_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof COMPROVANTE_ALLOWED_MIME_TYPES)[number]
    );

  if (!ext && !mimeOk) {
    throw new ComprovanteValidationError(COMPROVANTE_TIPO_INVALIDO_MSG);
  }

  if (ext && !mimeOk && file.type && file.type !== "application/octet-stream") {
    throw new ComprovanteValidationError(COMPROVANTE_TIPO_INVALIDO_MSG);
  }
}

export function buildComprovanteStoragePath(
  faturaId: string,
  fileName: string
): string {
  const ext = getComprovanteExtension(fileName) ?? "bin";
  return `${faturaId}/comprovante-${Date.now()}.${ext}`;
}

export function isComprovantePagamentoDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";
  return (
    message.includes("comprovante_pagamento_obrigatorio") ||
    code === "P0001"
  );
}
