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
  ORCAMENTO_PDF_CONTENT_BOTTOM_Y,
  ORCAMENTO_PDF_CONTENT_FOOTER_GAP,
  ORCAMENTO_PDF_FOOTER_BOTTOM_MARGIN,
  ORCAMENTO_PDF_MARGIN_TOP,
  ORCAMENTO_WATERMARK_OPACITY,
  ORCAMENTO_WATERMARK_WIDTH_RATIO,
  blockFitsOnPage,
  calcOrcamentoWatermarkLayout,
  drawOrcamentoPdfDocument,
  ensureSpace,
  resolveCardsBlockPlacement,
} from "../lib/orcamento-pdf";
import {
  PDF_FOOTER_BOTTOM_MARGIN,
  PDF_FOOTER_H,
  calcPdfContentBottomY,
  calcPdfFooterTopY,
} from "../lib/pdf-navarro-footer";
import { formatCurrency } from "../lib/money";
import type { OrcamentoComItens, ServicoSstRecord } from "../lib/orcamento-types";
import {
  GESTAO_COMPLETA_SST_ITENS,
  GESTAO_SST_MENSAL_NOME,
  ORCAMENTO_MENSALIDADE_CONDICAO_PAGAMENTO,
  formatValorMensalidade,
} from "../lib/orcamento-modalidade";
import {
  PACOTE_COMPLETO_SST_ITENS,
  PACOTE_COMPLETO_SST_NOME,
  isPacoteCompletoSst,
  resolveItensInclusosServico,
} from "../lib/servico-sst-pacote";
import {
  AET_INCLUSOS_ITENS,
  PROPOSTA_DESCRICAO_PARAGRAFOS_AET,
  SERVICO_AET_NOME,
} from "../lib/servico-aet";
import {
  INSALUBRIDADE_INCLUSOS_ITENS,
  INSALUBRIDADE_INCLUSOS_OBSERVACOES,
  PROPOSTA_DESCRICAO_PARAGRAFOS_INSALUBRIDADE,
  SERVICO_INSALUBRIDADE_NOME,
} from "../lib/servico-insalubridade";
import {
  PERICULOSIDADE_INCLUSOS_ITENS,
  PERICULOSIDADE_INCLUSOS_OBSERVACOES,
  PROPOSTA_DESCRICAO_PARAGRAFOS_PERICULOSIDADE,
  SERVICO_PERICULOSIDADE_NOME,
} from "../lib/servico-periculosidade";
import {
  LTCAT_INCLUSOS_ITENS,
  PROPOSTA_DESCRICAO_PARAGRAFOS_LTCAT,
  SERVICO_LTCAT_NOME,
  SERVICO_LTCAT_NOME_EXIBICAO,
} from "../lib/servico-ltcat";
import {
  PGR_INCLUSOS_ITENS,
  PGR_INCLUSOS_OBSERVACOES,
  PROPOSTA_DESCRICAO_PARAGRAFOS_PGR,
  SERVICO_PGR_NOME,
} from "../lib/servico-pgr";

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
assert.ok(!semExames.some((item) => /CAT - Cortesia/.test(item)));

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

assert.equal(ORCAMENTO_PDF_MARGIN_TOP, 8.4);
assert.ok(Math.abs(12 - ORCAMENTO_PDF_MARGIN_TOP - 12 * 0.3) < 0.05);
assert.equal(ORCAMENTO_PDF_FOOTER_BOTTOM_MARGIN, 5.6);
assert.ok(ORCAMENTO_PDF_FOOTER_BOTTOM_MARGIN < PDF_FOOTER_BOTTOM_MARGIN);
assert.equal(ORCAMENTO_PDF_CONTENT_FOOTER_GAP, 1.4);
const orcamentoFooterTop = calcPdfFooterTopY(
  297,
  ORCAMENTO_PDF_FOOTER_BOTTOM_MARGIN
);
const FIRST_PAGE_CONTENT_BOTTOM = calcPdfContentBottomY(
  297,
  ORCAMENTO_PDF_CONTENT_FOOTER_GAP,
  ORCAMENTO_PDF_FOOTER_BOTTOM_MARGIN
);
assert.equal(ORCAMENTO_PDF_CONTENT_BOTTOM_Y, FIRST_PAGE_CONTENT_BOTTOM);
assert.ok(ORCAMENTO_PDF_CONTENT_BOTTOM_Y > calcPdfContentBottomY(297));
assert.ok(ORCAMENTO_PDF_CONTENT_BOTTOM_Y < orcamentoFooterTop);
assert.ok(
  orcamentoFooterTop + PDF_FOOTER_H <=
    297 - ORCAMENTO_PDF_FOOTER_BOTTOM_MARGIN + 0.01
);

const cardsFit = resolveCardsBlockPlacement(180, 58);
assert.equal(cardsFit.cardH, 58);
assert.equal(cardsFit.needsNewPage, false);
assert.equal(blockFitsOnPage(180, 58), true);

const cardsOverflow = resolveCardsBlockPlacement(248, 58);
assert.equal(cardsOverflow.cardH, 58);
assert.equal(cardsOverflow.needsNewPage, true);
assert.equal(blockFitsOnPage(248, 58), false);
assert.ok(248 + 58 > FIRST_PAGE_CONTENT_BOTTOM);

const cardsTightFit = resolveCardsBlockPlacement(225, 54, 45);
assert.equal(cardsTightFit.needsNewPage, false);
assert.ok(cardsTightFit.cardH <= 54);
assert.ok(225 + cardsTightFit.cardH <= orcamentoFooterTop - 1);

function buildOrcamento(params: {
  numero: string;
  itens: Array<{ nome: string; quantidade: number; valor: number; id?: string }>;
  observacoes?: string | null;
  modalidade?: "pontual" | "mensalidade";
  quantidade_parcelas?: number | null;
  cliente_nome?: string;
  cliente_endereco?: string;
}): OrcamentoComItens {
  const itens = params.itens.map((item, index) => ({
    id: item.id ?? `i${index}`,
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
    cliente_nome: params.cliente_nome ?? "Empresa Teste Ltda",
    cliente_cnpj: "12.345.678/0001-90",
    cliente_endereco: params.cliente_endereco ?? "Rua A, 100",
    cliente_setor: "Comercio",
    contato: "Maria",
    email: "maria@teste.com",
    telefone: "(11) 99999-0000",
    responsavel: "Agatha",
    origem_cliente: null,
    modalidade: params.modalidade ?? "pontual",
    observacoes: params.observacoes ?? null,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: "pix",
    quantidade_parcelas:
      params.quantidade_parcelas === undefined ? 3 : params.quantidade_parcelas,
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

function catalogoDe(itens: OrcamentoComItens["orcamento_itens"]): ServicoSstRecord[] {
  return itens.map((item, index) => ({
    id: item.servico_id ?? `s-${index}`,
    nome: item.servico_nome,
    descricao:
      item.servico_nome === PACOTE_COMPLETO_SST_NOME ||
      item.servico_nome === SERVICO_AET_NOME ||
      item.servico_nome === SERVICO_INSALUBRIDADE_NOME
        ? null
        : "Exame complementar ocupacional.",
    valor_sugerido: item.valor_unitario,
    ativo: true,
    ordem: index,
    itens_inclusos:
      item.servico_nome === PACOTE_COMPLETO_SST_NOME
        ? [...PACOTE_COMPLETO_SST_ITENS]
        : item.servico_nome === GESTAO_SST_MENSAL_NOME
          ? [...GESTAO_COMPLETA_SST_ITENS]
          : item.servico_nome === SERVICO_AET_NOME
            ? [...AET_INCLUSOS_ITENS]
            : item.servico_nome === SERVICO_INSALUBRIDADE_NOME
              ? [...INSALUBRIDADE_INCLUSOS_ITENS]
              : null,
  }));
}

function renderPdf(
  orcamento: OrcamentoComItens,
  propostaMensalidade?: {
    exameAdmissional?: number | null;
    exameDemissional?: number | null;
  }
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawOrcamentoPdfDocument(doc, orcamento, {
    catalogo: catalogoDe(orcamento.orcamento_itens),
    propostaMensalidade,
  });
  return doc;
}

function pdfLatin1(doc: InstanceType<typeof jsPDF>): string {
  return Buffer.from(doc.output("arraybuffer")).toString("latin1");
}

function pdfVisibleText(raw: string): string {
  const chunks: string[] = [];
  const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    chunks.push(match[1].replace(/\\([()\\])/g, "$1"));
  }
  return chunks.join("\n");
}

function pageContentStreams(doc: InstanceType<typeof jsPDF>): string[] {
  const pages = (
    doc as unknown as {
      internal: { pages: Array<{ join?: (sep: string) => string } | undefined> };
    }
  ).internal.pages;
  const streams: string[] = [];
  for (let index = 1; index < pages.length; index += 1) {
    const page = pages[index];
    if (page && typeof page.join === "function") streams.push(page.join("\n"));
  }
  return streams;
}

function textPositions(stream: string): Array<{ xMm: number; yMm: number; text: string }> {
  const items: Array<{ xMm: number; yMm: number; text: string }> = [];
  const re = /([\d.]+) ([\d.]+) Td\s*\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(stream))) {
    const xPt = Number(match[1]);
    const yPt = Number(match[2]);
    items.push({
      xMm: (xPt * 25.4) / 72,
      yMm: 297 - (yPt * 25.4) / 72,
      text: match[3].replace(/\\([()\\])/g, "$1"),
    });
  }
  return items;
}

const layoutDummy = {
  logo: null,
  orcamento: buildOrcamento({
    numero: "ORC-2026-0001",
    itens: [{ nome: "Visita tecnica", quantidade: 1, valor: 400 }],
  }),
};

const spaceDoc = new jsPDF({ unit: "mm", format: "a4" });
assert.equal(ensureSpace(spaceDoc, 180, 50, layoutDummy), 180);
assert.equal(spaceDoc.getNumberOfPages(), 1);
const yAfterBreak = ensureSpace(spaceDoc, 248, 58, layoutDummy);
assert.equal(spaceDoc.getNumberOfPages(), 2);
assert.ok(yAfterBreak < 80, "nova pagina deve recomecar apos o cabecalho");
assert.ok(
  blockFitsOnPage(yAfterBreak, 58),
  "os cards devem caber inteiros na pagina nova"
);

const pequeno = renderPdf(
  buildOrcamento({
    numero: "ORC-2026-0001",
    itens: [{ nome: "Visita tecnica", quantidade: 1, valor: 400 }],
  })
);
assert.equal(pequeno.getNumberOfPages(), 1);
const pequenoRaw = pdfLatin1(pequeno);
assert.match(pequenoRaw, /Página 1 de 1|Pagina 1 de 1/);

const casoImagem = renderPdf(
  buildOrcamento({
    numero: "ORC-2026-0019",
    itens: [
      { nome: PACOTE_COMPLETO_SST_NOME, quantidade: 10, valor: 2800 },
      { nome: "Exames Complementares - Audiometria", quantidade: 10, valor: 450 },
    ],
  })
);
assert.equal(
  casoImagem.getNumberOfPages(),
  1,
  "Pacote SST + Audiometria cabe inteiro na primeira página, sem comprimir os cards"
);
const casoRaw = pdfLatin1(casoImagem);
assert.match(casoRaw, /Página 1 de 1|Pagina 1 de 1/);
assert.doesNotMatch(casoRaw, /Página 2 de /);

const qtdsIndividuaisOrcamento = buildOrcamento({
  numero: "ORC-2026-0300",
  itens: [
    { nome: PACOTE_COMPLETO_SST_NOME, quantidade: 3, valor: 1500 },
    { nome: "Exames Complementares - Audiometria", quantidade: 2, valor: 200 },
  ],
});
assert.equal(qtdsIndividuaisOrcamento.orcamento_itens[0].quantidade, 3);
assert.equal(qtdsIndividuaisOrcamento.orcamento_itens[1].quantidade, 2);
assert.equal(
  resolveQuantidadeColaboradoresOrcamento(qtdsIndividuaisOrcamento),
  3
);
const qtdsIndividuais = renderPdf(qtdsIndividuaisOrcamento);
assert.ok(qtdsIndividuais.getNumberOfPages() >= 1);
const qtdsRaw = pdfLatin1(qtdsIndividuais);
const qtdsVisible = pdfVisibleText(qtdsRaw);
assert.match(qtdsVisible, /Pacote completo/);
assert.match(qtdsVisible, /Audiometria/);
assert.match(qtdsVisible, /^3$/m);
assert.match(qtdsVisible, /^2$/m);

const maior = renderPdf(
  buildOrcamento({
    numero: "ORC-2026-0100",
    itens: Array.from({ length: 8 }, (_, i) => ({
      nome: i === 0 ? PACOTE_COMPLETO_SST_NOME : `Servico complementar ${i}`,
      quantidade: 5,
      valor: 300 + i * 20,
    })),
  })
);
assert.ok(maior.getNumberOfPages() >= 2);

const muitoMaior = renderPdf(
  buildOrcamento({
    numero: "ORC-2026-0200",
    itens: Array.from({ length: 24 }, (_, i) => ({
      nome: i === 0 ? PACOTE_COMPLETO_SST_NOME : `Item de servico ${i + 1}`,
      quantidade: 3,
      valor: 200,
    })),
  })
);
assert.ok(
  muitoMaior.getNumberOfPages() >= 3,
  "orcamento grande deve gerar 3+ paginas"
);
const muitoRaw = pdfLatin1(muitoMaior);
const totalPages = muitoMaior.getNumberOfPages();
assert.match(
  muitoRaw,
  new RegExp(`P[áa]gina 1 de ${totalPages}`)
);
assert.match(
  muitoRaw,
  new RegExp(`P[áa]gina ${totalPages} de ${totalPages}`)
);

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

const pontualPacote = renderPdf(
  buildOrcamento({
    numero: "ORC-2026-0300",
    itens: [{ nome: PACOTE_COMPLETO_SST_NOME, quantidade: 10, valor: 2800 }],
  })
);
assert.equal(pontualPacote.getNumberOfPages(), 1, "Pacote completo pontual deve caber em 1 página");
const pontualRaw = pdfVisibleText(pdfLatin1(pontualPacote));
assert.match(pontualRaw, /O que est[áa] incluso/i);
assert.match(pontualRaw, /Este pacote inclui/i);
assert.match(pontualRaw, /PGR/);
assert.match(pontualRaw, /LTCAT/);
assert.match(pontualRaw, /PCMSO/);
assert.match(pontualRaw, /Todos os Laudos e Servi[cç]os listados acima/i);
assert.match(pontualRaw, /Gest[aã]o completa e envio ao eSocial/i);
assert.match(pontualRaw, /Exames Cl[ií]nicos:/);
assert.match(pontualRaw, /Observa[cç][oõ]es/i);
assert.doesNotMatch(pontualRaw, /CAT - Cortesia/);
assert.doesNotMatch(pontualRaw, /Cortesia/);
assert.match(pontualRaw, /Valor Total/i);
assert.match(pontualRaw, /5%/);
assert.match(pontualRaw, /Valor abaixo equivalente/i);
assert.match(pontualRaw, /Laudos obrigat[oó]rios por lei/i);
assert.doesNotMatch(pontualRaw, /A presente proposta contempla/i);
assert.doesNotMatch(pontualRaw, /acompanhamento cont[ií]nuo da Navarro Engenharia/i);
assert.doesNotMatch(pontualRaw, /Essa gest[aã]o inclui/i);
assert.doesNotMatch(pontualRaw, /eSocial SST - Eventos/);
assert.doesNotMatch(pontualRaw, /12 mensalidades/);

const avistaPacoteOutro = renderPdf(
  buildOrcamento({
    numero: "ORC-2026-0345",
    itens: [
      { nome: PACOTE_COMPLETO_SST_NOME, quantidade: 34, valor: 4600 },
      { nome: "Outros", quantidade: 1, valor: 45 },
    ],
  })
);
const avistaRaw = pdfVisibleText(pdfLatin1(avistaPacoteOutro));
assert.match(avistaRaw, /4\.345/);
assert.doesNotMatch(avistaRaw, /4\.400/);
assert.match(avistaRaw, /4\.645/);

const VALOR_MENSAL_PDF = 350;
const mensalidadeOrc = buildOrcamento({
  numero: "ORC-2026-0301",
  modalidade: "mensalidade",
  quantidade_parcelas: null,
  cliente_nome: "AUTOMNI AUTOMAÇÕES INDUSTRIAIS LTDA",
  cliente_endereco:
    "Rua das Indústrias, 1000 - Distrito Industrial - São Paulo/SP",
  itens: [
    {
      nome: GESTAO_SST_MENSAL_NOME,
      quantidade: 23,
      valor: VALOR_MENSAL_PDF,
    },
  ],
});
const mensalPdf = renderPdf(mensalidadeOrc);
const mensalPropostaPages = mensalPdf.getNumberOfPages();
assert.ok(
  mensalPropostaPages >= 1 && mensalPropostaPages <= 2,
  `A proposta mensal cabe em até 2 páginas, gerou ${mensalPropostaPages}`
);
const mensalBinary = pdfLatin1(mensalPdf);
assert.match(
  mensalBinary,
  new RegExp(`P[áa]gina 1 de ${mensalPropostaPages}`)
);
assert.match(
  mensalBinary,
  new RegExp(`P[áa]gina ${mensalPropostaPages} de ${mensalPropostaPages}`)
);
const espacamentoMensal = /([0-9.]+) Tc/g;
let espacoMensal: RegExpExecArray | null;
while ((espacoMensal = espacamentoMensal.exec(mensalBinary))) {
  assert.ok(
    Number(espacoMensal[1]) <= 0.05,
    `espaçamento da proposta mensal ${espacoMensal[1]}`
  );
}
const mensalRaw = pdfVisibleText(mensalBinary);
assert.match(mensalRaw, /AUTOMNI AUTOMA[CÇ][OÕ]ES INDUSTRIAIS/i);
assert.match(
  mensalRaw,
  /A proposta contempla a Gest[aã]o Completa de Sa[uú]de e Seguran[cç]a do Trabalho por 12 meses/i
);
assert.match(mensalRaw, /PGR, LTCAT, PCMSO/);
assert.match(mensalRaw, /um exame cl[ií]nico peri[oó]dico por colaborador/i);
assert.match(mensalRaw, /demissional quando o desligamento ocorrer antes/i);
assert.match(
  mensalRaw,
  /Exames cl[ií]nicos avulsos admissionais e demissionais custam R\$ 50,00 cada/
);
assert.match(mensalRaw, /Exames complementares s[aã]o cobrados [aà] parte/);
assert.match(mensalRaw, /compromisso anual e renova[cç][aã]o autom[aá]tica/);
assert.match(mensalRaw, /anteced[eê]ncia m[ií]nima de 30 dias do t[eé]rmino/);
assert.doesNotMatch(mensalRaw, /detalhados no contrato/);
assert.doesNotMatch(mensalRaw, /Valores e condi[cç][oõ]es de renova[cç][aã]o/);
assert.doesNotMatch(mensalRaw, /quinto dia [uú]til/);
assert.doesNotMatch(mensalRaw, /R\$ 130,00/);
assert.doesNotMatch(mensalRaw, /IPCA/);
assert.doesNotMatch(mensalRaw, /boleto banc[aá]rio/);
assert.doesNotMatch(mensalRaw, /pagamento antecipado/i);
assert.doesNotMatch(mensalRaw, /ainda n[aã]o foi definido/);
assert.doesNotMatch(mensalRaw, /ASOs previstos no contrato/);
assert.doesNotMatch(mensalRaw, /ASOs adicionais/);
assert.match(mensalRaw, /Avalia[cç][aã]o de Riscos\s+Psicossociais/i);
assert.match(mensalRaw, /S-2210/);
assert.match(mensalRaw, /S-2220/);
assert.match(mensalRaw, /S-2240/);
assert.doesNotMatch(mensalRaw, /acompanhamento cont[ií]nuo da Navarro Engenharia/i);
assert.match(mensalRaw, /formato digital/i);
assert.doesNotMatch(mensalRaw, /Laudos obrigat[oó]rios por lei/i);
assert.doesNotMatch(mensalRaw, /Minist[eé]rio do trabalho/i);
assert.doesNotMatch(mensalRaw, /Valor abaixo equivalente/i);
assert.match(mensalRaw, /Essa gest[aã]o inclui/i);
assert.match(mensalRaw, /PGR - Programa de Gerenciamento de Riscos/i);
assert.match(mensalRaw, /LTCAT - Laudo T[eé]cnico das Condi[cç][oõ]es do Ambiente de Trabalho/i);
assert.match(mensalRaw, /PCMSO - NR-07 - Programa de Controle M[eé]dico de Sa[uú]de Ocupacional/i);
assert.match(mensalRaw, /ASO - Exames cl[ií]nicos ocupacionais/i);
assert.match(mensalRaw, /Riscos Psicossociais - NR-01 - Avalia[cç][aã]o e relat[oó]rio/i);
assert.match(mensalRaw, /eSocial SST - Eventos S-2210, S-2220 e S-2240/i);
assert.match(mensalRaw, /PGR/);
assert.match(mensalRaw, /LTCAT/);
assert.match(mensalRaw, /PCMSO/);
assert.match(mensalRaw, /ASO/);
assert.match(mensalRaw, /Riscos Psicossociais/i);
assert.match(mensalRaw, /BENEF[IÍ]CIOS DO PLANO/i);
assert.match(mensalRaw, /Gest[aã]o cont[ií]nua de SST durante a vig[eê]ncia/i);
assert.match(mensalRaw, /Gest[aã]o e envio dos eventos ao eSocial/i);
assert.match(mensalRaw, /Controle dos exames ocupacionais/i);
assert.match(mensalRaw, /Ampla rede de cl[ií]nicas para exames ocupacionais/i);
assert.match(mensalRaw, /em S[aã]o Paulo e[\s\S]*Grande SP/i);
assert.match(mensalRaw, /Documentos dispon[ií]veis em formato digital/i);
assert.match(mensalRaw, /Acompanhamento t[eé]cnico durante o contrato/i);
assert.match(mensalRaw, /Exames cl[ií]nicos avulsos e complementares ser[aã]o cobrados [aà] parte/i);
assert.doesNotMatch(mensalRaw, /O que est[áa] incluso/i);
assert.doesNotMatch(mensalRaw, /Todos os Laudos e Servi[cç]os listados acima/i);
assert.doesNotMatch(mensalRaw, /cl[ií]nicas credenciada/i);
assert.doesNotMatch(mensalRaw, /Tatuap[eé]/i);
assert.doesNotMatch(mensalRaw, /Itaquera/i);
assert.doesNotMatch(mensalRaw, /Se necess[aá]rio, a realiza[cç][aã]o de Exames Complementares/i);
assert.match(mensalRaw, new RegExp(ORCAMENTO_MENSALIDADE_CONDICAO_PAGAMENTO));
assert.match(mensalRaw, /12 meses/);
assert.match(mensalRaw, /Autom[aá]tica, aviso de 30 dias/i);
assert.match(mensalRaw, /R\$ 350,00/);
assert.match(mensalRaw, /\/ m[eê]s|\/ mês/);
assert.equal(formatValorMensalidade(VALOR_MENSAL_PDF), "R$ 350,00 / mês");
assert.doesNotMatch(mensalRaw, /Valor Total/i);
assert.doesNotMatch(mensalRaw, /4\.200|4200/);
assert.doesNotMatch(mensalRaw, /vista/i);
assert.doesNotMatch(mensalRaw, /5%/);
assert.doesNotMatch(mensalRaw, /Este pacote inclui/i);

const mensalPrecoProprio = pdfVisibleText(
  pdfLatin1(
    renderPdf(mensalidadeOrc, {
      exameAdmissional: 80,
      exameDemissional: 60,
    })
  )
);
assert.match(
  mensalPrecoProprio,
  /admissionais custam R\$ 80,00 cada e demissionais custam R\$ 60,00 cada/
);
assert.doesNotMatch(mensalPrecoProprio, /R\$ 50,00/);
assert.match(mensalPrecoProprio, /R\$ 350,00/);
assert.match(mensalPrecoProprio, /12 mensalidades/);

const mensalPaginado = renderPdf(
  buildOrcamento({
    numero: "ORC-2026-0302",
    modalidade: "mensalidade",
    quantidade_parcelas: null,
    observacoes: Array.from({ length: 40 }, (_, i) =>
      `Observação complementar ${i + 1} para forçar quebra de página no PDF mensal.`
    ).join(" "),
    itens: [
      {
        nome: GESTAO_SST_MENSAL_NOME,
        quantidade: 23,
        valor: VALOR_MENSAL_PDF,
      },
    ],
  })
);
assert.ok(
  mensalPaginado.getNumberOfPages() >= 2,
  "observações longas na mensalidade devem gerar 2+ páginas"
);
const mensalPagBinary = pdfLatin1(mensalPaginado);
const mensalPagRaw = pdfVisibleText(mensalPagBinary);
const mensalPages = mensalPaginado.getNumberOfPages();
assert.match(mensalPagRaw, /BENEF[IÍ]CIOS DO PLANO/i);
assert.match(mensalPagBinary, new RegExp(`P[áa]gina 1 de ${mensalPages}`));
assert.match(
  mensalPagBinary,
  new RegExp(`P[áa]gina ${mensalPages} de ${mensalPages}`)
);
assert.doesNotMatch(mensalPagRaw, /Valor Total/i);
assert.doesNotMatch(mensalPagRaw, /4\.200|4200/);

const aetOrc = buildOrcamento({
  numero: "ORC-2026-0401",
  modalidade: "pontual",
  quantidade_parcelas: 2,
  itens: [{ nome: SERVICO_AET_NOME, quantidade: 1, valor: 2800 }],
});
const aetDoc = renderPdf(aetOrc);
const aetRaw = pdfVisibleText(pdfLatin1(aetDoc));
assert.match(aetRaw, /An[aá]lise Ergon[oô]mica do Trabalho/);
assert.match(aetRaw, /crit[eé]rios aplic[aá]veis da NR-17/);
assert.match(aetRaw, /Visita t[eé]cnica para avalia[cç][aã]o das atividades/);
assert.match(aetRaw, /Entrega do documento final em formato digital/);
assert.doesNotMatch(aetRaw, /Quantidade de Colaboradores/i);
assert.doesNotMatch(aetRaw, /N[uú]mero de Colaboradores/i);
assert.doesNotMatch(aetRaw, /Exames Cl[ií]nicos/);
assert.doesNotMatch(aetRaw, /BENEF[IÍ]CIOS DO PLANO/i);
assert.doesNotMatch(aetRaw, /Pacote completo/);
assert.doesNotMatch(aetRaw, /Exame complementar ocupacional/i);
assert.doesNotMatch(aetRaw, /eSocial/);
assert.doesNotMatch(aetRaw, /Valor [àa] vista/i);
assert.doesNotMatch(aetRaw, /[ÀA] vista/);
assert.doesNotMatch(aetRaw, /5%/);
assert.doesNotMatch(aetRaw, /desconto/i);
assert.doesNotMatch(aetRaw, /arredond/i);
assert.match(aetRaw, /2 parcelas de/);
assert.match(aetRaw, /1\.400,00/);
assert.match(aetRaw, /2\.800,00/);
assert.match(aetRaw, /Condi[cç][aã]o de pagamento/i);
assert.match(aetRaw, /Valor total/i);
assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_AET.length, 3);
assert.equal(AET_INCLUSOS_ITENS.length, 8);
assert.doesNotMatch(aetRaw, /•/);
assert.doesNotMatch(aetRaw, /\u2022/);
assert.equal(aetOrc.modalidade, "pontual");
const previewDir = path.join(process.cwd(), "tmp");
fs.mkdirSync(previewDir, { recursive: true });
fs.writeFileSync(
  path.join(previewDir, "preview-aet.pdf"),
  Buffer.from(aetDoc.output("arraybuffer"))
);

const insalOrc = buildOrcamento({
  numero: "ORC-2026-0501",
  modalidade: "pontual",
  quantidade_parcelas: 2,
  itens: [{ nome: SERVICO_INSALUBRIDADE_NOME, quantidade: 1, valor: 4500 }],
});
const insalDoc = renderPdf(insalOrc);
const insalRaw = pdfVisibleText(pdfLatin1(insalDoc));
assert.match(insalRaw, /Laudo de Insalubridade/);
assert.match(insalRaw, /Norma Regulamentadora n[ºo] 15/);
assert.match(insalRaw, /auxiliar de limpeza/);
assert.match(insalRaw, /Visita t[eé]cnica na empresa/);
assert.match(insalRaw, /Mapeamento dos riscos insalubres/);
assert.match(insalRaw, /An[aá]lises quantitativas utilizando m[eé]todo e equipamento/);
assert.match(insalRaw, /adequado\./);
assert.match(insalRaw, /Elabora[cç][aã]o de Laudo de Insalubridade/);
assert.match(
  insalRaw,
  /Ser[aá] necess[aá]rio agendar um dia de visita pr[eé]via para avalia[cç][oõ]es/
);
assert.doesNotMatch(insalRaw, /Quantidade de Colaboradores/i);
assert.doesNotMatch(insalRaw, /N[uú]mero de Colaboradores/i);
assert.doesNotMatch(insalRaw, /Valor [àa] vista/i);
assert.doesNotMatch(insalRaw, /[ÀA] vista/);
assert.doesNotMatch(insalRaw, /5%/);
assert.doesNotMatch(insalRaw, /desconto/i);
assert.doesNotMatch(insalRaw, /An[aá]lise Ergon[oô]mica/);
assert.doesNotMatch(insalRaw, /NR-17/);
assert.doesNotMatch(insalRaw, /BENEF[IÍ]CIOS DO PLANO/i);
assert.doesNotMatch(insalRaw, /Pacote completo/);
assert.doesNotMatch(insalRaw, /eSocial/);
assert.doesNotMatch(insalRaw, /PGR/);
assert.doesNotMatch(insalRaw, /PCMSO/);
assert.doesNotMatch(insalRaw, /LTCAT/);
assert.doesNotMatch(insalRaw, /Riscos Psicossociais/);
assert.doesNotMatch(insalRaw, /Laudo de Parecer T[eé]cnico/);
assert.doesNotMatch(insalRaw, /quesitos t[eé]cnicos/i);
assert.match(insalRaw, /2 parcelas de/);
assert.match(insalRaw, /2\.250,00/);
assert.match(insalRaw, /4\.500,00/);
assert.match(insalRaw, /Condi[cç][aã]o de pagamento/i);
assert.match(insalRaw, /Valor total/i);
assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_INSALUBRIDADE.length, 1);
assert.equal(INSALUBRIDADE_INCLUSOS_ITENS.length, 4);
assert.equal(INSALUBRIDADE_INCLUSOS_OBSERVACOES.length, 1);
assert.doesNotMatch(insalRaw, /•/);
assert.doesNotMatch(insalRaw, /\u2022/);
fs.writeFileSync(
  path.join(previewDir, "preview-insalubridade.pdf"),
  Buffer.from(insalDoc.output("arraybuffer"))
);

const pericOrc = buildOrcamento({
  numero: "ORC-2026-0701",
  modalidade: "pontual",
  quantidade_parcelas: 2,
  itens: [{ nome: SERVICO_PERICULOSIDADE_NOME, quantidade: 3, valor: 4500 }],
});
const pericDoc = renderPdf(pericOrc);
const pericRaw = pdfVisibleText(pdfLatin1(pericDoc));
assert.match(pericRaw, /Laudo de Periculosidade \(NR16\)/);
assert.match(pericRaw, /enquadramento na NR-16/);
assert.match(pericRaw, /Ponto 01/);
assert.match(pericRaw, /GLP e ma[cç]arico nas injetoras/);
assert.match(pericRaw, /Ponto 02/);
assert.match(pericRaw, /Cilindros de gases na ferramentaria/);
assert.match(pericRaw, /Ponto 03/);
assert.match(pericRaw, /Empilhadeira a GLP/);
assert.match(pericRaw, /Ponto 04/);
assert.match(pericRaw, /Rede de g[aá]s e tratamento por chama/);
assert.match(pericRaw, /implementa[cç][aã]o das medidas corretivas/);
assert.match(pericRaw, /Visita t[eé]cnica [àa] empresa/);
assert.match(pericRaw, /Identifica[cç][aã]o e avalia[cç][aã]o das condi[cç][oõ]es de risco/);
assert.match(pericRaw, /[aá]reas de risco conforme a NR-16/);
assert.match(pericRaw, /Elabora[cç][aã]o do Laudo T[eé]cnico de Periculosidade/);
assert.match(
  pericRaw,
  /caracteriza[cç][aã]o ou n[aã]o da periculosidade/
);
assert.match(pericRaw, /(^|\n)Quantidade(\n|$)/);
assert.match(pericRaw, /(^|\n)3(\n|$)/);
assert.doesNotMatch(pericRaw, /Quantidade de Colaboradores/i);
assert.doesNotMatch(pericRaw, /N[uú]mero de Colaboradores/i);
assert.doesNotMatch(pericRaw, /13\.500|13500/);
assert.match(pericRaw, /4\.500,00/);
assert.match(pericRaw, /2 parcelas de/);
assert.match(pericRaw, /2\.250,00/);
assert.match(pericRaw, /Condi[cç][aã]o de pagamento/i);
assert.doesNotMatch(pericRaw, /Valor [àa] vista/i);
assert.doesNotMatch(pericRaw, /[ÀA] vista/);
assert.doesNotMatch(pericRaw, /5%/);
assert.doesNotMatch(pericRaw, /An[aá]lise Ergon[oô]mica/);
assert.doesNotMatch(pericRaw, /NR-17/);
assert.doesNotMatch(pericRaw, /Laudo de Insalubridade/);
assert.doesNotMatch(pericRaw, /NR-15/);
assert.doesNotMatch(pericRaw, /Laudo AET/);
assert.doesNotMatch(pericRaw, /eSocial/);
assert.doesNotMatch(pericRaw, /PGR/);
assert.doesNotMatch(pericRaw, /PCMSO/);
assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_PERICULOSIDADE.length, 7);
assert.equal(PERICULOSIDADE_INCLUSOS_ITENS.length, 4);
assert.equal(PERICULOSIDADE_INCLUSOS_OBSERVACOES.length, 1);
assert.equal(resolveItemValorServico(pericOrc.orcamento_itens![0]), 4500);
fs.writeFileSync(
  path.join(previewDir, "preview-periculosidade.pdf"),
  Buffer.from(pericDoc.output("arraybuffer"))
);

const ltcatOrc = buildOrcamento({
  numero: "ORC-2026-0601",
  modalidade: "pontual",
  quantidade_parcelas: 1,
  itens: [{ nome: SERVICO_LTCAT_NOME, quantidade: 20, valor: 2000 }],
});
const ltcatDoc = renderPdf(ltcatOrc);
const ltcatRaw = pdfVisibleText(pdfLatin1(ltcatDoc));
const ltcatNomeDoc = new jsPDF({ unit: "mm", format: "a4" });
ltcatNomeDoc.setFont("helvetica", "bold");
ltcatNomeDoc.setFontSize(9.5);
const ltcatColServico = 138;
const ltcatNomeLines = ltcatNomeDoc.splitTextToSize(
  SERVICO_LTCAT_NOME_EXIBICAO,
  ltcatColServico - 6
);
const ltcatNomeLista = Array.isArray(ltcatNomeLines)
  ? ltcatNomeLines
  : [String(ltcatNomeLines)];
assert.ok(ltcatNomeLista.length >= 1);
for (const line of ltcatNomeLista) {
  assert.ok(
    ltcatNomeDoc.getTextWidth(line) <= ltcatColServico - 6 + 0.05,
    `linha do nome ultrapassa a coluna Serviço: ${line}`
  );
}
assert.match(ltcatRaw, /Laudo T[eé]cnico das Condi[cç][oõ]es Ambientais do Trabalho/);
assert.equal(
  ltcatNomeLista.join("\n"),
  "LTCAT – Laudo Técnico das Condições Ambientais do Trabalho",
  "sem a coluna de quantidade, o nome do LTCAT cabe na coluna Serviço"
);
assert.match(ltcatRaw, /aposentadoria especial/);
assert.match(ltcatRaw, /enquadramento previdenci[aá]rio/);
assert.match(ltcatRaw, /Visita t[eé]cnica para levantamento das atividades/);
assert.match(ltcatRaw, /Entrega do laudo final em formato digital/);
assert.match(ltcatRaw, /O que est[áa] incluso/i);
assert.doesNotMatch(ltcatRaw, /Quantidade de Colaboradores/i);
assert.doesNotMatch(ltcatRaw, /N[uú]mero de Colaboradores/i);
assert.doesNotMatch(ltcatRaw, /(^|\n)20(\n|$)/);
assert.match(ltcatRaw, /2\.000,00/);
assert.doesNotMatch(ltcatRaw, /40\.000|40000/);
assert.doesNotMatch(ltcatRaw, /Valor abaixo equivalente/);
assert.doesNotMatch(ltcatRaw, /An[aá]lise Ergon[oô]mica/);
assert.doesNotMatch(ltcatRaw, /NR-17/);
assert.doesNotMatch(ltcatRaw, /Laudo de Insalubridade/);
assert.doesNotMatch(ltcatRaw, /Este pacote inclui/i);
assert.doesNotMatch(ltcatRaw, /Exame complementar ocupacional/);
assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_LTCAT.length, 2);
assert.equal(LTCAT_INCLUSOS_ITENS.length, 6);
assert.equal(resolveItemValorServico(ltcatOrc.orcamento_itens![0]), 2000);

const mistoOrc = buildOrcamento({
  numero: "ORC-2026-0602",
  modalidade: "pontual",
  quantidade_parcelas: 1,
  itens: [
    { nome: SERVICO_LTCAT_NOME, quantidade: 20, valor: 2000 },
    { nome: "PGR", quantidade: 5, valor: 800 },
  ],
});
const mistoDoc = renderPdf(mistoOrc);
const mistoRaw = pdfVisibleText(pdfLatin1(mistoDoc));
assert.equal(mistoOrc.valor_total, 2800);
assert.match(mistoRaw, /2\.800,00/);
assert.match(mistoRaw, /2\.000,00/);
assert.match(mistoRaw, /800,00/);
assert.match(mistoRaw, /Condi[cç][oõ]es Ambientais do Trabalho/);
assert.match(mistoRaw, /Valor abaixo equivalente/);
assert.match(mistoRaw, /PGR/);
assert.match(mistoRaw, /Quantidade de\nColaboradores/i);
assert.match(mistoRaw, /(^|\n)5(\n|$)/);
assert.doesNotMatch(mistoRaw, /(^|\n)20(\n|$)/);
assert.match(mistoRaw, /Visita t[eé]cnica para/);
assert.match(mistoRaw, /levantamento das atividades/);
assert.doesNotMatch(mistoRaw, /40\.000|40000/);
assert.doesNotMatch(mistoRaw, /16\.000|16000/);
fs.writeFileSync(
  path.join(previewDir, "preview-ltcat.pdf"),
  Buffer.from(ltcatDoc.output("arraybuffer"))
);

const pgrOrc = buildOrcamento({
  numero: "ORC-2026-0801",
  modalidade: "pontual",
  quantidade_parcelas: 2,
  itens: [{ nome: SERVICO_PGR_NOME, quantidade: 4, valor: 3200 }],
});
const pgrDoc = renderPdf(pgrOrc);
const pgrRaw = pdfVisibleText(pdfLatin1(pgrDoc));
assert.match(pgrRaw, /PGR - Programa de Gerenciamento de Riscos/);
assert.match(pgrRaw, /invent[aá]rio de riscos ocupacionais/);
assert.match(pgrRaw, /plano de a[cç][aã]o/);
assert.match(pgrRaw, /NR-01/);
assert.match(pgrRaw, /O que est[áa] incluso/i);
assert.match(pgrRaw, /Visita t[eé]cnica para reconhecimento/);
assert.match(pgrRaw, /Entrega do documento final em formato digital/);
assert.match(pgrRaw, /implementa[cç][aã]o das medidas indicadas no plano de a[cç][aã]o/);
assert.match(pgrRaw, /(^|\n)Quantidade(\n|$)/);
assert.match(pgrRaw, /(^|\n)4(\n|$)/);
assert.doesNotMatch(pgrRaw, /Quantidade de Colaboradores/i);
assert.doesNotMatch(pgrRaw, /N[uú]mero de Colaboradores/i);
assert.match(pgrRaw, /3\.200,00/);
assert.doesNotMatch(pgrRaw, /12\.800|12800/);
assert.match(pgrRaw, /2x de R\$ 1\.600,00/);
assert.match(pgrRaw, /[ÀA] vista \(5% de desconto\)/);
assert.doesNotMatch(pgrRaw, /aposentadoria especial/);
assert.doesNotMatch(pgrRaw, /enquadramento previdenci[aá]rio/);
assert.doesNotMatch(pgrRaw, /eSocial/);
assert.doesNotMatch(pgrRaw, /agentes nocivos/);
assert.doesNotMatch(pgrRaw, /An[aá]lise Ergon[oô]mica/);
assert.doesNotMatch(pgrRaw, /NR-15/);
assert.doesNotMatch(pgrRaw, /NR-16/);
assert.doesNotMatch(pgrRaw, /Laudo de Insalubridade/);
assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_PGR.length, 2);
assert.equal(PGR_INCLUSOS_ITENS.length, 6);
assert.equal(PGR_INCLUSOS_OBSERVACOES.length, 2);
assert.equal(resolveItemValorServico(pgrOrc.orcamento_itens![0]), 3200);
fs.writeFileSync(
  path.join(previewDir, "preview-pgr.pdf"),
  Buffer.from(pgrDoc.output("arraybuffer"))
);

const variasPaginas = renderPdf(
  buildOrcamento({
    numero: "ORC-2026-9099",
    observacoes:
      "Observacao de validacao das margens, com texto suficiente para ocupar a base da ultima pagina do orcamento.",
    itens: Array.from({ length: 24 }, (_, index) => ({
      nome: `Item de servico ${String(index + 1).padStart(2, "0")}`,
      quantidade: 3,
      valor: 200,
    })),
  })
);
const paginas = pageContentStreams(variasPaginas);
assert.ok(paginas.length >= 2, "orçamento de validação precisa de várias páginas");
const headerBottom = ORCAMENTO_PDF_MARGIN_TOP + 46;
const footerBottom = orcamentoFooterTop + PDF_FOOTER_H;
paginas.forEach((stream, pageIndex) => {
  const items = textPositions(stream);
  assert.ok(items.length > 8, `página ${pageIndex + 1} sem texto`);
  const proposta = items.filter((item) => item.text === "PROPOSTA COMERCIAL");
  assert.equal(proposta.length, 1, `cabeçalho da página ${pageIndex + 1}`);
  assert.ok(
    Math.abs(proposta[0].yMm - (ORCAMENTO_PDF_MARGIN_TOP + 16)) < 0.4,
    `topo do cabeçalho na página ${pageIndex + 1}`
  );
  let noRodape = 0;
  for (const item of items) {
    assert.ok(
      item.xMm >= 11.5,
      `margem lateral de "${item.text}" na página ${pageIndex + 1}`
    );
    assert.ok(
      item.yMm >= ORCAMENTO_PDF_MARGIN_TOP - 0.3,
      `"${item.text}" acima do cabeçalho`
    );
    if (item.yMm >= orcamentoFooterTop - 0.35) {
      assert.ok(
        item.yMm <= footerBottom + 0.35,
        `"${item.text}" atravessa o rodapé (${item.yMm.toFixed(2)} mm)`
      );
      noRodape += 1;
      continue;
    }
    if (item.yMm <= headerBottom + 0.6) continue;
    assert.ok(
      item.yMm <= ORCAMENTO_PDF_CONTENT_BOTTOM_Y + 0.8,
      `"${item.text}" em ${item.yMm.toFixed(2)} mm invade a reserva do rodapé`
    );
  }
  assert.ok(noRodape >= 4, `rodapé incompleto na página ${pageIndex + 1}`);
});
const dadosCliente = textPositions(paginas[0]).find(
  (item) => item.text === "DADOS DO CLIENTE"
);
assert.ok(dadosCliente);
assert.ok(Math.abs(dadosCliente.xMm - 12) < 0.4);

console.log("test-orcamento-pdf: OK");
