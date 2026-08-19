import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import {
  AVALIACAO_SESSION_COOKIE,
  MENSAGEM_VALIDACAO_GENERICA,
} from "@/lib/avaliacao-constantes";

export { AVALIACAO_SESSION_COOKIE, MENSAGEM_VALIDACAO_GENERICA };

const SCRYPT_KEYLEN = 64;

/** Normaliza código compartilhado (maiúsculas, sem espaços). */
export function normalizeCodigoAcessoCampanha(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

/** Gera código compartilhado legível (ex.: NAV7K2P). */
export function gerarCodigoAcessoCompartilhado(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export function hashCodigoAcessoCampanha(
  codigo: string,
  saltHex: string
): string {
  const normalized = normalizeCodigoAcessoCampanha(codigo);
  const salt = Buffer.from(saltHex, "hex");
  return scryptSync(normalized, salt, SCRYPT_KEYLEN).toString("hex");
}

export function criarHashCodigoAcessoCampanha(codigo: string): {
  salt: string;
  hash: string;
  exibicao: string;
} {
  const exibicao = normalizeCodigoAcessoCampanha(codigo);
  const salt = randomBytes(16).toString("hex");
  const hash = hashCodigoAcessoCampanha(exibicao, salt);
  return { salt, hash, exibicao };
}

export function verificarCodigoAcessoCampanha(
  codigoInformado: string,
  saltHex: string | null | undefined,
  hashHex: string | null | undefined
): boolean {
  if (!saltHex || !hashHex) return false;
  try {
    const computed = Buffer.from(
      hashCodigoAcessoCampanha(codigoInformado, saltHex),
      "hex"
    );
    const expected = Buffer.from(hashHex, "hex");
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

export type AvaliacaoSessionPayload = {
  v: 1;
  campanhaId: string;
  participanteId: string;
  codigoPublico: string;
  exp: number;
};

const AVALIACAO_SESSION_SECRET_MISSING =
  "AVALIACAO_SESSION_SECRET não configurada. Defina um segredo próprio no servidor.";

function sessionSecret(): string {
  const secret = process.env.AVALIACAO_SESSION_SECRET;
  if (typeof secret !== "string" || secret.trim() === "") {
    throw new Error(AVALIACAO_SESSION_SECRET_MISSING);
  }
  return secret.trim();
}

function sign(body: string): string {
  return createHash("sha256")
    .update(`${body}.${sessionSecret()}`)
    .digest("hex");
}

export function createAvaliacaoSessionToken(
  payload: Omit<AvaliacaoSessionPayload, "v" | "exp">,
  ttlSeconds = 60 * 60 * 8
): string {
  const full: AvaliacaoSessionPayload = {
    v: 1,
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyAvaliacaoSessionToken(
  token: string | undefined | null
): AvaliacaoSessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as AvaliacaoSessionPayload;
    if (parsed.v !== 1) return null;
    if (!parsed.campanhaId || !parsed.participanteId || !parsed.codigoPublico) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
