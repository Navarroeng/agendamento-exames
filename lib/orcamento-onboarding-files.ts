export const ORCAMENTO_ONBOARDING_BUCKET = "orcamentos-onboarding";
export const ORCAMENTO_ONBOARDING_MAX_BYTES = 10 * 1024 * 1024;

const LISTA_EXT = ["xlsx", "xls", "csv", "pdf", "jpg", "jpeg", "png"] as const;
const LOGO_EXT = ["png", "jpg", "jpeg", "svg"] as const;

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

export function buildOrcamentoOnboardingPath(
  aprovacaoId: string,
  kind: "funcionarios" | "logo",
  fileName: string
): string {
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
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
  };
  return map[ext] ?? "application/octet-stream";
}
