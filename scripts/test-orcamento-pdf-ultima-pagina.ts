/** Flyer institucional como última página de todo PDF de orçamento. */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFStream,
  decodePDFRawStream,
} from "pdf-lib";
import {
  drawOrcamentoPdfDocument,
  finalizarPdfOrcamento,
} from "../lib/orcamento-pdf";
import { ULTIMA_PAGINA_ORCAMENTO_PUBLIC_PATH } from "../lib/orcamento-pdf-institucional";
import type { OrcamentoComItens, ServicoSstRecord } from "../lib/orcamento-types";

const FLYER_PATH = path.join(
  process.cwd(),
  "public",
  "orcamentos",
  "ultima-pagina-orcamento.pdf"
);
const FOOTER_EMAIL = "contato@navarroeng.com.br";

function buildOrcamento(params: {
  numero: string;
  itens: Array<{ nome: string; quantidade: number; valor: number }>;
  observacoes: string;
}): OrcamentoComItens {
  const itens = params.itens.map((item, index) => ({
    id: `i${index}`,
    orcamento_id: "o1",
    servico_id: `s-${index}`,
    servico_nome: item.nome,
    quantidade: item.quantidade,
    valor_unitario: item.valor,
    valor_total: item.valor,
    ordem: index,
  }));
  const total = itens.reduce((sum, item) => sum + item.valor_total, 0);
  return {
    id: "o1",
    numero: params.numero,
    data_proposta: "2026-09-15",
    cliente_id: "c1",
    cliente_nome: "Empresa Teste Ltda",
    cliente_cnpj: "12.345.678/0001-90",
    cliente_endereco: "Rua A, 100",
    cliente_setor: "Comercio",
    contato: "Maria",
    email: "maria@teste.com",
    telefone: "(11) 99999-0000",
    responsavel: "Agatha",
    origem_cliente: null,
    modalidade: "pontual",
    observacoes: params.observacoes,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: "pix",
    quantidade_parcelas: 3,
    validade_proposta: null,
    subtotal: total,
    valor_total: total,
    status: "em_elaboracao",
    assinatura_status: "nao_aplicavel",
    assinatura_token: null,
    aceite_em: null,
    aceite_ip: null,
    aceite_usuario_nome: null,
    link_aceite_expira_em: null,
    created_at: "2026-09-15T12:00:00Z",
    updated_at: "2026-09-15T12:00:00Z",
    orcamento_itens: itens,
  };
}

function catalogoDe(
  itens: OrcamentoComItens["orcamento_itens"]
): ServicoSstRecord[] {
  return itens.map((item, index) => ({
    id: item.servico_id ?? `s-${index}`,
    nome: item.servico_nome,
    descricao: null,
    valor_sugerido: item.valor_unitario,
    ativo: true,
    ordem: index,
    itens_inclusos: null,
  }));
}

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function resolver(doc: PDFDocument, value: unknown): unknown {
  return value instanceof PDFRef ? doc.context.lookup(value) : value;
}

function conteudoDaPagina(doc: PDFDocument, pageIndex: number): Buffer {
  const page = doc.getPage(pageIndex);
  const contents = resolver(doc, page.node.Contents());
  const partes = contents instanceof PDFArray ? contents.asArray() : [contents];
  const buffers: Buffer[] = [];
  for (const item of partes) {
    const stream = resolver(doc, item);
    if (stream instanceof PDFRawStream) {
      buffers.push(Buffer.from(decodePDFRawStream(stream).decode()));
    } else if (stream instanceof PDFStream) {
      buffers.push(Buffer.from(stream.getContents()));
    }
  }
  return Buffer.concat(buffers);
}

function imagensDaPagina(doc: PDFDocument, pageIndex: number): string[] {
  const page = doc.getPage(pageIndex);
  const resources = page.node.Resources();
  const hashes: string[] = [];
  const vistos = new Set<string>();

  const visitar = (dict: PDFDict | undefined) => {
    if (!dict) return;
    const xobjects = resolver(doc, dict.lookup(PDFName.of("XObject")));
    if (!(xobjects instanceof PDFDict)) return;
    for (const [, ref] of xobjects.entries()) {
      const chave = ref instanceof PDFRef ? ref.toString() : "";
      if (chave && vistos.has(chave)) continue;
      if (chave) vistos.add(chave);
      const stream = resolver(doc, ref);
      if (!(stream instanceof PDFRawStream) && !(stream instanceof PDFStream)) {
        continue;
      }
      const subtype = stream.dict.lookup(PDFName.of("Subtype"));
      if (subtype === PDFName.of("Image")) {
        const data = stream.getContents();
        hashes.push(`${sha256(data)}:${data.length}`);
      } else if (subtype === PDFName.of("Form")) {
        const recursos = resolver(doc, stream.dict.lookup(PDFName.of("Resources")));
        if (recursos instanceof PDFDict) visitar(recursos);
      }
    }
  };

  if (resources) visitar(resources);
  return hashes.sort();
}

async function gerar(orcamento: OrcamentoComItens) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawOrcamentoPdfDocument(doc, orcamento, {
    catalogo: catalogoDe(orcamento.orcamento_itens),
  });
  const paginasOrcamento = doc.getNumberOfPages();
  const bytes = await finalizarPdfOrcamento(doc);
  return { paginasOrcamento, bytes };
}

async function validar(
  nome: string,
  orcamento: OrcamentoComItens,
  esperado: { paginasOrcamento?: number; minPaginas?: number }
) {
  const flyer = await PDFDocument.load(fs.readFileSync(FLYER_PATH));
  assert.equal(flyer.getPageCount(), 1, "o arquivo institucional tem uma página");
  const flyerConteudo = sha256(conteudoDaPagina(flyer, 0));
  const flyerImagens = imagensDaPagina(flyer, 0);
  const flyerTamanho = flyer.getPage(0).getSize();
  assert.ok(flyerImagens.length > 0, "o flyer original contém a arte");

  const { paginasOrcamento, bytes } = await gerar(orcamento);
  if (esperado.paginasOrcamento !== undefined) {
    assert.equal(
      paginasOrcamento,
      esperado.paginasOrcamento,
      `${nome}: páginas do orçamento`
    );
  }
  if (esperado.minPaginas !== undefined) {
    assert.ok(
      paginasOrcamento >= esperado.minPaginas,
      `${nome}: orçamento deve ter pelo menos ${esperado.minPaginas} páginas`
    );
  }

  const pdf = await PDFDocument.load(bytes);
  assert.equal(
    pdf.getPageCount(),
    paginasOrcamento + 1,
    `${nome}: o flyer entra uma única vez, no final`
  );

  const ultima = pdf.getPageCount() - 1;
  const tamanho = pdf.getPage(ultima).getSize();
  assert.ok(Math.abs(tamanho.width - flyerTamanho.width) < 0.05);
  assert.ok(Math.abs(tamanho.height - flyerTamanho.height) < 0.05);
  assert.equal(
    sha256(conteudoDaPagina(pdf, ultima)),
    flyerConteudo,
    `${nome}: a última página preserva a arte original`
  );
  assert.deepEqual(
    imagensDaPagina(pdf, ultima),
    flyerImagens,
    `${nome}: imagens do flyer completas`
  );

  for (let pagina = 0; pagina < ultima; pagina += 1) {
    const imagens = imagensDaPagina(pdf, pagina);
    assert.equal(
      imagens.filter((hash) => flyerImagens.includes(hash)).length,
      0,
      `${nome}: página ${pagina + 1} não contém o flyer`
    );
  }

  const bruto = Buffer.from(bytes).toString("latin1");
  assert.match(
    bruto,
    new RegExp(`P[áa]gina 1 de ${paginasOrcamento}`)
  );
  assert.match(
    bruto,
    new RegExp(`P[áa]gina ${paginasOrcamento} de ${paginasOrcamento}`)
  );
  assert.doesNotMatch(
    bruto,
    new RegExp(`P[áa]gina ${paginasOrcamento + 1}`)
  );
  assert.equal(
    bruto.split(FOOTER_EMAIL).length - 1,
    paginasOrcamento * 2,
    `${nome}: contato do cabeçalho e do rodapé não entra no flyer`
  );
  assert.ok(bruto.includes(orcamento.numero));
  assert.ok(bruto.includes(orcamento.observacoes ?? ""));
  const brutoLegivel = bruto.replace(/\\([()\\])/g, "$1");
  for (const item of orcamento.orcamento_itens) {
    assert.ok(
      brutoLegivel.includes(item.servico_nome),
      `${nome}: serviço ${item.servico_nome} permanece no PDF`
    );
  }
  const valor = orcamento.valor_total.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  assert.ok(bruto.includes(valor), `${nome}: valor ${valor} permanece no PDF`);

  const destino = path.join(
    process.cwd(),
    "tmp",
    `validacao-orcamento-${nome}.pdf`
  );
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, bytes);
  console.log(
    `${nome}: ${paginasOrcamento} página(s) de orçamento + flyer = ${pdf.getPageCount()} (${destino})`
  );
}

const gerador = fs.readFileSync(
  path.join(process.cwd(), "lib", "orcamento-pdf.ts"),
  "utf8"
);
assert.equal(
  gerador.split("finalizarPdfOrcamento(").length - 1,
  2,
  "a inclusão do flyer fica centralizada na finalização do PDF"
);
assert.equal(gerador.includes("doc.save("), false);
assert.ok(gerador.includes(ULTIMA_PAGINA_ORCAMENTO_PUBLIC_PATH) === false);
assert.ok(fs.existsSync(FLYER_PATH));
assert.equal(
  ULTIMA_PAGINA_ORCAMENTO_PUBLIC_PATH,
  "/orcamentos/ultima-pagina-orcamento.pdf"
);

async function main() {
  await validar(
    "servico-unico",
    buildOrcamento({
      numero: "ORC-2026-9001",
      observacoes: "OBS-VALIDACAO-9001",
      itens: [{ nome: "Visita tecnica", quantidade: 1, valor: 400 }],
    }),
    { paginasOrcamento: 1 }
  );

  await validar(
    "varios-servicos",
    buildOrcamento({
      numero: "ORC-2026-9002",
      observacoes: "OBS-VALIDACAO-9002",
      itens: [
        { nome: "Gestao documental SST", quantidade: 1, valor: 1500 },
        { nome: "Audiometria ocupacional", quantidade: 4, valor: 450 },
        { nome: "Treinamento NR-35", quantidade: 2, valor: 80 },
      ],
    }),
    { minPaginas: 1 }
  );

  await validar(
    "periculosidade",
    buildOrcamento({
      numero: "ORC-2026-9016",
      observacoes: "OBS-VALIDACAO-9016",
      itens: [
        {
          nome: "Laudo de Periculosidade (NR16)",
          quantidade: 2,
          valor: 3600,
        },
      ],
    }),
    { minPaginas: 1 }
  );

  await validar(
    "pgr",
    buildOrcamento({
      numero: "ORC-2026-9018",
      observacoes: "OBS-VALIDACAO-9018",
      itens: [
        {
          nome: "PGR - Programa de Gerenciamento de Riscos",
          quantidade: 4,
          valor: 3200,
        },
      ],
    }),
    { minPaginas: 1 }
  );

  await validar(
    "varias-paginas",
    buildOrcamento({
      numero: "ORC-2026-9003",
      observacoes: "OBS-VALIDACAO-9003",
      itens: Array.from({ length: 24 }, (_, index) => ({
        nome: `Item de servico ${String(index + 1).padStart(2, "0")}`,
        quantidade: 3,
        valor: 200,
      })),
    }),
    { minPaginas: 3 }
  );

  console.log("test-orcamento-pdf-ultima-pagina: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
