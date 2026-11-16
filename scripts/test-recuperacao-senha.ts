/**
 * Recuperação de senha: link expirado, confirmação genérica e portal da AGROVIAS.
 * Rode: npx tsx scripts/test-recuperacao-senha.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { canAccessPath } from "../lib/permissions";
import { PORTAL_AGROVIAS_PATH } from "../lib/acesso-externo-agrovias";
import {
  callbackRecuperacaoNaUrl,
  cookieIndicaSessaoSupabase,
  destinoVisitanteComParametrosAuth,
  linkRecuperacaoInvalido,
  MENSAGEM_LINK_RECUPERACAO_INVALIDO,
  MENSAGEM_RECUPERACAO_SOLICITADA,
  parametrosAuthDaUrl,
  REDEFINIR_SENHA_PATH,
  resultadoSolicitacaoRecuperacao,
  URL_REDEFINIR_SENHA_PRODUCAO,
  urlRedefinirSenha,
  validarNovaSenha,
} from "../lib/recuperacao-senha";

const root = process.cwd();

function ler(relativo: string) {
  return fs.readFileSync(path.join(root, relativo), "utf8");
}

assert.equal(
  URL_REDEFINIR_SENHA_PRODUCAO,
  "https://sst.navarroeng.com.br/redefinir-senha"
);
assert.equal(
  urlRedefinirSenha("https://sst.navarroeng.com.br"),
  URL_REDEFINIR_SENHA_PRODUCAO
);
assert.equal(
  urlRedefinirSenha("http://localhost:3000/"),
  "http://localhost:3000/redefinir-senha"
);

const expirado = parametrosAuthDaUrl(
  "https://sst.navarroeng.com.br/?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
);
assert.equal(expirado.errorCode, "otp_expired");
assert.equal(linkRecuperacaoInvalido(expirado), true);
assert.equal(callbackRecuperacaoNaUrl(expirado), false);

const hashExpirado = parametrosAuthDaUrl(
  "https://sst.navarroeng.com.br/login#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
);
assert.equal(linkRecuperacaoInvalido(hashExpirado), true);

const usado = parametrosAuthDaUrl(
  "https://sst.navarroeng.com.br/redefinir-senha?error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
);
assert.equal(linkRecuperacaoInvalido(usado), true);

assert.equal(
  linkRecuperacaoInvalido({
    error: null,
    errorCode: "flow_state_expired",
    errorDescription: null,
  }),
  true
);

assert.equal(
  destinoVisitanteComParametrosAuth(
    "/",
    new URLSearchParams(
      "error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
    )
  ),
  "/login?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
);

assert.equal(
  destinoVisitanteComParametrosAuth("/", new URLSearchParams("code=abc123")),
  "/redefinir-senha?code=abc123"
);

assert.equal(
  destinoVisitanteComParametrosAuth(
    "/login",
    new URLSearchParams("error_code=otp_expired")
  ),
  null
);
assert.equal(
  destinoVisitanteComParametrosAuth(
    REDEFINIR_SENHA_PATH,
    new URLSearchParams("code=abc123")
  ),
  null
);
assert.equal(
  destinoVisitanteComParametrosAuth("/dashboard", new URLSearchParams()),
  null
);

const sucesso = resultadoSolicitacaoRecuperacao(null);
const inexistente = resultadoSolicitacaoRecuperacao({
  code: "user_not_found",
  message: "User not found",
});
assert.equal(sucesso.confirmacaoGenerica, true);
assert.equal(inexistente.confirmacaoGenerica, true);
assert.equal(sucesso.mensagem, inexistente.mensagem);
assert.equal(sucesso.mensagem, MENSAGEM_RECUPERACAO_SOLICITADA);
assert.equal(sucesso.mensagem.includes("não encontr"), false);
assert.equal(sucesso.mensagem.includes(inexistente.mensagem), true);

assert.equal(
  resultadoSolicitacaoRecuperacao({
    code: "over_email_send_rate_limit",
    message: "Email rate limit exceeded",
  }).confirmacaoGenerica,
  false
);

assert.equal(validarNovaSenha("", "abc"), "Informe e confirme a nova senha.");
assert.match(validarNovaSenha("123", "123") ?? "", /pelo menos 6/);
assert.equal(
  validarNovaSenha("123456", "1234567"),
  "A confirmação não confere com a nova senha."
);
assert.equal(validarNovaSenha("123456", "123456"), null);

assert.equal(canAccessPath("portal_agrovias", PORTAL_AGROVIAS_PATH), true);
assert.equal(canAccessPath("portal_agrovias", "/dashboard"), false);
assert.equal(canAccessPath("portal_agrovias", "/clientes"), false);
assert.equal(canAccessPath("portal_agrovias", REDEFINIR_SENHA_PATH), false);
assert.equal(canAccessPath("admin", "/dashboard"), true);
assert.equal(canAccessPath("operacional", "/"), true);

const login = ler("components/auth/LoginPage.tsx");
const hookLogin = ler("hooks/useLoginForm.ts");
const redefinir = ler("components/auth/RedefinirSenhaPage.tsx");
const hookRedefinir = ler("hooks/useRedefinirSenha.ts");
const middleware = ler("middleware.ts");

assert.match(login, /Esqueci minha senha/);
assert.match(login, /Solicitar novo link/);
assert.match(login, /MENSAGEM_LINK_RECUPERACAO_INVALIDO|mensagemLinkInvalido/);
assert.match(hookLogin, /resultadoSolicitacaoRecuperacao/);
assert.match(hookLogin, /PORTAL_AGROVIAS_PATH/);
assert.match(hookLogin, /E-mail ou senha incorretos/);
assert.doesNotMatch(hookLogin, /otp_expired[\s\S]{0,80}E-mail ou senha incorretos/);

assert.match(redefinir, /Redefinir senha/);
assert.match(redefinir, /Nova senha/);
assert.match(redefinir, /Confirmar nova senha/);
assert.match(redefinir, /Salvar nova senha/);
assert.match(redefinir, /Solicitar novo link/);
assert.match(redefinir, /\/login\?recuperar=1/);
assert.match(hookRedefinir, /PASSWORD_RECOVERY|CHAVE_SESSAO_RECUPERACAO/);
assert.match(hookRedefinir, /\/login\?senha=redefinida/);
assert.match(hookRedefinir, /sessaoRecuperacaoValida/);
assert.match(middleware, /REDEFINIR_SENHA_PATH/);
assert.match(middleware, /destinoVisitanteComParametrosAuth/);
assert.match(middleware, /cookieIndicaSessaoSupabase/);

assert.equal(
  cookieIndicaSessaoSupabase("sb-projeto-auth-token", "sessao"),
  true
);
assert.equal(
  cookieIndicaSessaoSupabase("sb-projeto-auth-token.0", "parte"),
  true
);
assert.equal(
  cookieIndicaSessaoSupabase("sb-projeto-auth-token-code-verifier", "verifier"),
  false
);
assert.equal(cookieIndicaSessaoSupabase("sb-projeto-auth-token", ""), false);
assert.equal(cookieIndicaSessaoSupabase("outro", "sessao"), false);

console.log("test-recuperacao-senha: OK");
