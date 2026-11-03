/**
 * Rodapé da visualização da fatura.
 * Não emite fatura nem envia e-mail: só decide quais botões aparecem.
 *
 * Executar: npx tsx scripts/test-fatura-preview-rodape.ts
 */
import assert from "node:assert/strict";
import {
  acoesRodapePreviewFatura,
  faturaPreviewPermiteEmitir,
} from "../lib/fatura-preview-rodape";
import type { FaturaStatus } from "../lib/types";

function visualizar(status: FaturaStatus | null) {
  return acoesRodapePreviewFatura({ readonly: true, status });
}

assert.equal(faturaPreviewPermiteEmitir({ status: null }), true);
assert.equal(faturaPreviewPermiteEmitir({ status: "rascunho" }), true);
assert.equal(faturaPreviewPermiteEmitir({ status: "emitida" }), false);
assert.equal(faturaPreviewPermiteEmitir({ status: "vencida" }), false);
assert.equal(faturaPreviewPermiteEmitir({ status: "cancelada" }), false);
assert.equal(
  faturaPreviewPermiteEmitir({ status: "necessita_reemissao" }),
  false
);

const aberta = visualizar(null);
assert.equal(aberta.rotuloFechar, "Fechar");
assert.equal(aberta.mostrarEmitir, true);
assert.equal(aberta.mostrarSalvarRascunho, false);
assert.equal(aberta.mostrarGerarPdf, false);

const rascunho = visualizar("rascunho");
assert.equal(rascunho.mostrarEmitir, true);
assert.equal(rascunho.mostrarGerarPdf, true);
assert.equal(rascunho.mostrarSalvarRascunho, false);

for (const status of [
  "emitida",
  "vencida",
  "cancelada",
  "reemitida",
  "substituida",
  "necessita_reemissao",
] as const) {
  const acoes = visualizar(status);
  assert.equal(acoes.mostrarEmitir, false, status);
  assert.equal(acoes.rotuloFechar, "Fechar", status);
}

assert.equal(visualizar("emitida").mostrarGerarPdf, true);
assert.equal(visualizar("vencida").mostrarGerarPdf, false);
assert.equal(visualizar("cancelada").mostrarGerarPdf, false);

const edicao = acoesRodapePreviewFatura({ readonly: false, status: null });
assert.equal(edicao.rotuloFechar, "Voltar / Editar filtros");
assert.equal(edicao.mostrarEmitir, true);
assert.equal(edicao.mostrarSalvarRascunho, true);
assert.equal(edicao.mostrarGerarPdf, true);

const edicaoEmitida = acoesRodapePreviewFatura({
  readonly: false,
  status: "emitida",
});
assert.equal(edicaoEmitida.mostrarEmitir, false);

console.log("ok: fatura-preview-rodape");
