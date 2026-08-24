/** Permissão da ação Abrir pesquisa (Riscos Psicossociais). */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { isPerfilAdmin } from "../lib/permissions";
import {
  isEmailAutorizadoAbrirPesquisaRiscos,
  podeAbrirPesquisaRiscos,
  RISCOS_ABRIR_PESQUISA_EMAILS_PERMITIDOS,
  RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG,
} from "../lib/riscos-abrir-pesquisa-permissao";

const root = join(__dirname, "..");

assert.equal(isPerfilAdmin("admin"), true);
assert.equal(isPerfilAdmin("operacional"), false);

assert.equal(podeAbrirPesquisaRiscos({ perfil: "admin" }), true);
assert.equal(
  podeAbrirPesquisaRiscos({ perfil: "admin", email: "qualquer@navarro.com.br" }),
  true
);

assert.equal(
  podeAbrirPesquisaRiscos({
    perfil: "operacional",
    email: "bruna@navarro.com.br",
  }),
  true
);
assert.equal(
  podeAbrirPesquisaRiscos({
    perfil: "operacional",
    email: "  RAFAELA@NAVARRO.COM.BR ",
  }),
  true
);
assert.equal(
  podeAbrirPesquisaRiscos({
    perfil: "operacional",
    emailAuth: "bruna@navarro.com.br",
  }),
  true
);

assert.equal(
  podeAbrirPesquisaRiscos({
    perfil: "operacional",
    email: "outro@navarro.com.br",
  }),
  false
);
assert.equal(
  podeAbrirPesquisaRiscos({ perfil: "operacional", email: "Bruna" }),
  false
);
assert.equal(
  podeAbrirPesquisaRiscos({ perfil: "operacional" }),
  false
);
assert.equal(isEmailAutorizadoAbrirPesquisaRiscos("Bruna"), false);
assert.equal(
  isEmailAutorizadoAbrirPesquisaRiscos("bruna@navarro.com.br"),
  true
);

assert.deepEqual(
  [...RISCOS_ABRIR_PESQUISA_EMAILS_PERMITIDOS],
  ["bruna@navarro.com.br", "rafaela@navarro.com.br"]
);

assert.equal(
  RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG,
  "Você não possui permissão para abrir esta pesquisa."
);

const api = readFileSync(
  join(root, "app/api/riscos/campanha/[campanhaId]/abrir/route.ts"),
  "utf8"
);
assert.match(api, /podeAbrirPesquisaRiscos/);
assert.match(api, /RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG/);
assert.doesNotMatch(api, /Somente administradores podem abrir a pesquisa/);
assert.doesNotMatch(api, /isPerfilAdmin\(perfil\.perfil\)/);

const excluir = readFileSync(
  join(root, "app/api/riscos/campanha/[campanhaId]/excluir/route.ts"),
  "utf8"
);
assert.match(excluir, /isPerfilAdmin\(perfil\.perfil\)/);
assert.doesNotMatch(excluir, /podeAbrirPesquisaRiscos/);

const encerrar = readFileSync(
  join(root, "app/api/riscos/campanha/[campanhaId]/encerrar/route.ts"),
  "utf8"
);
assert.match(encerrar, /isPerfilAdmin\(perfil\.perfil\)/);
assert.doesNotMatch(encerrar, /podeAbrirPesquisaRiscos/);

const painel = readFileSync(
  join(root, "components/riscos-psicossociais/RiscosPainelCards.tsx"),
  "utf8"
);
assert.match(painel, /podeAbrirPesquisaRiscos/);
assert.match(painel, /RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG/);

const hook = readFileSync(
  join(root, "hooks/useRiscosPsicossociaisPage.ts"),
  "utf8"
);
assert.match(hook, /podeAbrirPesquisaRiscos/);
assert.match(hook, /handleRemoverProcesso/);
assert.match(hook, /if \(!isAdmin\)/);

console.log("test-riscos-abrir-pesquisa-permissao: ok");
