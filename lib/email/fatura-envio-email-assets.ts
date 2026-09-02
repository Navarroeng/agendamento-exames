import {
  RISCOS_APP_PRODUCTION_HOST,
  resolveAppBaseUrl,
} from "@/lib/riscos-relatorio-app-base-url";

/** Caminhos públicos das artes aprovadas de faturas (servidas em `/public`). */
export const FATURA_EMAIL_ASSET_FILES = {
  cabecalho: "/email/faturas/cabecalho.jpg",
  rodape: "/email/faturas/rodape.jpg",
} as const;

export type FaturaEmailAssetKey = keyof typeof FATURA_EMAIL_ASSET_FILES;

/**
 * Base URL HTTPS para artes do e-mail de faturas.
 * Em produção usa o domínio SST canônico (imagens estáveis para clientes de e-mail).
 */
export function resolveFaturaEnvioEmailAssetsBaseUrl(
  request?: Request
): string {
  if (process.env.NODE_ENV === "production") {
    return `https://${RISCOS_APP_PRODUCTION_HOST}`;
  }

  try {
    return resolveAppBaseUrl(request);
  } catch {
    return "http://localhost:3000";
  }
}

export function buildFaturaEnvioEmailAssetUrl(
  asset: FaturaEmailAssetKey,
  assetsBaseUrl: string
): string {
  const base = assetsBaseUrl.trim().replace(/\/$/, "");
  return `${base}${FATURA_EMAIL_ASSET_FILES[asset]}`;
}
