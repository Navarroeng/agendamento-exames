/**
 * CPF único em campanha ativa (em_preparacao | aberta).
 */
import assert from "node:assert/strict";
import {
  formatMensagemCpfEmCampanhaAtiva,
  formatMotivoIgnoradoImportacao,
  isCampanhaStatusAtivoParaCpf,
  participanteOcupaCpfNaCampanha,
} from "../lib/riscos-cpf-campanha-ativa";
import { RISCOS_CAMPANHA_STATUS_ATIVOS } from "../lib/riscos-campanha-origem";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("status ativos bloqueiam", () => {
  assert.equal(isCampanhaStatusAtivoParaCpf("em_preparacao"), true);
  assert.equal(isCampanhaStatusAtivoParaCpf("aberta"), true);
  assert.deepEqual([...RISCOS_CAMPANHA_STATUS_ATIVOS], [
    "em_preparacao",
    "aberta",
  ]);
});

run("status encerrada/cancelada não bloqueiam", () => {
  assert.equal(isCampanhaStatusAtivoParaCpf("encerrada"), false);
  assert.equal(isCampanhaStatusAtivoParaCpf("cancelada"), false);
  assert.equal(isCampanhaStatusAtivoParaCpf("removida"), false);
});

run("participante removido/invalidado libera CPF", () => {
  assert.equal(
    participanteOcupaCpfNaCampanha({ status: "pendente" }),
    true
  );
  assert.equal(
    participanteOcupaCpfNaCampanha({ status: "respondido" }),
    true
  );
  assert.equal(
    participanteOcupaCpfNaCampanha({ status: "removido" }),
    false
  );
  assert.equal(
    participanteOcupaCpfNaCampanha({ status: "invalidado" }),
    false
  );
  assert.equal(
    participanteOcupaCpfNaCampanha({
      status: "pendente",
      removido_em: "2026-08-11",
    }),
    false
  );
});

run("mensagem de bloqueio contém empresa/código/status", () => {
  const msg = formatMensagemCpfEmCampanhaAtiva({
    participanteId: "p1",
    campanhaId: "c1",
    empresaNome: "Empresa A",
    codigoPublico: "AB12CD",
    status: "aberta",
  });
  assert.match(msg, /Empresa A/);
  assert.match(msg, /AB12CD/);
  assert.match(msg, /Aberta/);
  assert.match(msg, /Finalize ou cancele/i);
});

run("motivo de importação ignorada", () => {
  const m = formatMotivoIgnoradoImportacao({
    participanteId: "p1",
    campanhaId: "c1",
    empresaNome: "J. A. BRASIL",
    codigoPublico: "QCWMKJ",
    status: "aberta",
  });
  assert.equal(
    m,
    "CPF já pertence à campanha QCWMKJ da empresa J. A. BRASIL."
  );
});

run("cenários empresa diferente / mesma empresa (contrato lógico)", () => {
  // A regra é global: conflito em qualquer campanha ativa, independentemente do cliente.
  const conflitoOutraEmpresa = {
    participanteId: "p1",
    campanhaId: "camp-a",
    empresaNome: "Empresa A",
    codigoPublico: "AAAAAA",
    status: "aberta",
  };
  assert.equal(isCampanhaStatusAtivoParaCpf(conflitoOutraEmpresa.status), true);
  const msg = formatMensagemCpfEmCampanhaAtiva(conflitoOutraEmpresa);
  assert.match(msg, /Empresa A/);
});

console.log("\nTodos os testes de CPF em campanha ativa passaram.");
