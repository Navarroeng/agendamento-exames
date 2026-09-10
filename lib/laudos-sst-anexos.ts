/** Anexos de PGR / PCMSO / LTCAT — Laudos SST (storage privado). */

export const LAUDOS_SST_ANEXOS_BUCKET = "laudos-sst-anexos";
export const LAUDOS_SST_ANEXO_MAX_BYTES = 10 * 1024 * 1024;

export const LAUDOS_SST_ANEXO_TIPOS = ["pgr", "pcmso", "ltcat"] as const;
export type LaudosSstAnexoTipo = (typeof LAUDOS_SST_ANEXO_TIPOS)[number];

export const LAUDOS_SST_ANEXO_ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
] as const;

export const LAUDOS_SST_ANEXO_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type LaudosSstAnexoMeta = {
  path: string;
  nome: string;
  tipo: string;
  tamanho: number;
};

export const LAUDOS_SST_ANEXO_TIPO_INVALIDO_MSG =
  "Formato não permitido. Envie PDF, DOC ou DOCX.";

export const LAUDOS_SST_ANEXO_TAMANHO_INVALIDO_MSG =
  "Arquivo muito grande. O limite é 10 MB.";

export class LaudosSstAnexoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaudosSstAnexoValidationError";
  }
}

export function isLaudosSstAnexoTipo(
  value: string
): value is LaudosSstAnexoTipo {
  return (LAUDOS_SST_ANEXO_TIPOS as readonly string[]).includes(value);
}

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function getLaudosSstAnexoExtension(
  fileName: string
): (typeof LAUDOS_SST_ANEXO_ALLOWED_EXTENSIONS)[number] | null {
  const ext = extensionOf(fileName);
  return LAUDOS_SST_ANEXO_ALLOWED_EXTENSIONS.includes(
    ext as (typeof LAUDOS_SST_ANEXO_ALLOWED_EXTENSIONS)[number]
  )
    ? (ext as (typeof LAUDOS_SST_ANEXO_ALLOWED_EXTENSIONS)[number])
    : null;
}

export function resolveLaudosSstAnexoContentType(
  file: Pick<File, "name" | "type">
): string {
  if (
    file.type &&
    LAUDOS_SST_ANEXO_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof LAUDOS_SST_ANEXO_ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return file.type;
  }
  const ext = getLaudosSstAnexoExtension(file.name);
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return file.type || "application/octet-stream";
}

export function validateLaudosSstAnexoFile(file: File): void {
  if (!file || file.size <= 0) {
    throw new LaudosSstAnexoValidationError("Selecione um arquivo para anexar.");
  }
  if (file.size > LAUDOS_SST_ANEXO_MAX_BYTES) {
    throw new LaudosSstAnexoValidationError(
      LAUDOS_SST_ANEXO_TAMANHO_INVALIDO_MSG
    );
  }
  const ext = getLaudosSstAnexoExtension(file.name);
  const mimeOk =
    !!file.type &&
    LAUDOS_SST_ANEXO_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof LAUDOS_SST_ANEXO_ALLOWED_MIME_TYPES)[number]
    );
  if (!ext && !mimeOk) {
    throw new LaudosSstAnexoValidationError(LAUDOS_SST_ANEXO_TIPO_INVALIDO_MSG);
  }
  if (ext && !mimeOk && file.type && file.type !== "application/octet-stream") {
    throw new LaudosSstAnexoValidationError(LAUDOS_SST_ANEXO_TIPO_INVALIDO_MSG);
  }
}

/**
 * Path: {orcamentoId}/{tipo}-{timestamp}.{ext}
 * Diferencia PGR/PCMSO/LTCAT pelo segmento do nome do arquivo.
 */
export function buildLaudosSstAnexoStoragePath(
  orcamentoId: string,
  tipo: LaudosSstAnexoTipo,
  fileName: string
): string {
  const id = orcamentoId.trim();
  if (!id) throw new Error("Orçamento inválido para anexar o laudo.");
  const ext = getLaudosSstAnexoExtension(fileName) ?? "bin";
  return `${id}/${tipo}-${Date.now()}.${ext}`;
}

export function laudoAnexoLabel(tipo: LaudosSstAnexoTipo): string {
  if (tipo === "pcmso") return "PCMSO";
  if (tipo === "ltcat") return "LTCAT";
  return "PGR";
}

export function anexoMetaFromColumns(
  path: string | null | undefined,
  nome: string | null | undefined,
  tipo: string | null | undefined,
  tamanho: number | null | undefined
): LaudosSstAnexoMeta | null {
  const p = path?.trim();
  if (!p) return null;
  return {
    path: p,
    nome: nome?.trim() || "arquivo",
    tipo: tipo?.trim() || "application/octet-stream",
    tamanho: typeof tamanho === "number" && Number.isFinite(tamanho) ? tamanho : 0,
  };
}
