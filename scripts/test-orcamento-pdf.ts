/** Smoke test: APIs jsPDF usadas no layout premium de orçamentos. */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jsPDF } from "jspdf";
import { formatCurrency } from "../lib/money";

const NAVY: [number, number, number] = [8, 43, 99];
const GOLD: [number, number, number] = [201, 151, 43];
const WHITE: [number, number, number] = [255, 255, 255];

function buildFilename(numero: string, clienteNome: string): string {
  const cliente = clienteNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `Proposta-${numero}-${cliente || "Cliente"}.pdf`;
}

function splitDescricaoEmTopicos(descricao: string): string[] {
  return descricao
    .split(/\n+|(?:^|\s)[•·▪-]\s+/g)
    .map((part) => part.trim().replace(/^[-•·▪]\s*/, ""))
    .filter(Boolean);
}

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
doc.setFillColor(248, 250, 252);
doc.roundedRect(MARGIN, 58, CONTENT_W, 20, 2.5, 2.5, "FD");
doc.circle(MARGIN + 5, 90, 0.7, "F");
doc.text("Item de exemplo", MARGIN + 8, 90);

const bullets = splitDescricaoEmTopicos(
  "Elaboração dos laudos\n• Gestão do eSocial\n- Documentos em PDF"
);
assert.equal(bullets.length, 3, "splitDescricaoEmTopicos deve separar tópicos");

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
