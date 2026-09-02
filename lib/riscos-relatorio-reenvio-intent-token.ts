import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const INTENT_TTL_MS = 10 * 60 * 1000;

export type RelatorioReenvioIntentPayload = {
  campanhaId: string;
  relatorioId: string;
  geradoEm: string;
  intentId: string;
  exp: number;
};

function getIntentTokenSecret(): string {
  const secret =
    process.env.RISCOS_RELATORIO_REENVIO_SECRET?.trim() ||
    process.env.RISCOS_RELATORIO_PRINT_SECRET?.trim() ||
    process.env.AVALIACAO_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error(
      "Segredo para intent de reenvio indisponível (RISCOS_RELATORIO_REENVIO_SECRET, RISCOS_RELATORIO_PRINT_SECRET, AVALIACAO_SESSION_SECRET ou SUPABASE_SERVICE_ROLE_KEY)."
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
export function criarReenvioIntentToken(params: {
  campanhaId: string;
  relatorioId: string;
  geradoEm: string;
  ttlMs?: number;
}): string {
  const campanhaId = params.campanhaId.trim();
  const relatorioId = params.relatorioId.trim();
  const geradoEm = params.geradoEm.trim();
  if (!campanhaId || !relatorioId || !geradoEm) {
    throw new Error("Dados inválidos para intent de reenvio.");
  }

  const payload: RelatorioReenvioIntentPayload = {
    campanhaId,
    relatorioId,
    geradoEm,
    intentId: randomUUID(),
    exp: Date.now() + (params.ttlMs ?? INTENT_TTL_MS),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verificarReenvioIntentToken(
  token: string
): RelatorioReenvioIntentPayload {
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

  let payload: RelatorioReenvioIntentPayload;
  try {
    payload = JSON.parse(
      base64UrlDecode(encodedPayload).toString("utf8")
    ) as RelatorioReenvioIntentPayload;
  } catch {
    throw new Error("Intent de reenvio inválido.");
  }

  if (
    !payload?.campanhaId ||
    !payload?.relatorioId ||
    !payload?.geradoEm ||
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
