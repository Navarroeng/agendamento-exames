/**
 * Rate limit simples em memória para tentativas de validação do portal.
 * Suficiente para reduzir brute-force em instância única (Vercel: best-effort por isolate).
 */

type AttemptBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, AttemptBucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;

export function getClientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function checkAvaliacaoRateLimit(key: string): {
  allowed: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }
  if (current.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true };
}
