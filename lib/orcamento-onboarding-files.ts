export const ORCAMENTO_ONBOARDING_BUCKET = "orcamentos-onboarding";
export const ORCAMENTO_ONBOARDING_MAX_BYTES = 10 * 1024 * 1024;
/** PDF final do Laudo AET. Os demais anexos do bucket continuam em 10 MB. */
export const AET_LAUDO_PDF_MAX_BYTES = 20 * 1024 * 1024;
export const AET_LAUDO_PDF_TAMANHO_MSG =
  "O Laudo AET deve ter no máximo 20 MB.";
export const AET_LAUDO_PDF_FORMATO_HINT =
  "Formato PDF • Tamanho máximo: 20 MB";
export const AET_LAUDO_PDF_STORAGE_TAMANHO_MSG =
  "O armazenamento recusou o PDF do Laudo AET por exceder o tamanho máximo permitido. O envio não foi concluído.";

export type AetLaudoPdfValidationOptions = {
  maxBytes?: number;
  oversizeMessage?: string;
};

const LISTA_EXT = ["xlsx", "xls", "csv", "pdf", "jpg", "jpeg", "png"] as const;
const LOGO_EXT = ["png", "jpg", "jpeg", "svg"] as const;
const AET_DOC_EXT = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "doc",
  "docx",
  "xls",
  "xlsx",
] as const;

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function validateOrcamentoListaFuncionariosFile(file: File): void {
  if (!file || file.size <= 0) {
    throw new Error("Selecione o arquivo da lista de funcionários.");
  }
  if (file.size > ORCAMENTO_ONBOARDING_MAX_BYTES) {
    throw new Error("A lista de funcionários deve ter no máximo 10 MB.");
  }
  const ext = extensionOf(file.name);
  if (!LISTA_EXT.includes(ext as (typeof LISTA_EXT)[number])) {
    throw new Error(
      "Formato inválido. Use XLS, XLSX, CSV, PDF, JPG, JPEG ou PNG."
    );
  }
}

export function validateOrcamentoContratoPdfFile(file: File): void {
  if (!file || file.size <= 0) {
    throw new Error("Selecione o PDF do contrato.");
  }
  if (file.size > ORCAMENTO_ONBOARDING_MAX_BYTES) {
    throw new Error("O contrato deve ter no máximo 10 MB.");
  }
  const ext = extensionOf(file.name);
  if (ext !== "pdf") {
    throw new Error("O contrato gerado deve ser um arquivo PDF.");
  }
}

export function validateOrcamentoLogoFile(file: File): void {
  if (!file || file.size <= 0) {
    throw new Error("Selecione a logomarca da empresa.");
  }
  if (file.size > ORCAMENTO_ONBOARDING_MAX_BYTES) {
    throw new Error("A logomarca deve ter no máximo 10 MB.");
  }
  const ext = extensionOf(file.name);
  if (!LOGO_EXT.includes(ext as (typeof LOGO_EXT)[number])) {
    throw new Error("Formato inválido. Use PNG, JPG, JPEG ou SVG.");
  }
}

export function validateAetDocumentoEmpresaFile(file: File): void {
  if (!file || file.size <= 0) {
    throw new Error("Selecione o documento da empresa.");
  }
  if (file.size > ORCAMENTO_ONBOARDING_MAX_BYTES) {
    throw new Error("O documento deve ter no máximo 10 MB.");
  }
  const ext = extensionOf(file.name);
  if (!AET_DOC_EXT.includes(ext as (typeof AET_DOC_EXT)[number])) {
    throw new Error(
      "Formato inválido. Use PDF, JPG, JPEG, PNG, DOC, DOCX, XLS ou XLSX."
    );
  }
}

export function validateAetLaudoPdfFile(
  file: File,
  options?: AetLaudoPdfValidationOptions
): void {
  if (!file || file.size <= 0) {
    throw new Error("Selecione o PDF do Laudo AET.");
  }
  const maxBytes = options?.maxBytes ?? ORCAMENTO_ONBOARDING_MAX_BYTES;
  if (file.size > maxBytes) {
    throw new Error(
      options?.oversizeMessage ??
        (maxBytes === AET_LAUDO_PDF_MAX_BYTES
          ? AET_LAUDO_PDF_TAMANHO_MSG
          : "O Laudo AET deve ter no máximo 10 MB.")
    );
  }
  const ext = extensionOf(file.name);
  if (ext !== "pdf") {
    throw new Error("O Laudo AET final deve ser um arquivo PDF.");
  }
}

/** Traduz a recusa de tamanho do Supabase Storage no upload do PDF final do AET. */
export function mensagemErroArmazenamentoLaudoAet(
  error: unknown
): string | null {
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";
  if (/exceeded the maximum allowed size/i.test(message)) {
    return AET_LAUDO_PDF_STORAGE_TAMANHO_MSG;
  }
  return null;
}

/**
 * Envia o arquivo novo e só então grava o caminho.
 * Se o envio ou a gravação falhar, o arquivo anterior permanece.
 * O arquivo anterior só é removido depois da gravação ter sucesso.
 */
export async function substituirAnexoPreservandoAnterior<
  T extends { path: string },
>(params: {
  caminhoAnterior: string | null | undefined;
  enviarNovo: () => Promise<T>;
  persistir: (arquivo: T) => Promise<void>;
  removerNovoSeFalhar: (path: string) => Promise<void>;
  removerAnteriorAposSucesso?: (path: string) => Promise<void>;
}): Promise<T> {
  const anterior = params.caminhoAnterior?.trim() || null;
  const novo = await params.enviarNovo();
  try {
    await params.persistir(novo);
  } catch (error) {
    const novoPath = novo.path?.trim();
    if (novoPath && novoPath !== anterior) {
      try {
        await params.removerNovoSeFalhar(novoPath);
      } catch (cleanupError) {
        console.error(cleanupError);
      }
    }
    throw error;
  }
  if (
    anterior &&
    anterior !== novo.path?.trim() &&
    params.removerAnteriorAposSucesso
  ) {
    try {
      await params.removerAnteriorAposSucesso(anterior);
    } catch (cleanupError) {
      console.error(cleanupError);
    }
  }
  return novo;
}

export type OrcamentoOnboardingKind =
  | "funcionarios"
  | "logo"
  | "contrato"
  | "aet_documento"
  | "aet_laudo";

function basenameSeguroStorage(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  const cleaned = base.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 180) || "arquivo.bin";
}

export function buildOrcamentoOnboardingPath(
  aprovacaoId: string,
  kind: OrcamentoOnboardingKind,
  fileName: string
): string {
  if (kind === "contrato") {
    return `${aprovacaoId}/${Date.now()}/${basenameSeguroStorage(fileName)}`;
  }
  const ext = extensionOf(fileName) || "bin";
  return `${aprovacaoId}/${kind}-${Date.now()}.${ext}`;
}

export function resolveOnboardingContentType(file: File): string {
  if (file.type) return file.type;
  const ext = extensionOf(file.name);
  const map: Record<string, string> = {
    pdf: "application/pdf",
    csv: "text/csv",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
  };
  return map[ext] ?? "application/octet-stream";
}
