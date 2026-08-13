/**
 * Smoke: URL pública e nome de arquivo do QR — mesma fonte do Copiar link.
 */
import assert from "node:assert/strict";
import {
  nomeArquivoQrCodePesquisa,
  pathAvaliacaoCampanha,
  urlPublicaPesquisaCampanha,
} from "../lib/riscos-campanha";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (err) {
    console.error(`fail — ${name}`);
    throw err;
  }
}

run("path e URL pública alinhados", () => {
  assert.equal(pathAvaliacaoCampanha("z7lvsp"), "/avaliacao/Z7LVSP");
  assert.equal(
    urlPublicaPesquisaCampanha("z7lvsp", "https://agendamento-exames.vercel.app"),
    "https://agendamento-exames.vercel.app/avaliacao/Z7LVSP"
  );
});

run("nome do arquivo identifica empresa e código", () => {
  const nome = nomeArquivoQrCodePesquisa(
    "J. A. SOLUÇÕES INDUSTRIAIS LTDA",
    "Z7LVSP"
  );
  assert.match(nome, /^QR-Code-/);
  assert.match(nome, /Z7LVSP\.png$/);
  assert.match(nome, /SOLUCOES|SOLUÇÕES|J-A/i);
});

console.log("test-riscos-qrcode: all passed");
