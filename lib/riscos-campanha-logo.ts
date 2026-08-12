/** Logo da campanha de Riscos Psicossociais (isolado do cadastro da empresa). */

export const RISCOS_CAMPANHA_LOGO_ORIGENS = [
  "empresa",
  "campanha",
  "manual",
] as const;

export type RiscosCampanhaLogoOrigem =
  (typeof RISCOS_CAMPANHA_LOGO_ORIGENS)[number];

export const RISCOS_CAMPANHA_LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const RISCOS_CAMPANHA_LOGO_EXTS = ["png", "jpg", "jpeg", "svg"] as const;

export type RiscosCampanhaLogoMeta = {
  path: string;
  nome: string;
  tipo: string;
  tamanho: number;
};

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1]! : "";
}

export function isRiscosCampanhaLogoOrigem(
  value: string | null | undefined
): value is RiscosCampanhaLogoOrigem {
  return (
    value != null &&
    (RISCOS_CAMPANHA_LOGO_ORIGENS as readonly string[]).includes(value)
  );
}

export function validateRiscosCampanhaLogoFile(file: File): void {
  if (!file || file.size <= 0) {
    throw new Error("Selecione o logo da empresa.");
  }
  if (file.size > RISCOS_CAMPANHA_LOGO_MAX_BYTES) {
    throw new Error("O logo deve ter no máximo 5 MB.");
  }
  const ext = extensionOf(file.name);
  if (!RISCOS_CAMPANHA_LOGO_EXTS.includes(ext as (typeof RISCOS_CAMPANHA_LOGO_EXTS)[number])) {
    throw new Error("Formato inválido. Use PNG, JPG, JPEG ou SVG.");
  }
}

export function buildRiscosCampanhaLogoStoragePath(
  campanhaId: string,
  fileName: string
): string {
  const ext = extensionOf(fileName) || "png";
  return `campanhas/${campanhaId}/logo-${Date.now()}.${ext}`;
}

export function resolveRiscosCampanhaLogoContentType(file: File): string {
  if (file.type) return file.type;
  const ext = extensionOf(file.name);
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
  };
  return map[ext] ?? "application/octet-stream";
}

/**
 * Prioridade de exibição:
 * 1) logo da campanha (storage_path)
 * 2) logo da empresa (fallback)
 * 3) null → mostrar nome/iniciais
 */
export function escolherLogoRelatorio(input: {
  logoCampanhaUrl: string | null | undefined;
  logoEmpresaUrl: string | null | undefined;
}): string | null {
  const campanha = (input.logoCampanhaUrl ?? "").trim();
  if (campanha) return campanha;
  const empresa = (input.logoEmpresaUrl ?? "").trim();
  if (empresa) return empresa;
  return null;
}
