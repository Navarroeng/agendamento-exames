/**
 * Helpers de nome de arquivo PDF do relatório de Riscos Psicossociais.
 */
import assert from "node:assert/strict";
import {
  formatDataArquivoPdf,
  nomeArquivoPdfRelatorioRiscos,
  sanitizarNomeArquivoEmpresa,
} from "../lib/riscos-relatorio-pdf";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("sanitiza empresa para nome de arquivo", () => {
  assert.equal(sanitizarNomeArquivoEmpresa("JA Soluções"), "JA_Solucoes");
  assert.equal(sanitizarNomeArquivoEmpresa("  Acme!!  "), "Acme");
  assert.equal(sanitizarNomeArquivoEmpresa(""), "Empresa");
});

run("formata data dd-mm-yyyy", () => {
  assert.equal(formatDataArquivoPdf(new Date(2026, 7, 11)), "11-08-2026");
});

run("nome completo do PDF", () => {
  const nome = nomeArquivoPdfRelatorioRiscos(
    "JA Soluções",
    new Date(2026, 7, 11)
  );
  assert.equal(
    nome,
    "Relatorio_Riscos_Psicossociais_JA_Solucoes_11-08-2026.pdf"
  );
});

run("aceita gerado_em ISO", () => {
  const nome = nomeArquivoPdfRelatorioRiscos(
    "Empresa X",
    "2026-08-12T12:00:00.000Z"
  );
  assert.match(nome, /^Relatorio_Riscos_Psicossociais_Empresa_X_\d{2}-\d{2}-\d{4}\.pdf$/);
});

console.log("\nTodos os testes de PDF do relatório passaram.");
