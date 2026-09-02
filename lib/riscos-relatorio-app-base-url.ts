/** Host customizado de produção (SST / agendamento). */
export const RISCOS_APP_PRODUCTION_HOST = "sst.navarroeng.com.br";

/** Prefixo dos deployments Vercel oficiais deste projeto. */
const VERCEL_PROJECT_PREFIX = "agendamento-exames";

function isDevelopmentContext(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv === "development" || vercelEnv === "preview") return true;
  return !process.env.VERCEL;
}

/** Normaliza host (sem porta, lowercase, sem path/credenciais). */
export function normalizeAppHost(raw: string): string | null {
  const trimmed = String(raw ?? "").trim().toLowerCase();
  if (!trimmed) return null;

  let host = trimmed;
  if (host.includes("@")) return null;
  if (host.includes("/") || host.includes("\\")) return null;

  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end === -1) return null;
    host = host.slice(1, end);
  } else {
    const colon = host.lastIndexOf(":");
    if (colon > -1 && !host.includes("]")) {
      const maybePort = host.slice(colon + 1);
      if (/^\d+$/.test(maybePort)) {
        host = host.slice(0, colon);
      }
    }
  }

  host = host.replace(/\.$/, "");
  if (!host || host.length > 253) return null;
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  if (host.includes("..")) return null;

  return host;
}

function isLocalDevHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1";
}

function isTrustedVercelAppHost(host: string): boolean {
  if (!host.endsWith(".vercel.app")) return false;
  if (host === `${VERCEL_PROJECT_PREFIX}.vercel.app`) return true;
  if (
    host.startsWith(`${VERCEL_PROJECT_PREFIX}-`) &&
    host.endsWith(".vercel.app")
  ) {
    return true;
  }
  const vercelUrl = process.env.VERCEL_URL?.trim().toLowerCase();
  if (vercelUrl) {
    const normalized = normalizeAppHost(vercelUrl.replace(/^https?:\/\//, ""));
    if (normalized && host === normalized) return true;
  }
  return false;
}

/** Host permitido para navegação Playwright (anti-SSRF). */
export function isTrustedAppHost(host: string): boolean {
  const normalized = normalizeAppHost(host);
  if (!normalized) return false;

  if (normalized === RISCOS_APP_PRODUCTION_HOST) return true;
  if (isTrustedVercelAppHost(normalized)) return true;
  if (isLocalDevHost(normalized) && isDevelopmentContext()) return true;

  return false;
}

function resolveTrustedProtocol(
  host: string,
  protoRaw: string | null | undefined
): "http" | "https" {
  if (isLocalDevHost(host) && isDevelopmentContext()) {
    const proto = String(protoRaw ?? "http")
      .trim()
      .toLowerCase();
    return proto === "https" ? "https" : "http";
  }
  return "https";
}

export function buildAppBaseUrlFromHost(
  host: string,
  protoRaw?: string | null
): string | null {
  const normalized = normalizeAppHost(host);
  if (!normalized || !isTrustedAppHost(normalized)) return null;
  if (isLocalDevHost(normalized) && isDevelopmentContext()) {
    const proto = resolveTrustedProtocol(normalized, protoRaw);
    return `${proto}://localhost:3000`;
  }

  const proto = resolveTrustedProtocol(normalized, protoRaw);
  return `${proto}://${normalized}`;
}

function parseTrustedEnvBaseUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.username || url.password || url.pathname !== "/" || url.search) {
      return null;
    }
    const host = normalizeAppHost(url.hostname);
    if (!host || !isTrustedAppHost(host)) return null;
    const proto = resolveTrustedProtocol(host, url.protocol.replace(":", ""));
    return `${proto}://${host}`;
  } catch {
    const hostOnly = normalizeAppHost(trimmed.replace(/^https?:\/\//, ""));
    if (!hostOnly || !isTrustedAppHost(hostOnly)) return null;
    return buildAppBaseUrlFromHost(hostOnly, "https");
  }
}

function resolveFromRequestHeaders(request: Request): string | null {
  const hostRaw =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  if (!hostRaw) return null;

  const protoRaw =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || null;

  return buildAppBaseUrlFromHost(hostRaw, protoRaw);
}

/**
 * URL base para Playwright abrir a rota de impressão.
 *
 * Ordem:
 * 1. Headers confiáveis da Request (domínio pelo qual a requisição chegou)
 * 2. NEXT_PUBLIC_APP_URL (override opcional, validado)
 * 3. VERCEL_URL
 * 4. localhost — somente em desenvolvimento
 */
export function resolveAppBaseUrl(request?: Request): string {
  if (request) {
    const fromRequest = resolveFromRequestHeaders(request);
    if (fromRequest) return fromRequest;
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    const parsed = parseTrustedEnvBaseUrl(fromEnv);
    if (parsed) return parsed;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = normalizeAppHost(vercel.replace(/^https?:\/\//, ""));
    if (host && isTrustedAppHost(host)) {
      return buildAppBaseUrlFromHost(host, "https")!;
    }
  }

  if (isDevelopmentContext()) {
    return "http://localhost:3000";
  }

  throw new Error(
    "Não foi possível resolver a URL base da aplicação para gerar o PDF."
  );
}
