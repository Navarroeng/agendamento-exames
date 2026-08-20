import assert from "node:assert/strict";
import {
  acoesConvitePorStatus,
  campanhaExibeLinkConvite,
  campanhaPermiteCopiarLink,
  isPesquisaEfetivamenteAberta,
  validateAbrirCampanhaRiscos,
  validateEncerrarCampanhaRiscos,
  validatePreRequisitosAbrirCampanha,
} from "../lib/riscos-campanha";
import { assertStatusAbertaPersistido } from "../services/riscos-campanha-abrir.server";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const base = {
  status: "em_preparacao" as const,
  data_inicio: "2026-08-01",
  data_encerramento: "2026-08-31",
};

run("abrir dentro do período", () => {
  assert.equal(validateAbrirCampanhaRiscos(base, "2026-08-10"), null);
});

run("bloquear sem datas", () => {
  assert.ok(
    validateAbrirCampanhaRiscos({
      ...base,
      data_inicio: "",
      data_encerramento: "2026-08-31",
    })
  );
});

run("bloquear fora do período", () => {
  const msg = validateAbrirCampanhaRiscos(base, "2026-09-01");
  assert.ok(msg);
  assert.match(msg!, /período/i);
});

run("bloquear já aberta", () => {
  assert.ok(
    validateAbrirCampanhaRiscos({ ...base, status: "aberta" }, "2026-08-10")
  );
});

run("bloquear encerrada", () => {
  assert.ok(
    validateAbrirCampanhaRiscos({ ...base, status: "encerrada" }, "2026-08-10")
  );
});

run("pré-requisitos: lista + participantes OK (manual sem laudos)", () => {
  assert.equal(
    validatePreRequisitosAbrirCampanha({
      listaPresencaConcluida: true,
      participantesCadastrados: 3,
      exigeLaudosSst: false,
      laudosSstConcluido: false,
    }),
    null
  );
});

run("pré-requisitos: laudos exigidos bloqueiam abertura", () => {
  const msg = validatePreRequisitosAbrirCampanha({
    listaPresencaConcluida: true,
    participantesCadastrados: 1,
    exigeLaudosSst: true,
    laudosSstConcluido: false,
  });
  assert.ok(msg);
  assert.match(msg!, /Laudos SST/i);
});

run("pré-requisitos: lista pendente bloqueia", () => {
  assert.ok(
    validatePreRequisitosAbrirCampanha({
      listaPresencaConcluida: false,
      participantesCadastrados: 2,
      exigeLaudosSst: false,
    })
  );
});

run("convite: em preparação não exibe link", () => {
  assert.equal(campanhaExibeLinkConvite("em_preparacao"), false);
  assert.equal(campanhaPermiteCopiarLink("em_preparacao"), false);
  assert.equal(isPesquisaEfetivamenteAberta("em_preparacao"), false);
  assert.equal(isPesquisaEfetivamenteAberta(null), false);
});

run("convite: aberta exibe e permite copiar", () => {
  assert.equal(campanhaExibeLinkConvite("aberta"), true);
  assert.equal(campanhaPermiteCopiarLink("aberta"), true);
  assert.equal(isPesquisaEfetivamenteAberta("aberta"), true);
});

run("convite: encerrada exibe mas não copia", () => {
  assert.equal(campanhaExibeLinkConvite("encerrada"), true);
  assert.equal(campanhaPermiteCopiarLink("encerrada"), false);
  assert.equal(isPesquisaEfetivamenteAberta("encerrada"), true);
});

run("ações: em_preparacao → Abrir sim, Encerrar não", () => {
  const a = acoesConvitePorStatus("em_preparacao");
  assert.equal(a.exibirAbrir, true);
  assert.equal(a.exibirEncerrar, false);
  assert.equal(a.exibirLink, false);
});

run("ações: aberta → Abrir não, Encerrar sim, link sim", () => {
  const a = acoesConvitePorStatus("aberta");
  assert.equal(a.exibirAbrir, false);
  assert.equal(a.exibirEncerrar, true);
  assert.equal(a.exibirLink, true);
  assert.equal(a.permitirCopiarLink, true);
});

run("ações: encerrada → sem Abrir/Encerrar, link informativo", () => {
  const a = acoesConvitePorStatus("encerrada");
  assert.equal(a.exibirAbrir, false);
  assert.equal(a.exibirEncerrar, false);
  assert.equal(a.exibirLink, true);
  assert.equal(a.permitirCopiarLink, false);
});

run("confirmação: status aberta passa", () => {
  assert.doesNotThrow(() =>
    assertStatusAbertaPersistido({
      status: "aberta",
      codigo_publico: "QCWMKJ",
    } as never)
  );
});

run("confirmação: em_preparacao falha (não permite UI Aberta)", () => {
  assert.throws(
    () =>
      assertStatusAbertaPersistido({
        status: "em_preparacao",
        codigo_publico: "QCWMKJ",
      } as never),
    /não foi confirmada/i
  );
});

run("encerrar: só aberta pode encerrar", () => {
  assert.equal(validateEncerrarCampanhaRiscos({ status: "aberta" }), null);
  assert.ok(validateEncerrarCampanhaRiscos({ status: "em_preparacao" }));
  assert.ok(validateEncerrarCampanhaRiscos({ status: "encerrada" }));
});

run("ações com status null (pré-sync) → nada de Abrir/Encerrar/link", () => {
  const a = acoesConvitePorStatus(null);
  assert.equal(a.exibirAbrir, false);
  assert.equal(a.exibirEncerrar, false);
  assert.equal(a.exibirLink, false);
  assert.equal(a.permitirCopiarLink, false);
});

console.log("\nTodos os testes de abertura de campanha passaram.");
