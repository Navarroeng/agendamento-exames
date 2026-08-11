/**
 * Regras do menu ⋮ da listagem de Riscos Psicossociais.
 */
import assert from "node:assert/strict";
import { acoesMenuListagemProcessoRiscos } from "../lib/riscos-campanha";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("em_preparacao: Abrir ok, Copiar/Relatório off, Remover admin", () => {
  const a = acoesMenuListagemProcessoRiscos({
    campanhaStatus: "em_preparacao",
    codigoPublico: "ABC123",
    isAdmin: true,
    hasCampanha: true,
  });
  assert.equal(a.podeAbrir, true);
  assert.equal(a.podeCopiarLink, false);
  assert.match(a.copiarLinkMotivoDesabilitado, /após abrir/i);
  assert.equal(a.podeGerarRelatorio, false);
  assert.equal(a.mostrarRemoverProcesso, true);
});

run("aberta: Copiar link habilitado", () => {
  const a = acoesMenuListagemProcessoRiscos({
    campanhaStatus: "aberta",
    codigoPublico: "ABC123",
    isAdmin: false,
    hasCampanha: true,
  });
  assert.equal(a.podeCopiarLink, true);
  assert.equal(a.podeGerarRelatorio, false);
  assert.equal(a.mostrarRemoverProcesso, false);
});

run("encerrada sem todos concluídos: Relatório off", () => {
  const a = acoesMenuListagemProcessoRiscos({
    campanhaStatus: "encerrada",
    codigoPublico: "ABC123",
    isAdmin: true,
    hasCampanha: true,
    participantesCadastrados: 3,
    participantesRespondidos: 1,
  });
  assert.equal(a.podeAbrir, true);
  assert.equal(a.podeCopiarLink, false);
  assert.equal(a.podeGerarRelatorio, false);
  assert.match(a.gerarRelatorioMotivoDesabilitado, /não concluíram/i);
  assert.equal(a.mostrarRemoverProcesso, true);
});

run("encerrada com todos concluídos: Relatório on", () => {
  const a = acoesMenuListagemProcessoRiscos({
    campanhaStatus: "encerrada",
    codigoPublico: "ABC123",
    isAdmin: true,
    hasCampanha: true,
    participantesCadastrados: 2,
    participantesRespondidos: 2,
  });
  assert.equal(a.podeGerarRelatorio, true);
});

run("já existe relatório: Gerar off (visualizar no processo)", () => {
  const a = acoesMenuListagemProcessoRiscos({
    campanhaStatus: "encerrada",
    codigoPublico: "ABC123",
    isAdmin: true,
    hasCampanha: true,
    participantesCadastrados: 2,
    participantesRespondidos: 2,
    relatorioGerado: true,
  });
  assert.equal(a.podeGerarRelatorio, false);
  assert.match(a.gerarRelatorioMotivoDesabilitado, /já gerado/i);
});

run("não admin não vê Remover processo", () => {
  const a = acoesMenuListagemProcessoRiscos({
    campanhaStatus: "aberta",
    codigoPublico: "ABC123",
    isAdmin: false,
    hasCampanha: true,
  });
  assert.equal(a.mostrarRemoverProcesso, false);
});

run("sem campanha: sem copiar e sem remover", () => {
  const a = acoesMenuListagemProcessoRiscos({
    campanhaStatus: null,
    codigoPublico: null,
    isAdmin: true,
    hasCampanha: false,
  });
  assert.equal(a.podeCopiarLink, false);
  assert.equal(a.mostrarRemoverProcesso, false);
  assert.equal(a.podeAbrir, true);
});

console.log("\nTodos os testes do menu de ações passaram.");
