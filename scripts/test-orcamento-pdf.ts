/** Smoke test: PDF premium de orçamentos e Pacote Completo SST. */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jsPDF } from "jspdf";
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

function wrapDescricaoPropostaLines(
  doc: jsPDF,
  text: string,
  maxWidth: number
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return doc.splitTextToSize(normalized, maxWidth);
}

function normalizeServicoNome(nome: string): string {
  return nome
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isServicoExamesClinicos(nome: string): boolean {
  const normalized = normalizeServicoNome(nome);
  return (
    normalized === "exames ocupacionais" ||
    normalized === "exame clinico" ||
    normalized === "exames clinicos" ||
    normalized.includes("exame clinico")
  );
}

function resolveQuantidadeExamesClinicosOrcamento(
  orcamento: Pick<OrcamentoComItens, "orcamento_itens">
): number {
  return (orcamento.orcamento_itens ?? []).reduce((total, item) => {
    if (!isServicoExamesClinicos(item.servico_nome)) return total;
    const quantidade = Number(item.quantidade);
    return total + (Number.isFinite(quantidade) ? quantidade : 0);
  }, 0);
}

function buildPacoteCompletoInclusosItens(
  orcamento: Pick<OrcamentoComItens, "orcamento_itens">
): string[] {
  const itens = [
    "Todos os Laudos e Serviços listados acima.",
    "Gestão completa e envio ao eSocial.",
  ];

  const quantidadeExamesClinicos = resolveQuantidadeExamesClinicosOrcamento(
    orcamento
  );
  if (quantidadeExamesClinicos > 0) {
    itens.push(`Exames Clínicos: ${quantidadeExamesClinicos}`);
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

assert.ok(isPacoteCompletoSst(PACOTE_COMPLETO_SST_NOME));
const inclusosPacote = resolveItensInclusosServico({
  nome: PACOTE_COMPLETO_SST_NOME,
});
assert.deepEqual(inclusosPacote, [...PACOTE_COMPLETO_SST_ITENS]);

const semExames = buildPacoteCompletoInclusosItens({ orcamento_itens: [] });
assert.equal(semExames.length, 3);
assert.match(semExames[0], /listados acima/);
assert.ok(!semExames.some((item) => /Exames Clínicos/.test(item)));

const comExames = buildPacoteCompletoInclusosItens({
  orcamento_itens: [
    {
      id: "1",
      orcamento_id: "o1",
      servico_id: null,
      servico_nome: "Exames Ocupacionais",
      quantidade: 3,
      valor_unitario: 100,
      valor_total: 300,
      ordem: 1,
    },
  ],
});
assert.ok(comExames.includes("Exames Clínicos: 3"));
assert.ok(!comExames.some((item) => /PGR/.test(item)));

function resolveNumeroColaboradoresOrcamento(
  orcamento: Pick<OrcamentoComItens, "orcamento_itens">
): string {
  const itens = [...(orcamento.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );
  if (itens.length === 0) return "—";

  const pacoteItem = itens.find((item) =>
    isPacoteCompletoSst(item.servico_nome)
  );
  const referencia = pacoteItem ?? itens[0];
  const quantidade = Number(referencia.quantidade);
  return Number.isFinite(quantidade) ? String(quantidade) : "—";
}

assert.equal(
  resolveNumeroColaboradoresOrcamento({
    orcamento_itens: [
      {
        id: "1",
        orcamento_id: "o1",
        servico_id: null,
        servico_nome: PACOTE_COMPLETO_SST_NOME,
        quantidade: 25,
        valor_unitario: 1000,
        valor_total: 25000,
        ordem: 0,
      },
    ],
  }),
  "25"
);

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

comExames.forEach((item, index) => {
  doc.text(`• ${item}`, MARGIN + 6, 100 + index * 6);
});

const filename = buildFilename("2026-001", "Empresa São Paulo Ltda");
assert.match(filename, /^Proposta-2026-001-Empresa-Sao-Paulo-Ltda\.pdf$/);

doc.setFontSize(11);
doc.setTextColor(...NAVY);
doc.text(formatCurrency(12500), MARGIN + CONTENT_W - 5, 130, { align: "right" });

const outPath = path.join(os.tmpdir(), filename);
const buffer = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync(outPath, buffer);

assert.ok(buffer.length > 500, "PDF gerado deve ter conteúdo");
assert.equal(buffer.subarray(0, 4).toString(), "%PDF", "deve ser PDF válido");

fs.unlinkSync(outPath);
console.log("test-orcamento-pdf: OK");
