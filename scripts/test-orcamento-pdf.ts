/** Smoke test: PDF premium de orçamentos e Pacote Completo SST. */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jsPDF } from "jspdf";
import { formatCurrency } from "../lib/money";
import {
  PACOTE_COMPLETO_SST_ITENS,
  PACOTE_COMPLETO_SST_NOME,
  isPacoteCompletoSst,
  resolveItensInclusosServico,
} from "../lib/servico-sst-pacote";

const NAVY: [number, number, number] = [8, 43, 99];
const GOLD: [number, number, number] = [201, 151, 43];
const WHITE: [number, number, number] = [255, 255, 255];

const PROPOSTA_DESCRICAO_PARAGRAFOS = [
  [
    "Valor abaixo equivalente a realização e elaboração dos laudos, disponibilização dos arquivos em",
    "PDF para a empresa e gestão dos eventos de saúde e segurança do trabalho S-2210; S-2220; S-",
    "2240 dentro da plataforma E-social durante toda vigência do contrato (12 meses). Incluindo o",
    "Laudo de Riscos Psicossociais conforme a nova NR-01.",
  ].join("\n"),
  "(Laudos obrigatórios por lei sujeito a multa do Ministério do trabalho MTE)",
] as const;

function buildFilename(numero: string, clienteNome: string): string {
  const cliente = clienteNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `Proposta-${numero}-${cliente || "Cliente"}.pdf`;
}

function wrapParagraphLines(
  doc: jsPDF,
  text: string,
  maxWidth: number
): string[] {
  return text.split("\n").flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed) return [];
    return doc.splitTextToSize(trimmed, maxWidth);
  });
}

assert.ok(isPacoteCompletoSst(PACOTE_COMPLETO_SST_NOME));
const inclusosPacote = resolveItensInclusosServico({
  nome: PACOTE_COMPLETO_SST_NOME,
});
assert.deepEqual(inclusosPacote, [...PACOTE_COMPLETO_SST_ITENS]);

const PACOTE_COMPLETO_INCLUSOS_ITENS = [
  "Todos Laudos e Serviços listados à cima.",
  "Gestão completa e envio ao eSocial",
  "Exames Clínicos: 1",
  "CAT - Cortesia",
] as const;

assert.equal(PACOTE_COMPLETO_INCLUSOS_ITENS.length, 4);
assert.match(PACOTE_COMPLETO_INCLUSOS_ITENS[0], /à cima/);

const doc = new jsPDF({ unit: "mm", format: "a4" });
const MARGIN = 12;
const CONTENT_W = 210 - MARGIN * 2;

doc.setFillColor(...NAVY);
doc.roundedRect(MARGIN, MARGIN, CONTENT_W, 40, 3, 3, "F");
doc.setFillColor(...GOLD);
doc.triangle(MARGIN + 120, MARGIN, MARGIN + CONTENT_W, MARGIN, MARGIN + CONTENT_W, 22, "F");
doc.setTextColor(...WHITE);
doc.setFont("helvetica", "bold");
doc.setFontSize(16);
doc.text("PROPOSTA COMERCIAL", MARGIN + CONTENT_W - 5, MARGIN + 14, { align: "right" });

doc.setFontSize(7.5);
PROPOSTA_DESCRICAO_PARAGRAFOS.forEach((paragrafo, index) => {
  const lines = wrapParagraphLines(doc, paragrafo, CONTENT_W - 12);
  assert.ok(lines.length > 0, `parágrafo ${index + 1} deve gerar linhas`);
  doc.text(lines, MARGIN + 6, 60 + index * 20);
});

assert.match(
  PROPOSTA_DESCRICAO_PARAGRAFOS[0],
  /S-2210; S-2220; S-\n2240/
);
assert.match(PROPOSTA_DESCRICAO_PARAGRAFOS[1], /Ministério do trabalho MTE/);

const filename = buildFilename("2026-001", "Empresa São Paulo Ltda");
assert.match(filename, /^Proposta-2026-001-Empresa-Sao-Paulo-Ltda\.pdf$/);

doc.setFontSize(11);
doc.setTextColor(...NAVY);
doc.text(formatCurrency(12500), MARGIN + CONTENT_W - 5, 110, { align: "right" });

const outPath = path.join(os.tmpdir(), filename);
const buffer = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync(outPath, buffer);

assert.ok(buffer.length > 500, "PDF gerado deve ter conteúdo");
assert.equal(buffer.subarray(0, 4).toString(), "%PDF", "deve ser PDF válido");

fs.unlinkSync(outPath);
console.log("test-orcamento-pdf: OK");
