export const ASO_RETIDO_BUCKET = "agendamentos-aso-retido";

export const ASO_RETIDO_MAX_BYTES = 5 * 1024 * 1024;

export const ASO_RETIDO_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ASO_RETIDO_ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "doc",
  "docx",
] as const;

export const ASO_RETIDO_ANEXO_OBRIGATORIO_MSG =
  "Anexe um documento para confirmar a retenção do ASO.";

export const ASO_RETIDO_TIPO_INVALIDO_MSG =
  "Formato não permitido. Envie PDF, imagem (JPG, PNG, WEBP) ou documento (DOC, DOCX).";

export const ASO_RETIDO_TAMANHO_INVALIDO_MSG =
  "Arquivo muito grande. O limite é 5 MB.";

export class AsoRetidoAnexoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AsoRetidoAnexoValidationError";
  }
}

export function getAsoRetidoAnexoExtension(fileName: string): string | null {
  const parts = fileName.trim().toLowerCase().split(".");
  if (parts.length < 2) return null;
  const ext = parts[parts.length - 1];
  return ASO_RETIDO_ALLOWED_EXTENSIONS.includes(
    ext as (typeof ASO_RETIDO_ALLOWED_EXTENSIONS)[number]
  )
    ? ext
    : null;
}

export function resolveAsoRetidoAnexoContentType(
  file: Pick<File, "name" | "type">
): string {
  if (
    file.type &&
    ASO_RETIDO_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ASO_RETIDO_ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return file.type;
  }

  const ext = getAsoRetidoAnexoExtension(file.name);
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return file.type || "application/octet-stream";
}

export function validateAsoRetidoAnexoFile(file: File): void {
  if (file.size <= 0) {
    throw new AsoRetidoAnexoValidationError(ASO_RETIDO_ANEXO_OBRIGATORIO_MSG);
  }

  if (file.size > ASO_RETIDO_MAX_BYTES) {
    throw new AsoRetidoAnexoValidationError(ASO_RETIDO_TAMANHO_INVALIDO_MSG);
  }

  const ext = getAsoRetidoAnexoExtension(file.name);
  const mimeOk =
    !!file.type &&
    ASO_RETIDO_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ASO_RETIDO_ALLOWED_MIME_TYPES)[number]
    );

  if (!ext && !mimeOk) {
    throw new AsoRetidoAnexoValidationError(ASO_RETIDO_TIPO_INVALIDO_MSG);
  }

  if (ext && !mimeOk && file.type && file.type !== "application/octet-stream") {
    throw new AsoRetidoAnexoValidationError(ASO_RETIDO_TIPO_INVALIDO_MSG);
  }
}

export function buildAsoRetidoAnexoStoragePath(
  agendamentoId: string,
  fileName: string
): string {
  const ext = getAsoRetidoAnexoExtension(fileName) ?? "bin";
  return `${agendamentoId}/aso-retido-${Date.now()}.${ext}`;
}

export function isAgendamentoAsoRetido(
  status: string | null | undefined
): boolean {
  return (status ?? "").trim().toLowerCase() === "aso_retido";
}
