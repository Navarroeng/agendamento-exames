/**
 * Recuperação de senha pelo Supabase Auth.
 *
 * A URL de produção precisa estar em
 * Authentication → URL Configuration → Redirect URLs:
 * https://sst.navarroeng.com.br/redefinir-senha
 */

export const REDEFINIR_SENHA_PATH = "/redefinir-senha";
export const LOGIN_PATH = "/login";

export const URL_REDEFINIR_SENHA_PRODUCAO =
  "https://sst.navarroeng.com.br/redefinir-senha";

export const MENSAGEM_LINK_RECUPERACAO_INVALIDO =
  "Este link de recuperação está inválido ou expirou.";

export const MENSAGEM_RECUPERACAO_SOLICITADA =
  "Se este e-mail estiver cadastrado, enviaremos um link para redefinir a senha. Verifique a caixa de entrada e o spam.";

export const MENSAGEM_SENHA_REDEFINIDA =
  "Senha redefinida. Entre com a nova senha.";

export const CHAVE_SESSAO_RECUPERACAO = "sst-recuperacao-senha";

export const SENHA_MIN_LENGTH = 6;

const CHAVES_AUTH = [
  "code",
  "error",
  "error_code",
  "error_description",
  "type",
  "token_hash",
] as const;

const CODIGOS_LINK_INVALIDO = new Set([
  "otp_expired",
  "otp_disabled",
  "flow_state_expired",
  "flow_state_not_found",
  "bad_code_verifier",
  "bad_oauth_callback",
  "bad_oauth_state",
]);

const TRECHOS_LINK_INVALIDO = [
  "email link is invalid",
  "link is invalid",
  "has expired",
  "otp has expired",
  "already been used",
  "already used",
  "code verifier",
];

export type ParametrosAuthUrl = {
  code: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  type: string | null;
  tokenHash: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export function cookieIndicaSessaoSupabase(
  name: string,
  value: string | undefined
): boolean {
  if (!name.includes("auth-token")) return false;
  // O verificador PKCE da recuperação usa o mesmo prefixo e não é uma sessão.
  if (name.includes("code-verifier")) return false;
  const trimmed = value?.trim();
  return Boolean(
    trimmed && trimmed !== "null" && trimmed !== "{}" && trimmed !== "[]"
  );
}

export function urlRedefinirSenha(origin: string): string {
  const base = origin.trim().replace(/\/$/, "");
  return `${base}${REDEFINIR_SENHA_PATH}`;
}

export function parametrosAuthDaUrl(href: string): ParametrosAuthUrl {
  const url = new URL(href, URL_REDEFINIR_SENHA_PRODUCAO);
  const hash = new URLSearchParams(
    url.hash.startsWith("#") ? url.hash.slice(1) : ""
  );
  const pick = (key: string) => url.searchParams.get(key) ?? hash.get(key);
  return {
    code: pick("code"),
    error: pick("error"),
    errorCode: pick("error_code"),
    errorDescription: pick("error_description"),
    type: pick("type"),
    tokenHash: pick("token_hash"),
    accessToken: pick("access_token"),
    refreshToken: pick("refresh_token"),
  };
}

export function linkRecuperacaoInvalido(
  params: Pick<ParametrosAuthUrl, "error" | "errorCode" | "errorDescription">
): boolean {
  const code = (params.errorCode ?? "").trim().toLowerCase();
  if (CODIGOS_LINK_INVALIDO.has(code)) return true;

  const texto = `${params.errorDescription ?? ""} ${params.error ?? ""}`
    .trim()
    .toLowerCase();
  if (!texto) return false;
  return TRECHOS_LINK_INVALIDO.some((trecho) => texto.includes(trecho));
}

export function callbackRecuperacaoNaUrl(params: ParametrosAuthUrl): boolean {
  if (linkRecuperacaoInvalido(params)) return false;
  if (params.code || params.tokenHash) return true;
  return (
    params.type === "recovery" &&
    Boolean(params.accessToken) &&
    Boolean(params.refreshToken)
  );
}

export function copiarParametrosAuth(origem: URLSearchParams): string {
  const destino = new URLSearchParams();
  for (const chave of CHAVES_AUTH) {
    const valor = origem.get(chave);
    if (valor) destino.set(chave, valor);
  }
  const qs = destino.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Visitante sem sessão. Devolve o caminho interno para onde o link deve seguir.
 * Login e redefinição permanecem onde estão para o cliente ler o código ou o erro.
 */
export function destinoVisitanteComParametrosAuth(
  pathname: string,
  origem: URLSearchParams
): string | null {
  if (pathname === LOGIN_PATH || pathname === REDEFINIR_SENHA_PATH) return null;

  const qs = copiarParametrosAuth(origem);
  if (!qs) return null;

  const params = parametrosAuthDaUrl(`https://sst.navarroeng.com.br${pathname}${qs}`);
  if (params.code || params.tokenHash || params.type === "recovery") {
    return `${REDEFINIR_SENHA_PATH}${qs}`;
  }
  if (linkRecuperacaoInvalido(params)) {
    return `${LOGIN_PATH}${qs}`;
  }
  return null;
}

export function resultadoSolicitacaoRecuperacao(
  error: { code?: string | null; message?: string | null } | null
): { confirmacaoGenerica: boolean; mensagem: string } {
  if (!error) {
    return {
      confirmacaoGenerica: true,
      mensagem: MENSAGEM_RECUPERACAO_SOLICITADA,
    };
  }

  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();
  if (
    code.includes("rate_limit") ||
    message.includes("rate limit") ||
    message.includes("too many")
  ) {
    return {
      confirmacaoGenerica: false,
      mensagem: "Aguarde alguns instantes antes de solicitar outro link.",
    };
  }

  if (
    code === "validation_failed" ||
    message.includes("unable to validate email") ||
    message.includes("invalid format")
  ) {
    return { confirmacaoGenerica: false, mensagem: "Informe um e-mail válido." };
  }

  return {
    confirmacaoGenerica: true,
    mensagem: MENSAGEM_RECUPERACAO_SOLICITADA,
  };
}

export function validarNovaSenha(senha: string, confirmacao: string): string | null {
  if (!senha || !confirmacao) return "Informe e confirme a nova senha.";
  if (senha.length < SENHA_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${SENHA_MIN_LENGTH} caracteres.`;
  }
  if (senha !== confirmacao) return "A confirmação não confere com a nova senha.";
  return null;
}

export function mensagemErroNovaSenha(message: string): string {
  const texto = message.toLowerCase();
  const minimo = message.match(/at least (\d+)/i);
  if (minimo) {
    return `A senha deve ter pelo menos ${minimo[1]} caracteres.`;
  }
  if (texto.includes("should be different") || texto.includes("same password")) {
    return "A nova senha precisa ser diferente da senha atual.";
  }
  if (
    texto.includes("auth session missing") ||
    texto.includes("session expired") ||
    texto.includes("jwt") ||
    linkRecuperacaoInvalido({
      error: message,
      errorDescription: message,
      errorCode: null,
    })
  ) {
    return MENSAGEM_LINK_RECUPERACAO_INVALIDO;
  }
  return "Não foi possível salvar a nova senha. Solicite um novo link e tente outra vez.";
}
