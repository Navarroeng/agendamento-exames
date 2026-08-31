/**
 * PDF institucional do Mapa COPSOQ II — independente do relatório da campanha.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { COPSOQ_DIMENSOES } from "../lib/copsoq/dimensoes";
import { COPSOQ_PERGUNTAS } from "../lib/copsoq/perguntas";
import { montarMapaQuestionarioCopsoq } from "../lib/copsoq/mapa-questionario";
import { perguntasCalculoDaDimensao } from "../lib/copsoq-engine/dimensions";
import {
  NOME_ARQUIVO_MAPA_COPSOQ,
  gerarPdfMapaQuestionarioCopsoq,
} from "../lib/copsoq-mapa-pdf";

function run(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn()).then(() => console.log(`OK  ${name}`));
}

const outPath = join(process.cwd(), "tmp-Mapa_Questionario_COPSOQ_II_Navarro.pdf");

async function main() {
  const mapa = montarMapaQuestionarioCopsoq();
  const pdf = await gerarPdfMapaQuestionarioCopsoq();
  writeFileSync(outPath, Buffer.from(pdf.arrayBuffer));

  await run("gera arquivo PDF com o nome institucional", () => {
    assert.equal(pdf.filename, NOME_ARQUIVO_MAPA_COPSOQ);
    assert.equal(pdf.filename, "Mapa_Questionario_COPSOQ_II_Navarro.pdf");
    assert.ok(existsSync(outPath));
    assert.ok(pdf.arrayBuffer.byteLength > 1000);
    assert.match(Buffer.from(pdf.arrayBuffer).subarray(0, 5).toString(), /^%PDF/);
  });

  await run("logo do relatório psicossocial está no PDF", () => {
    assert.equal(pdf.logoUtilizado, "/logo-navarro-relatorio-riscos.png");
    const logoFile = join(
      process.cwd(),
      "public",
      "logo-navarro-relatorio-riscos.png"
    );
    assert.ok(existsSync(logoFile));
    const raw = Buffer.from(pdf.arrayBuffer).toString("latin1");
    assert.match(raw, /\/Image|XObject/);
  });

  await run("40 perguntas, sem duplicar nem faltar", () => {
    assert.equal(pdf.perguntas.length, 40);
    assert.equal(COPSOQ_PERGUNTAS.length, 40);
    assert.equal(new Set(pdf.perguntas.map((p) => p.id)).size, 40);
    assert.equal(new Set(pdf.perguntas.map((p) => p.ordem)).size, 40);
    assert.deepEqual(
      pdf.perguntas.map((p) => p.ordem).sort((a, b) => a - b),
      Array.from({ length: 40 }, (_, i) => i + 1)
    );
  });

  await run("10 categorias + 4 ofensivos", () => {
    const ofensivos = pdf.categorias.find(
      (c) => c.id === "comportamentos-ofensivos"
    );
    const principais = pdf.categorias.filter(
      (c) => c.id !== "comportamentos-ofensivos"
    );
    assert.equal(principais.length, 10);
    assert.ok(ofensivos);
    assert.equal(ofensivos?.quantidade, 4);
    assert.equal(ofensivos?.tipo, "RISCO");
    assert.equal(
      pdf.perguntas.filter((p) => p.categoriaId === "comportamentos-ofensivos")
        .length,
      4
    );
  });

  await run("numeração 01–40 e códigos oficiais", () => {
    const byOrdem = [...pdf.perguntas].sort((a, b) => a.ordem - b.ordem);
    assert.equal(byOrdem[0]?.numeroVisual, "01");
    assert.equal(byOrdem[0]?.codigo, "1A");
    assert.equal(byOrdem[39]?.numeroVisual, "40");
    assert.equal(byOrdem[39]?.codigo, "23");
    const ofensivos = byOrdem.filter(
      (p) => p.categoriaId === "comportamentos-ofensivos"
    );
    assert.deepEqual(
      ofensivos.map((p) => `${p.numeroVisual}:${p.codigo}`),
      ["37:20", "38:21", "39:22", "40:23"]
    );
  });

  await run("RISCO/PROTEÇÃO iguais às dimensões do instrumento", () => {
    for (const cat of pdf.categorias) {
      const dim = COPSOQ_DIMENSOES.find((d) => d.id === cat.id);
      assert.ok(dim, cat.id);
      assert.equal(cat.tipo, dim!.tipo);
    }
  });

  await run("agrupamento idêntico ao cálculo e ao mapa", () => {
    for (const dim of COPSOQ_DIMENSOES.filter((d) => d.entraNoCalculo)) {
      const idsPdf = pdf.perguntas
        .filter((p) => p.categoriaId === dim.id)
        .map((p) => p.id);
      const idsCalc = perguntasCalculoDaDimensao(dim.id).map((p) => p.id);
      const idsMapa =
        mapa.categoriasAvaliadas
          .find((c) => c.id === dim.id)
          ?.perguntas.map((p) => p.id) ?? [];
      assert.deepEqual(idsPdf, idsCalc);
      assert.deepEqual(idsPdf, idsMapa);
    }
  });

  await run("título da categoria não fica órfão da primeira pergunta", () => {
    for (const cat of pdf.categorias) {
      const primeira = pdf.perguntas.find((p) => p.categoriaId === cat.id);
      assert.ok(primeira, cat.id);
      assert.equal(
        primeira!.pagina,
        cat.paginaInicio,
        `categoria ${cat.id} na pág. ${cat.paginaInicio}, 1ª pergunta na ${primeira!.pagina}`
      );
    }
  });

  await run("paginação e rodapé em todas as páginas", () => {
    assert.ok(pdf.pageCount >= 2);
    const raw = Buffer.from(pdf.arrayBuffer).toString("latin1");
    for (let i = 1; i <= pdf.pageCount; i += 1) {
      assert.ok(
        raw.includes(`Página ${i} de ${pdf.pageCount}`),
        `faltou Página ${i} de ${pdf.pageCount}`
      );
    }
    assert.match(
      raw,
      /Navarro Engenharia de Seguran/
    );
  });

  await run("gerador do relatório psicossocial não foi alterado", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/riscos-relatorio-pdf.ts"),
      "utf8"
    );
    assert.match(src, /window\.print\(\)/);
    assert.doesNotMatch(src, /Mapa_Questionario_COPSOQ/);
    assert.doesNotMatch(
      readFileSync(join(process.cwd(), "lib/copsoq/perguntas.ts"), "utf8"),
      /copsoq-mapa-pdf/
    );
  });

  console.log(`\nPDF gerado: ${outPath}`);
  console.log(`Páginas: ${pdf.pageCount}`);
  console.log(`Logo: ${pdf.logoUtilizado}`);
  console.log("Todos os testes do PDF do mapa COPSOQ passaram.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
