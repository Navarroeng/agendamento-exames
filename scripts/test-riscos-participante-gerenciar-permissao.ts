/** Permissão de Editar/Remover participante (Riscos Psicossociais). */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { isPerfilAdmin } from "../lib/permissions";
import {
  podeAbrirPesquisaRiscos,
  podeGerenciarParticipanteRiscos,
  RISCOS_ABRIR_PESQUISA_EMAILS_PERMITIDOS,
  RISCOS_GERENCIAR_PARTICIPANTE_SEM_PERMISSAO_MSG,
} from "../lib/riscos-abrir-pesquisa-permissao";
import {
  acoesMenuParticipantePorStatus,
  podeEditarDadosParticipante,
} from "../lib/riscos-participante-acoes";
import { validateRiscosParticipanteInput } from "../lib/riscos-campanha-participantes";
import { precisaConfirmacaoForteRemocao } from "../lib/riscos-remocao-participante";
import { auditoriaActorFromSessionPerfil } from "../lib/auditoria";

const root = join(__dirname, "..");
const BRUNA = "bruna@navarro.com.br";
const RAFAELA = "rafaela@navarro.com.br";
const KAROLINE = "assessoria@navarroeng.com.br";

function assertPodeGerenciar(
  label: string,
  input: Parameters<typeof podeGerenciarParticipanteRiscos>[0],
  expected: boolean
) {
  assert.equal(
    podeGerenciarParticipanteRiscos(input),
    expected,
    label
  );
  assert.equal(
    podeAbrirPesquisaRiscos(input),
    expected,
    `${label} (mesmo grupo de abrir pesquisa)`
  );
}

assert.equal(isPerfilAdmin("admin"), true);
assert.equal(isPerfilAdmin("operacional"), false);

assertPodeGerenciar("CASO 1 — Admin gerencia participante", { perfil: "admin" }, true);
assertPodeGerenciar(
  "CASO 2 — Bruna gerencia participante",
  { perfil: "operacional", email: BRUNA },
  true
);
assertPodeGerenciar(
  "CASO 3 — Rafaela gerencia participante",
  { perfil: "operacional", email: RAFAELA },
  true
);
assertPodeGerenciar(
  "CASO 4 — Karoline gerencia participante",
  { perfil: "operacional", email: KAROLINE },
  true
);
assertPodeGerenciar(
  "CASO 4b — Karoline por e-mail Auth",
  { perfil: "operacional", emailAuth: "  ASSESSORIA@NAVARROENG.COM.BR " },
  true
);
assertPodeGerenciar(
  "CASO 5 — operacional fora da allowlist não gerencia",
  { perfil: "operacional", email: "outro@navarro.com.br" },
  false
);
assertPodeGerenciar(
  "CASO 5b — nome exibido não autoriza",
  { perfil: "operacional", email: "Bruna" },
  false
);
assertPodeGerenciar(
  "CASO 5c — operacional sem e-mail não gerencia",
  { perfil: "operacional" },
  false
);

assert.deepEqual(
  [...RISCOS_ABRIR_PESQUISA_EMAILS_PERMITIDOS],
  [BRUNA, RAFAELA, KAROLINE]
);

assert.equal(
  RISCOS_GERENCIAR_PARTICIPANTE_SEM_PERMISSAO_MSG,
  "Você não possui permissão para gerenciar participantes desta pesquisa."
);

const editApi = readFileSync(
  join(root, "app/api/riscos/participante/[participanteId]/route.ts"),
  "utf8"
);
const removeApi = readFileSync(
  join(root, "app/api/riscos/participante/[participanteId]/remover/route.ts"),
  "utf8"
);
const hook = readFileSync(
  join(root, "hooks/useRiscosPsicossociaisPage.ts"),
  "utf8"
);
const page = readFileSync(
  join(root, "components/riscos-psicossociais/RiscosPsicossociaisPage.tsx"),
  "utf8"
);
const section = readFileSync(
  join(root, "components/riscos-psicossociais/RiscosCampanhaParticipantesSection.tsx"),
  "utf8"
);
const encerrar = readFileSync(
  join(root, "app/api/riscos/campanha/[campanhaId]/encerrar/route.ts"),
  "utf8"
);
const excluir = readFileSync(
  join(root, "app/api/riscos/campanha/[campanhaId]/excluir/route.ts"),
  "utf8"
);
const permissions = readFileSync(join(root, "lib/permissions.ts"), "utf8");

assert.match(editApi, /podeGerenciarParticipanteRiscos/);
assert.match(editApi, /RISCOS_GERENCIAR_PARTICIPANTE_SEM_PERMISSAO_MSG/);
assert.match(editApi, /status: 403/);
assert.doesNotMatch(editApi, /isPerfilAdmin/);
assert.doesNotMatch(editApi, /Somente administradores podem editar/);
assert.match(editApi, /auditoriaActorFromSessionPerfil/);

assert.match(removeApi, /podeGerenciarParticipanteRiscos/);
assert.match(removeApi, /RISCOS_GERENCIAR_PARTICIPANTE_SEM_PERMISSAO_MSG/);
assert.match(removeApi, /status: 403/);
assert.doesNotMatch(removeApi, /isPerfilAdmin/);
assert.doesNotMatch(removeApi, /Somente administradores podem remover/);
assert.match(removeApi, /auditoriaActorFromSessionPerfil/);
assert.match(
  removeApi,
  /auditContext:\s*auditoriaActorFromSessionPerfil\(\{\s*user,\s*perfil/
);

assert.match(hook, /podeGerenciarParticipanteRiscos/);
assert.match(hook, /if \(!podeGerenciarParticipante\)/);
assert.doesNotMatch(hook, /Somente administradores podem editar participantes/);
assert.doesNotMatch(hook, /Somente administradores podem remover participantes/);
assert.match(page, /podeGerenciarParticipante=\{podeGerenciarParticipante\}/);
assert.doesNotMatch(page, /podeGerenciarParticipante=\{isAdmin\}/);
assert.match(section, /podeGerenciarParticipante &&/);
assert.match(section, /window\.confirm/);

assert.match(encerrar, /isPerfilAdmin\(perfil\.perfil\)/);
assert.doesNotMatch(encerrar, /podeGerenciarParticipanteRiscos/);
assert.match(excluir, /isPerfilAdmin\(perfil\.perfil\)/);
assert.doesNotMatch(excluir, /podeGerenciarParticipanteRiscos/);
assert.match(permissions, /deniedPaths: \[/);
assert.match(permissions, /"\/exames"/);
assert.match(permissions, /"\/auditoria"/);
assert.match(permissions, /"\/gestao-comercial"/);
assert.doesNotMatch(permissions, /bruna@navarro\.com\.br/);

assert.deepEqual(acoesMenuParticipantePorStatus("pendente"), {
  exibirEditar: true,
  exibirRemover: true,
});
assert.equal(podeEditarDadosParticipante("iniciado"), false);
assert.equal(podeEditarDadosParticipante("respondido"), false);
assert.equal(
  validateRiscosParticipanteInput({
    nomeCompleto: "",
    cpf: "529.982.247-25",
    dataNascimento: "15/05/1990",
  }),
  "Informe o nome completo."
);
assert.equal(
  validateRiscosParticipanteInput({
    nomeCompleto: "Ana",
    cpf: "00000000000",
    dataNascimento: "15/05/1990",
  }),
  "Informe um CPF válido."
);
assert.equal(precisaConfirmacaoForteRemocao("respondido"), true);
assert.equal(precisaConfirmacaoForteRemocao("pendente"), false);
assert.deepEqual(acoesMenuParticipantePorStatus("invalidado"), {
  exibirEditar: false,
  exibirRemover: false,
});

const actor = auditoriaActorFromSessionPerfil({
  user: { id: "sessao-real", email: "sessao@navarro.com.br" },
  perfil: { nome: "Rafaela", email: RAFAELA },
});
assert.equal(actor.usuarioId, "sessao-real");
assert.equal(actor.usuarioNome, "Rafaela");
assert.equal(actor.usuarioEmail, RAFAELA);
assert.notEqual(actor.usuarioNome, "Hacker");

console.log("test-riscos-participante-gerenciar-permissao: ok");
