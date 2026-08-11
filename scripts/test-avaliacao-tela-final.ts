/**
 * Contrato: conclusão oficial ocorre ao avançar na última pergunta
 * (persistir resposta + POST /api/avaliacao/concluir).
 * A tela final NÃO exige clique em Encerrar.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const portalSrc = readFileSync(
  join(__dirname, "../components/avaliacao/AvaliacaoPortal.tsx"),
  "utf8"
);

run("última pergunta chama handleConcluirPesquisa", () => {
  assert.match(portalSrc, /flowIndex >= FLOW_ITEMS\.length - 1/);
  assert.match(portalSrc, /void handleConcluirPesquisa\(\)/);
});

run("handleConcluirPesquisa chama /api/avaliacao/concluir antes da tela final", () => {
  assert.match(portalSrc, /fetch\("\/api\/avaliacao\/concluir"/);
  assert.match(portalSrc, /setStep\("final"\)/);
});

run("FinalStep não tem botão Encerrar nem onFinish", () => {
  const finalBlock = portalSrc.slice(portalSrc.indexOf("function FinalStep"));
  assert.doesNotMatch(finalBlock, /Encerrar/);
  assert.doesNotMatch(finalBlock, /onFinish/);
  assert.doesNotMatch(finalBlock, /<button/);
  assert.match(finalBlock, /Pesquisa concluída/);
  assert.match(finalBlock, /Obrigado pela sua participação/);
});

run("tela final é renderizada sem callback de encerrar", () => {
  assert.match(portalSrc, /\{step === "final" \? <FinalStep \/> : null\}/);
});

console.log("\nTodos os testes da tela final da pesquisa passaram.");
