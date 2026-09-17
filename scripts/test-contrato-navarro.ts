/** Testes: contrato Navarro (pontual, mensalidade, calendário, PDF). */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jsPDF } from "jspdf";
import {
  formatMoedaComExtenso,
  formatNumeroComExtenso,
  numeroPorExtenso,
  valorPorExtenso,
} from "../lib/extenso";
import {
  addCalendarMonths,
  centsToReais,
  montarMensalidades,
  montarParcelasPontual,
  somaParcelasCentavos,
  splitValorEmCentavos,
} from "../lib/contrato-pagamento";
import {
  CONTRATO_TEXTOS_PROIBIDOS,
  NAVARRO_CONTRATO_INSTITUCIONAL,
} from "../lib/contrato-navarro";
import {
  buildContratoNavarroDocumento,
  podeGerarContratoNavarro,
} from "../lib/contrato-modelo";
import { drawContratoPdfDocument } from "../lib/contrato-pdf";
import { buildOrcamentoOnboardingPath } from "../lib/orcamento-onboarding-files";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoComItens } from "../lib/orcamento-types";
import {
  GESTAO_SST_MENSAL_NOME,
  ORCAMENTO_MODALIDADE_MENSALIDADE,
  ORCAMENTO_MODALIDADE_PONTUAL,
} from "../lib/orcamento-modalidade";
import { PACOTE_COMPLETO_SST_NOME } from "../lib/servico-sst-pacote";
import { formatCurrency } from "../lib/money";

function run(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn()).then(
    () => {
      console.log(`OK  ${name}`);
    },
    (err) => {
      console.error(`FAIL  ${name}`);
      throw err;
    }
  );
}

function makeOrcamento(
  over: Partial<OrcamentoComItens> &
    Pick<OrcamentoComItens, "modalidade" | "valor_total" | "orcamento_itens">
): OrcamentoComItens {
  return {
    id: "o1",
    numero: "ORC-2026-0100",
    data_proposta: "2026-09-10",
    cliente_id: "c1",
    cliente_nome: "EMPRESA EXEMPLO LTDA",
    cliente_cnpj: "12345678000199",
    cliente_endereco: "Rua das Flores, 100, São Paulo/SP",
    cliente_setor: "Comércio",
    contato: "Maria",
    email: "contato@empresa.com",
    telefone: "(11) 99999-0000",
    responsavel: "AGATHA",
    origem_cliente: "indicacao",
    observacoes: null,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: "parcelado",
    quantidade_parcelas: 3,
    validade_proposta: null,
    subtotal: over.valor_total,
    status: "aprovado",
    assinatura_status: "nao_aplicavel",
    assinatura_token: null,
    aceite_em: null,
    aceite_ip: null,
    aceite_usuario_nome: null,
    link_aceite_expira_em: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function makeAprovacao(
  over: Partial<OrcamentoAprovacaoRecord> = {}
): OrcamentoAprovacaoRecord {
  return {
    id: "ap1",
    orcamento_id: "o1",
    quantidade_colaboradores: 23,
    valor_final: 1400,
    condicao_pagamento: "3 parcelas",
    quantidade_parcelas: 3,
    valor_parcela: 466.67,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "Ágatha",
    aprovado_em: "2026-09-17T12:00:00.000Z",
    contrato_enviado: false,
    contrato_enviado_em: null,
    contrato_assinado: false,
    contrato_assinado_em: null,
    observacao_contrato: null,
    boleto_vencimento: null,
    boleto_pago: false,
    boleto_pago_em: null,
    comprovante_path: null,
    comprovante_nome: null,
    comprovante_tipo: null,
    comprovante_tamanho: null,
    observacao_pagamento: null,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

function extractPdfLatin1(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("latin1");
}

function assertSemTextosProibidos(texto: string, contexto: string) {
  for (const proibido of CONTRATO_TEXTOS_PROIBIDOS) {
    assert.ok(
      !texto.includes(proibido),
      `${contexto} não pode conter "${proibido}"`
    );
  }
  assert.ok(!/eko/i.test(texto), `${contexto} não pode conter Eko`);
}

async function main() {
  await run("extenso de colaboradores", () => {
  assert.equal(numeroPorExtenso(2), "dois");
  assert.equal(numeroPorExtenso(17), "dezessete");
  assert.equal(numeroPorExtenso(23), "vinte e três");
  assert.equal(numeroPorExtenso(46), "quarenta e seis");
  assert.equal(formatNumeroComExtenso(23), "23 (vinte e três)");
  assert.equal(valorPorExtenso(350), "trezentos e cinquenta reais");
  assert.equal(valorPorExtenso(1400), "mil e quatrocentos reais");
  assert.equal(
    valorPorExtenso(466.67),
    "quatrocentos e sessenta e seis reais e sessenta e sete centavos"
  );
  assert.equal(
    formatMoedaComExtenso(350),
    "R$ 350,00 (trezentos e cinquenta reais)"
  );
});

await run("divisão monetária 1400 / 3", () => {
  const cents = splitValorEmCentavos(1400, 3);
  assert.deepEqual(cents, [46667, 46667, 46666]);
  assert.equal(cents.reduce((a, b) => a + b, 0), 140000);
  assert.equal(centsToReais(46667), 466.67);
  assert.equal(centsToReais(46666), 466.66);
});

await run("parcelas pontual 17/09/2026", () => {
  const parcelas = montarParcelasPontual({
    valorTotal: 1400,
    quantidadeParcelas: 3,
    dataContrato: "2026-09-17",
  });
  assert.equal(parcelas.length, 3);
  assert.equal(parcelas[0]?.dataIso, "2026-09-17");
  assert.equal(parcelas[0]?.valor, 466.67);
  assert.equal(parcelas[1]?.dataIso, "2026-10-17");
  assert.equal(parcelas[1]?.valor, 466.67);
  assert.equal(parcelas[2]?.dataIso, "2026-11-17");
  assert.equal(parcelas[2]?.valor, 466.66);
  assert.equal(somaParcelasCentavos(parcelas), 140000);
});

await run("calendário real (não +30 dias)", () => {
  assert.equal(addCalendarMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addCalendarMonths("2026-01-31", 2), "2026-03-31");
  assert.equal(addCalendarMonths("2024-02-29", 1), "2024-03-29");
  assert.equal(addCalendarMonths("2024-02-29", 12), "2025-02-28");
  assert.equal(addCalendarMonths("2026-11-30", 1), "2026-12-30");
  assert.equal(addCalendarMonths("2026-12-31", 1), "2027-01-31");
  assert.equal(addCalendarMonths("2026-12-31", 2), "2027-02-28");
});

await run("contrato pontual", () => {
  const orcamento = makeOrcamento({
    modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
    valor_total: 1400,
    quantidade_parcelas: 3,
    orcamento_itens: [
      {
        id: "i1",
        orcamento_id: "o1",
        servico_id: "s1",
        servico_nome: PACOTE_COMPLETO_SST_NOME,
        quantidade: 23,
        valor_unitario: 1400,
        valor_total: 1400,
        ordem: 0,
      },
    ],
  });
  const aprovacao = makeAprovacao();
  assert.equal(podeGerarContratoNavarro(orcamento, aprovacao), true);

  const doc = buildContratoNavarroDocumento({
    orcamento,
    aprovacao,
    dataContrato: "2026-09-17",
  });
  assert.equal(doc.modalidade, "pontual");
  assert.equal(doc.colaboradores, 23);
  assert.equal(doc.parcelas.length, 3);
  assert.equal(doc.parcelas[0]?.dataIso, "2026-09-17");
  assert.equal(doc.parcelas[2]?.valor, 466.66);

  const texto = doc.texto;
  assert.match(texto, /Proposta Comercial nº ORC-2026-0100/);
  assert.match(texto, /23 \(vinte e três\) colaboradores/);
  assert.match(texto, /Programa de Gerenciamento de Riscos \(PGR\)/);
  assert.ok(!/PPRA/i.test(texto));
  assert.match(
    texto,
    /Avaliação de Riscos Psicossociais – NR-01, conforme metodologia e escopo previstos na proposta comercial/
  );
  assert.match(texto, /S-2210, S-2220 e S-2240/);
  assert.match(
    texto,
    /Exames complementares não estão incluídos no valor contratado/
  );
  assert.match(texto, /R\$ 100,00 \(cem reais\)/);
  assert.match(texto, /R\$ 50,00 \(cinquenta reais\)/);
  assert.match(texto, /multa de 2%/);
  assert.match(texto, /juros de mora de 1%/);
  assert.match(texto, /CONTRATANTE/);
  assert.match(texto, /CONTRATADA/);
  assert.ok(texto.includes(NAVARRO_CONTRATO_INSTITUCIONAL.razaoSocial));
  assert.ok(!texto.includes("valor mensal"));
  assertSemTextosProibidos(texto, "pontual");
  assert.equal(aprovacao.contrato_enviado, false);
  assert.equal(aprovacao.contrato_assinado, false);
});

await run("contrato mensalidade nunca mostra anual", () => {
  const valorMensal = 350;
  const orcamento = makeOrcamento({
    id: "o2",
    numero: "ORC-2026-0200",
    modalidade: ORCAMENTO_MODALIDADE_MENSALIDADE,
    valor_total: valorMensal,
    quantidade_parcelas: null,
    forma_pagamento: null,
    orcamento_itens: [
      {
        id: "i1",
        orcamento_id: "o2",
        servico_id: "s2",
        servico_nome: GESTAO_SST_MENSAL_NOME,
        quantidade: 23,
        valor_unitario: valorMensal,
        valor_total: valorMensal,
        ordem: 0,
      },
    ],
  });
  const aprovacao = makeAprovacao({
    orcamento_id: "o2",
    valor_final: valorMensal,
    quantidade_parcelas: null,
    valor_parcela: null,
    condicao_pagamento: "12 mensalidades",
  });

  const doc = buildContratoNavarroDocumento({
    orcamento,
    aprovacao,
    dataContrato: "2026-09-17",
  });
  assert.equal(doc.modalidade, "mensalidade");
  assert.equal(doc.valor, 350);
  assert.equal(doc.parcelas.length, 12);
  assert.equal(doc.parcelas[0]?.dataIso, "2026-09-17");
  assert.equal(doc.parcelas[1]?.dataIso, "2026-10-17");
  assert.equal(doc.parcelas.every((p) => p.valor === 350), true);

  const texto = doc.texto;
  const anual = formatCurrency(valorMensal * 12);
  assert.ok(!texto.includes(anual), `não pode conter ${anual}`);
  assert.ok(!texto.includes("4.200"));
  assert.ok(!texto.includes("4200"));
  assert.ok(!/valor total do contrato/i.test(texto));
  assert.match(texto, /valor mensal de R\$ 350,00 \(trezentos e cinquenta reais\)/);
  assert.match(texto, /12 \(doze\) mensalidades/);
  assert.match(texto, /vigência mínima inicial/);
  assert.match(texto, /IPCA/);
  assert.ok(!/IPC-FIPE/i.test(texto));
  assert.match(texto, /automaticamente renovado/);
  assert.match(texto, /30 \(trinta\) dias/);
  assert.match(texto, /permanência mínima contratual/);
  assert.match(texto, /mensalidades correspondentes até o término/);
  assert.ok(!/multa percentual/i.test(texto) || texto.includes("não se confunde com multa percentual"));
  assert.match(texto, /R\$ 50,00 \(cinquenta reais\)/);
  assert.ok(!texto.includes("R$ 100,00"));
  assert.match(texto, /inadimplência superior a 10 \(dez\) dias/);
  assert.match(texto, /suspender os serviços/);
  assert.match(texto, /nem implica cancelamento automático/);
  assert.match(texto, /multa de 2%/);
  assert.match(texto, /juros de mora de 1%/);
  assertSemTextosProibidos(texto, "mensalidade");
});

await run("orçamento antigo sem modalidade explícita usa pontual", () => {
  const orcamento = makeOrcamento({
    modalidade: null,
    valor_total: 1400,
    orcamento_itens: [
      {
        id: "i1",
        orcamento_id: "o1",
        servico_id: "s1",
        servico_nome: GESTAO_SST_MENSAL_NOME,
        quantidade: 23,
        valor_unitario: 1400,
        valor_total: 1400,
        ordem: 0,
      },
    ],
  });
  const doc = buildContratoNavarroDocumento({
    orcamento,
    aprovacao: makeAprovacao(),
    dataContrato: "2026-09-17",
  });
  assert.equal(doc.modalidade, "pontual");
  assert.ok(doc.texto.includes("R$ 100,00"));
});

await run("path de storage reutiliza onboarding", () => {
  const p = buildOrcamentoOnboardingPath("ap1", "contrato", "Contrato.pdf");
  assert.match(p, /^ap1\/contrato-\d+\.pdf$/);
});

await run("PDF pontual e mensalidade", async () => {
  const pontualOrc = makeOrcamento({
    modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
    valor_total: 1400,
    orcamento_itens: [
      {
        id: "i1",
        orcamento_id: "o1",
        servico_id: "s1",
        servico_nome: PACOTE_COMPLETO_SST_NOME,
        quantidade: 23,
        valor_unitario: 1400,
        valor_total: 1400,
        ordem: 0,
      },
    ],
  });
  const pontual = buildContratoNavarroDocumento({
    orcamento: pontualOrc,
    aprovacao: makeAprovacao(),
    dataContrato: "2026-09-17",
  });
  const docP = new jsPDF({ unit: "mm", format: "a4" });
  drawContratoPdfDocument(docP, pontual, null);
  assert.ok(docP.getNumberOfPages() >= 2, "pontual deve ter várias páginas");
  const bufP = docP.output("arraybuffer") as ArrayBuffer;
  const rawP = extractPdfLatin1(bufP);
  assert.ok(bufP.byteLength > 2000);
  assert.ok(!/Eko/i.test(rawP));
  assert.ok(!rawP.includes("A&L"));
  assert.ok(!/QR Code/i.test(rawP));

  const mensalOrc = makeOrcamento({
    modalidade: ORCAMENTO_MODALIDADE_MENSALIDADE,
    valor_total: 350,
    orcamento_itens: [
      {
        id: "i1",
        orcamento_id: "o1",
        servico_id: "s2",
        servico_nome: GESTAO_SST_MENSAL_NOME,
        quantidade: 23,
        valor_unitario: 350,
        valor_total: 350,
        ordem: 0,
      },
    ],
  });
  const mensal = buildContratoNavarroDocumento({
    orcamento: mensalOrc,
    aprovacao: makeAprovacao({
      valor_final: 350,
      quantidade_parcelas: null,
      condicao_pagamento: "12 mensalidades",
    }),
    dataContrato: "2026-09-17",
  });
  const docM = new jsPDF({ unit: "mm", format: "a4" });
  drawContratoPdfDocument(docM, mensal, null);
  assert.ok(docM.getNumberOfPages() >= 2, "mensalidade deve ter várias páginas");
  const bufM = docM.output("arraybuffer") as ArrayBuffer;
  const rawM = extractPdfLatin1(bufM);
  assert.ok(!rawM.includes("4.200"));
  assert.ok(!rawM.includes("4200"));
  assert.ok(!/Eko/i.test(rawM));
  assert.ok(!rawM.includes("A&L"));

  const dir = os.tmpdir();
  const pontualPath = path.join(dir, "contrato-navarro-pontual.pdf");
  const mensalPath = path.join(dir, "contrato-navarro-mensalidade.pdf");
  fs.writeFileSync(pontualPath, Buffer.from(bufP));
  fs.writeFileSync(mensalPath, Buffer.from(bufM));
  console.log(`    PDF pontual: ${pontualPath} (${docP.getNumberOfPages()} págs)`);
  console.log(
    `    PDF mensalidade: ${mensalPath} (${docM.getNumberOfPages()} págs)`
  );
});

  console.log("\nTodos os testes de contrato Navarro passaram.");
}

void main();
