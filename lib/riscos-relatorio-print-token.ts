import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 5 * 60 * 1000;

export type RelatorioPrintTokenPayload = {
  campanhaId: string;
  relatorioId: string;
  exp: number;
};

function getPrintTokenSecret(): string {
  const secret =
    process.env.RISCOS_RELATORIO_PRINT_SECRET?.trim() ||
    process.env.AVALIACAO_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error(
      "Segredo para token de impressão indisponível (RISCOS_RELATORIO_PRINT_SECRET, AVALIACAO_SESSION_SECRET ou SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  return secret;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLen), "base64");
}

function signPayload(encodedPayload: string): string {
  return base64UrlEncode(
    createHmac("sha256", getPrintTokenSecret())
      .update(encodedPayload)
      .digest()
  );
}

export function criarRelatorioPrintToken(params: {
  campanhaId: string;
  relatorioId: string;
  ttlMs?: number;
}): string {
  const campanhaId = params.campanhaId.trim();
  const relatorioId = params.relatorioId.trim();
  if (!campanhaId || !relatorioId) {
    throw new Error("Campanha ou relatório inválido para token de impressão.");
  }

  const payload: RelatorioPrintTokenPayload = {
    campanhaId,
    relatorioId,
    exp: Date.now() + (params.ttlMs ?? TOKEN_TTL_MS),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verificarRelatorioPrintToken(
  token: string
): RelatorioPrintTokenPayload {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) {
    throw new Error("Token de impressão inválido.");
  }

  const encodedPayload = trimmed.slice(0, dot);
  const signature = trimmed.slice(dot + 1);
  const expected = signPayload(encodedPayload);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Token de impressão inválido.");
  }

  let payload: RelatorioPrintTokenPayload;
  try {
    payload = JSON.parse(
      base64UrlDecode(encodedPayload).toString("utf8")
    ) as RelatorioPrintTokenPayload;
  } catch {
    throw new Error("Token de impressão inválido.");
  }

  if (
    !payload?.campanhaId ||
    !payload?.relatorioId ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Token de impressão inválido.");
  }

  if (Date.now() > payload.exp) {
    throw new Error("Token de impressão expirado.");
  }

  return payload;
}
