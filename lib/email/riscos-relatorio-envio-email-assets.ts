import {
  RISCOS_APP_PRODUCTION_HOST,
  resolveAppBaseUrl,
} from "@/lib/riscos-relatorio-app-base-url";

/** Caminhos públicos das artes aprovadas (servidas em `/public`). */
export const RISCOS_RELATORIO_EMAIL_ASSET_FILES = {
  cabecalho: "/email/riscos-psicossociais/cabecalho.jpg",
  rodape: "/email/riscos-psicossociais/rodape.jpg",
} as const;

export type RiscosRelatorioEmailAssetKey = keyof typeof RISCOS_RELATORIO_EMAIL_ASSET_FILES;

/**
 * Base URL HTTPS para artes do e-mail.
 * Em produção usa sempre o domínio SST canônico (imagens estáveis para clientes de e-mail).
 */
export function resolveRelatorioEnvioEmailAssetsBaseUrl(request?: Request): string {
  if (process.env.NODE_ENV === "production") {
    return `https://${RISCOS_APP_PRODUCTION_HOST}`;
  }

  try {
    return resolveAppBaseUrl(request);
  } catch {
    return "http://localhost:3000";
  }
}

export function buildRelatorioEnvioEmailAssetUrl(
  asset: RiscosRelatorioEmailAssetKey,
  assetsBaseUrl: string
): string {
  const base = assetsBaseUrl.trim().replace(/\/$/, "");
  return `${base}${RISCOS_RELATORIO_EMAIL_ASSET_FILES[asset]}`;
}
