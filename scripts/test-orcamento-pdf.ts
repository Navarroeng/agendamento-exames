/** Smoke test: PDF premium de orçamentos e Pacote Completo SST. */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jsPDF } from "jspdf";
import {
  resolveItemValorServico,
  resolveQuantidadeColaboradoresOrcamento,
} from "../lib/orcamento-calculo";
import {
  ORCAMENTO_WATERMARK_OPACITY,
  ORCAMENTO_WATERMARK_WIDTH_RATIO,
  calcOrcamentoWatermarkLayout,
  resolveFirstPageCardsRow,
} from "../lib/orcamento-pdf";
import { calcPdfContentBottomY } from "../lib/pdf-navarro-footer";
import { formatCurrency } from "../lib/money";
import type { OrcamentoComItens } from "../lib/orcamento-types";
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
  "Valor abaixo equivalente a realização e elaboração dos laudos, disponibilização dos arquivos em PDF para a empresa e gestão dos eventos de saúde e segurança do trabalho S-2210; S-2220; S-2240 dentro da plataforma E-social durante toda vigência do contrato (12 meses). Incluindo o Laudo de Riscos Psicossociais conforme a nova NR-01.",
  "(Laudos obrigatórios por lei sujeito a multa do Ministério do trabalho MTE)",
] as const;

function buildPacoteCompletoInclusosItens(
  orcamento: Pick<OrcamentoComItens, "orcamento_itens">
): string[] {
  const itens = [
    "Todos os Laudos e Serviços listados acima.",
    "Gestão completa e envio ao eSocial.",
  ];

  const quantidadeColaboradores =
    resolveQuantidadeColaboradoresOrcamento(orcamento);
  if (quantidadeColaboradores > 0) {
    itens.push(`Exames Clínicos: ${quantidadeColaboradores}`);
  }

  itens.push("CAT - Cortesia.");
  return itens;
}

function buildFilename(numero: string, clienteNome: string): string {
  const cliente = clienteNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `Proposta-${numero}-${cliente || "Cliente"}.pdf`;
}

function wrapDescricaoPropostaLines(
  doc: jsPDF,
  text: string,
  maxWidth: number
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return doc.splitTextToSize(normalized, maxWidth);
}

assert.ok(isPacoteCompletoSst(PACOTE_COMPLETO_SST_NOME));
const inclusosPacote = resolveItensInclusosServico({
  nome: PACOTE_COMPLETO_SST_NOME,
});
assert.deepEqual(inclusosPacote, [...PACOTE_COMPLETO_SST_ITENS]);

const orcamentoDoisColaboradores = {
  orcamento_itens: [
    {
      id: "1",
      orcamento_id: "o1",
      servico_id: null,
      servico_nome: PACOTE_COMPLETO_SST_NOME,
      quantidade: 2,
      valor_unitario: 1500,
      valor_total: 1500,
      ordem: 0,
    },
  ],
};

const semExames = buildPacoteCompletoInclusosItens(orcamentoDoisColaboradores);
assert.ok(semExames.includes("Exames Clínicos: 2"));
assert.match(semExames[0], /listados acima/);
assert.ok(!semExames.some((item) => /PGR/.test(item)));

assert.equal(
  resolveQuantidadeColaboradoresOrcamento(orcamentoDoisColaboradores),
  2
);

assert.equal(
  resolveItemValorServico(orcamentoDoisColaboradores.orcamento_itens[0]),
  1500
);

assert.ok(
  ORCAMENTO_WATERMARK_OPACITY >= 0.04 && ORCAMENTO_WATERMARK_OPACITY <= 0.08
);
assert.ok(
  ORCAMENTO_WATERMARK_WIDTH_RATIO >= 0.75 &&
    ORCAMENTO_WATERMARK_WIDTH_RATIO <= 0.85
);

const CONTENT_W = 186;
const PAGE_W = 210;
const watermark = calcOrcamentoWatermarkLayout(
  CONTENT_W,
  PAGE_W,
  95,
  265,
  180,
  180
);
assert.equal(watermark.w, CONTENT_W * ORCAMENTO_WATERMARK_WIDTH_RATIO);
assert.equal(watermark.x, (PAGE_W - watermark.w) / 2);
assert.equal(watermark.x + watermark.w / 2, PAGE_W / 2);
assert.ok(watermark.h <= (265 - 95) * 0.92 + 0.1);
assert.ok(watermark.y >= 95);

const FIRST_PAGE_CONTENT_BOTTOM = calcPdfContentBottomY(297);
const cardsRow = resolveFirstPageCardsRow(248, 58);
assert.equal(cardsRow.cardY, 248);
assert.equal(cardsRow.cardH, 26);
assert.ok(cardsRow.cardY + cardsRow.cardH <= FIRST_PAGE_CONTENT_BOTTOM);

const doc = new jsPDF({ unit: "mm", format: "a4" });
const MARGIN = 12;

doc.setFillColor(...NAVY);
doc.roundedRect(MARGIN, MARGIN, CONTENT_W, 40, 3, 3, "F");
doc.setFillColor(...GOLD);
doc.triangle(MARGIN + 120, MARGIN, MARGIN + CONTENT_W, MARGIN, MARGIN + CONTENT_W, 22, "F");
doc.setTextColor(...WHITE);
doc.setFont("helvetica", "bold");
doc.setFontSize(16);
doc.text("PROPOSTA COMERCIAL", MARGIN + CONTENT_W - 5, MARGIN + 14, { align: "right" });

doc.setFontSize(7.5);
const descricaoTextWidth = CONTENT_W - 10;
const descricaoLines = wrapDescricaoPropostaLines(
  doc,
  PROPOSTA_DESCRICAO_PARAGRAFOS[0],
  descricaoTextWidth
);
assert.ok(!PROPOSTA_DESCRICAO_PARAGRAFOS[0].includes("\n"));
assert.ok(
  descricaoLines.length <= 5,
  "descrição deve aproveitar largura total com menos quebras"
);

PROPOSTA_DESCRICAO_PARAGRAFOS.forEach((paragrafo, index) => {
  const lines = wrapDescricaoPropostaLines(doc, paragrafo, descricaoTextWidth);
  assert.ok(lines.length > 0, `parágrafo ${index + 1} deve gerar linhas`);
  doc.text(lines, MARGIN + 5, 60 + index * 20);
});

semExames.forEach((item, index) => {
  doc.text(`• ${item}`, MARGIN + 6, 100 + index * 6);
});

const CLIENT_CARD_PAD_X = 6;
const colGap = 4;
const colWidth = (CONTENT_W - CLIENT_CARD_PAD_X * 2 - colGap) / 2;
const CLIENT_LEFT_LABEL_W = 24;
const valueMaxW = colWidth - CLIENT_LEFT_LABEL_W - 1;
const docWrap = new jsPDF({ unit: "mm", format: "a4" });
docWrap.setFont("helvetica", "normal");
docWrap.setFontSize(8.5);
const longAddress =
  "Av. Paulista, 1578, Conjunto 1204, Bela Vista, São Paulo - SP, CEP 01310-200, Edificio Corporate Tower";
const wrappedAddress = docWrap.splitTextToSize(longAddress, valueMaxW);
assert.ok(
  wrappedAddress.length >= 2,
  "endereco longo deve quebrar em multiplas linhas"
);

const filename = buildFilename("2026-001", "Empresa São Paulo Ltda");
assert.match(filename, /^Proposta-2026-001-Empresa-Sao-Paulo-Ltda\.pdf$/);

doc.setFontSize(11);
doc.setTextColor(...NAVY);
doc.text(formatCurrency(1500), MARGIN + CONTENT_W - 5, 130, { align: "right" });

const outPath = path.join(os.tmpdir(), filename);
const buffer = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync(outPath, buffer);

assert.ok(buffer.length > 500, "PDF gerado deve ter conteúdo");
assert.equal(buffer.subarray(0, 4).toString(), "%PDF", "deve ser PDF válido");

fs.unlinkSync(outPath);
console.log("test-orcamento-pdf: OK");
