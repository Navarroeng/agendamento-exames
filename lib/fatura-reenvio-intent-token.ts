import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const INTENT_TTL_MS = 10 * 60 * 1000;

export type FaturaReenvioIntentPayload = {
  faturaId: string;
  versaoIdentidade: string;
  intentId: string;
  exp: number;
};

function getIntentTokenSecret(): string {
  const secret =
    process.env.FATURA_REENVIO_SECRET?.trim() ||
    process.env.AVALIACAO_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error(
      "Segredo para intent de reenvio de fatura indisponível (FATURA_REENVIO_SECRET, AVALIACAO_SESSION_SECRET ou SUPABASE_SERVICE_ROLE_KEY)."
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
    createHmac("sha256", getIntentTokenSecret())
      .update(encodedPayload)
      .digest()
  );
}

/** Token efêmero emitido pelo servidor para um reenvio explícito (anti-duplo clique). */
export function criarFaturaReenvioIntentToken(params: {
  faturaId: string;
  versaoIdentidade: string;
  ttlMs?: number;
}): string {
  const faturaId = params.faturaId.trim();
  const versaoIdentidade = params.versaoIdentidade.trim();
  if (!faturaId || !versaoIdentidade) {
    throw new Error("Dados inválidos para intent de reenvio de fatura.");
  }

  const payload: FaturaReenvioIntentPayload = {
    faturaId,
    versaoIdentidade,
    intentId: randomUUID(),
    exp: Date.now() + (params.ttlMs ?? INTENT_TTL_MS),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verificarFaturaReenvioIntentToken(
  token: string
): FaturaReenvioIntentPayload {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) {
    throw new Error("Intent de reenvio inválido.");
  }

  const encodedPayload = trimmed.slice(0, dot);
  const signature = trimmed.slice(dot + 1);
  const expected = signPayload(encodedPayload);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Intent de reenvio inválido.");
  }

  let payload: FaturaReenvioIntentPayload;
  try {
    payload = JSON.parse(
      base64UrlDecode(encodedPayload).toString("utf8")
    ) as FaturaReenvioIntentPayload;
  } catch {
    throw new Error("Intent de reenvio inválido.");
  }

  if (
    !payload?.faturaId ||
    !payload?.versaoIdentidade ||
    !payload?.intentId ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Intent de reenvio inválido.");
  }

  if (Date.now() > payload.exp) {
    throw new Error("Intent de reenvio expirado. Inicie o reenvio novamente.");
  }

  return payload;
}
