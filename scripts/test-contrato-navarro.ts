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
  montarDatasMensalidadesPlano,
  montarMensalidades,
  montarParcelasPontual,
  somaParcelasCentavos,
  splitValorEmCentavos,
} from "../lib/contrato-pagamento";
import {
  CONTRATO_TEXTOS_PROIBIDOS,
  DIA_VENCIMENTO_MENSALIDADE_PENDENTE_MSG,
  NAVARRO_CONTRATO_INSTITUCIONAL,
  buildClausulasContrato,
  paragrafosPropostaGestaoMensal,
  redigirContratada,
  textoPlanoContrato,
  valorMensalidadeRenovacaoGestaoSst,
  vigenciaContratualConfiavel,
} from "../lib/contrato-navarro";
import {
  buildContratoNavarroDocumento,
  podeGerarContratoNavarro,
} from "../lib/contrato-modelo";
import {
  drawContratoPdfDocument,
  nomeArquivoContratoNavarro,
} from "../lib/contrato-pdf";
import { mensagemErroContratoDocumento } from "../lib/contrato-documento-erro";
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

await run("qualificação da CONTRATADA inclui sede", () => {
  assert.equal(
    redigirContratada(),
    "NAVARRO ENGENHARIA DE SEGURANÇA DO TRABALHO E MEDICINA OCUPACIONAL LTDA, inscrita no CNPJ sob nº 45.206.250/0001-10, com sede na Rua Francisco Marengo, nº 500, Tatuapé, São Paulo/SP, CEP 03313-000, telefone (11) 3181-7697, e-mail contato@navarroeng.com.br, doravante denominada CONTRATADA."
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
  assert.ok(texto.includes("Rua Francisco Marengo, nº 500, Tatuapé, São Paulo/SP, CEP 03313-000"));
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

  assert.throws(
    () =>
      buildContratoNavarroDocumento({
        orcamento,
        aprovacao,
        dataContrato: "2026-09-17",
      }),
    (err: unknown) =>
      err instanceof Error &&
      err.message === DIA_VENCIMENTO_MENSALIDADE_PENDENTE_MSG
  );

  const doc = buildContratoNavarroDocumento({
    orcamento,
    aprovacao,
    dataContrato: "2026-09-17",
    diaVencimentoMensalidade: 10,
  });
  assert.equal(doc.modalidade, "mensalidade");
  assert.equal(doc.valor, 350);
  assert.equal(doc.parcelas.length, 0);
  assert.doesNotMatch(doc.texto, /17\/09\/2026/);

  const texto = doc.texto;
  const anual = formatCurrency(valorMensal * 12);
  assert.ok(!texto.includes(anual), `não pode conter ${anual}`);
  assert.ok(!texto.includes("4.200"));
  assert.ok(!texto.includes("4200"));
  assert.ok(!/valor total do contrato/i.test(texto));
  assert.match(texto, /valor mensal de R\$ 350,00 \(trezentos e cinquenta reais\)/);
  assert.match(texto, /12 \(doze\) mensalidades/);
  assert.match(texto, /compromisso anual/);
  assert.match(texto, /1 \(um\) exame clínico periódico/);
  assert.match(texto, /quinto dia útil/);
  assert.match(texto, /boleto bancário/);
  assert.match(texto, /R\$ 130,00 \(cento e trinta reais\)/);
  assert.match(texto, /R\$ 10,00 \(dez reais\)/);
  assert.match(texto, /R\$ 140,00/);
  assert.match(texto, /R\$ 220,00/);
  assert.match(texto, /R\$ 270,00/);
  assert.match(texto, /Não há reajuste automático pelo IPCA/);
  assert.doesNotMatch(texto, /critério de cálculo|ainda não está registrado neste instrumento|reajuste anual pelo IPCA|poderão ser reajustados pelo IPCA/);
  assert.doesNotMatch(texto, /pagamento à vista|pago antecipadamente nesta|inclusão de novo funcionário/i);
  assert.doesNotMatch(texto, /permanência mínima|mensalidades correspondentes até o término|não possui valor global anual/i);
  assert.match(texto, /desistência imotivada/);
  assert.match(texto, /sem antecipação automática do saldo/);
  assert.match(texto, /legislação aplicável/);
  assert.ok(!/IPC-FIPE/i.test(texto));
  assert.match(texto, /automaticamente renovado/);
  assert.match(texto, /30 \(trinta\) dias/);
  assert.match(texto, /R\$ 50,00 \(cinquenta reais\)/);
  assert.ok(!texto.includes("R$ 100,00"));
  assert.doesNotMatch(texto, /17\/09\/2026/);
  assert.match(texto, /inadimplência superior a 10 \(dez\) dias/);
  assert.match(texto, /suspender os serviços/);
  assert.match(texto, /nem implica cancelamento automático/);
  assert.match(texto, /multa de 2%/);
  assert.match(texto, /juros de mora de 1%/);
  assert.ok(texto.includes("Rua Francisco Marengo, nº 500, Tatuapé, São Paulo/SP, CEP 03313-000"));
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

await run("nome do PDF identifica contrato, serviço e empresa", () => {
  assert.equal(
    nomeArquivoContratoNavarro("ALUMINIO FIRENZE", "mensalidade"),
    "Contrato - Gestão SST - ALUMINIO FIRENZE.pdf"
  );
  assert.equal(
    nomeArquivoContratoNavarro("ALUMINIO FIRENZE", "pontual_sst"),
    "Contrato - Gestão SST - ALUMINIO FIRENZE.pdf"
  );
  assert.equal(
    nomeArquivoContratoNavarro("ALUMINIO FIRENZE", "aet"),
    "Contrato - AET - ALUMINIO FIRENZE.pdf"
  );
  assert.equal(
    nomeArquivoContratoNavarro("NOME DA EMPRESA", "insalubridade"),
    "Contrato - Laudo de Insalubridade - NOME DA EMPRESA.pdf"
  );
  assert.equal(
    nomeArquivoContratoNavarro("NOME DA EMPRESA", "ltcat"),
    "Contrato - LTCAT - NOME DA EMPRESA.pdf"
  );
  assert.equal(
    nomeArquivoContratoNavarro("José & Cia. Ltda", "mensalidade"),
    "Contrato - Gestão SST - José & Cia. Ltda.pdf"
  );
  assert.equal(
    nomeArquivoContratoNavarro("  ALUMINIO FIRENZE.pdf  ", "aet"),
    "Contrato - AET - ALUMINIO FIRENZE.pdf"
  );
  assert.equal(
    nomeArquivoContratoNavarro("NOME DA EMPRESA.pdf.pdf", "ltcat"),
    "Contrato - LTCAT - NOME DA EMPRESA.pdf"
  );
  const arquivoAntigo = "Contrato_Navarro_ALUMINIO_FIRENZE_ORC-2026-0001.pdf";
  const nomeAtual = nomeArquivoContratoNavarro("ALUMINIO FIRENZE", "mensalidade");
  assert.notEqual(nomeAtual, arquivoAntigo);
  assert.equal(nomeAtual, "Contrato - Gestão SST - ALUMINIO FIRENZE.pdf");
  assert.equal(
    nomeArquivoContratoNavarro('ACME: "X"/Y*Z?<>|\\', "ltcat"),
    "Contrato - LTCAT - ACME X Y Z.pdf"
  );
  assert.equal(
    nomeArquivoContratoNavarro("   ", "pontual_sst"),
    "Contrato - Gestão SST - Empresa.pdf"
  );
  const nome = nomeArquivoContratoNavarro("NEPPER CONSTRUTORA", "pontual_sst");
  assert.equal(nome, "Contrato - Gestão SST - NEPPER CONSTRUTORA.pdf");
  assert.equal(nome.toLowerCase().endsWith(".pdf.pdf"), false);
  assert.doesNotMatch(nome, /Or[cç]amento|Proposta|ORC-|[0-9a-f]{8}-[0-9a-f]{4}-/i);

  const srcPdf = fs.readFileSync(
    path.join(process.cwd(), "lib", "contrato-pdf.ts"),
    "utf8"
  );
  assert.match(
    srcPdf,
    /nomeArquivoContratoNavarro\(\s*documento\.contratante\.razaoSocial,\s*documento\.tipoDocumento\s*\)/
  );
  const srcPanel = fs.readFileSync(
    path.join(
      process.cwd(),
      "components",
      "orcamentos",
      "OrcamentoContratoGerarPanel.tsx"
    ),
    "utf8"
  );
  assert.match(srcPanel, /nomeArquivoContratoNavarro\(orcamento\.cliente_nome/);
  assert.doesNotMatch(srcPanel, /a\.download\s*=\s*doc\.arquivo_nome/);
  assert.match(srcPanel, /download:\s*filename/);
});

await run("path de storage reutiliza onboarding", () => {
  const friendly = nomeArquivoContratoNavarro(
    "NEPPER CONSTRUTORA",
    "pontual_sst"
  );
  const p = buildOrcamentoOnboardingPath("ap1", "contrato", friendly);
  assert.match(p, /^ap1\/\d+\/.+\.pdf$/);
  assert.doesNotMatch(p, /\.pdf\.pdf$/i);
  assert.doesNotMatch(p, /Or[cç]amento|ORC-/i);
  const logo = buildOrcamentoOnboardingPath("ap1", "logo", "marca.png");
  assert.match(logo, /^ap1\/logo-\d+\.png$/);
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
  assert.ok(rawP.includes("INSTRUMENTO PARTICULAR"));
  assert.ok(rawP.includes("TRABALHO"));
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
    diaVencimentoMensalidade: 20,
    vigenciaInicio: "2026-12-14",
    vigenciaFim: "2027-12-14",
  });
  const docM = new jsPDF({ unit: "mm", format: "a4" });
  drawContratoPdfDocument(docM, mensal, null);
  assert.ok(docM.getNumberOfPages() >= 2, "mensalidade deve ter várias páginas");
  const bufM = docM.output("arraybuffer") as ArrayBuffer;
  const rawM = extractPdfLatin1(bufM);
  assert.ok(rawM.includes("INSTRUMENTO PARTICULAR"));
  assert.ok(rawM.includes("Página"));
  assert.ok(rawM.includes("20/01/2027"));
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

  await run("gestão mensal antecipada, mensal e exames avulsos", () => {
    assert.equal(vigenciaContratualConfiavel("2026-10-13", "2026-10-13"), null);
    assert.equal(vigenciaContratualConfiavel("2026-10-13", null), null);
    assert.deepEqual(
      vigenciaContratualConfiavel("2026-11-01", "2027-10-31"),
      { inicio: "2026-11-01", fim: "2027-10-31" }
    );

    const orcamentoAvista = makeOrcamento({
      modalidade: ORCAMENTO_MODALIDADE_MENSALIDADE,
      valor_total: 130,
      quantidade_parcelas: null,
      forma_pagamento: null,
      cliente_nome: "ATENA EXEMPLO LTDA",
      orcamento_itens: [
        {
          id: "i1",
          orcamento_id: "o1",
          servico_id: "s2",
          servico_nome: GESTAO_SST_MENSAL_NOME,
          quantidade: 1,
          valor_unitario: 130,
          valor_total: 130,
          ordem: 0,
        },
      ],
    });
    assert.equal(valorMensalidadeRenovacaoGestaoSst(0), 130);
    assert.equal(valorMensalidadeRenovacaoGestaoSst(1), 130);
    assert.equal(valorMensalidadeRenovacaoGestaoSst(2), 140);
    assert.equal(valorMensalidadeRenovacaoGestaoSst(10), 220);
    assert.equal(valorMensalidadeRenovacaoGestaoSst(15), 270);
    assert.deepEqual(
      montarDatasMensalidadesPlano({
        inicioVigenciaIso: "2026-10-14",
        dia: 10,
        quantidade: 12,
      }),
      [
        "2026-11-10",
        "2026-12-10",
        "2027-01-10",
        "2027-02-10",
        "2027-03-10",
        "2027-04-10",
        "2027-05-10",
        "2027-06-10",
        "2027-07-10",
        "2027-08-10",
        "2027-09-10",
        "2027-10-10",
      ]
    );
    assert.equal(
      montarDatasMensalidadesPlano({
        inicioVigenciaIso: "2026-10-14",
        dia: 20,
        quantidade: 1,
      })[0],
      "2026-11-20"
    );
    assert.equal(
      montarDatasMensalidadesPlano({
        inicioVigenciaIso: "2026-12-14",
        dia: 10,
        quantidade: 1,
      })[0],
      "2027-01-10"
    );
    assert.equal(
      montarDatasMensalidadesPlano({
        inicioVigenciaIso: "2026-12-14",
        dia: 20,
        quantidade: 12,
      })[11],
      "2027-12-20"
    );

    const semDatas = buildContratoNavarroDocumento({
      orcamento: orcamentoAvista,
      aprovacao: makeAprovacao({
        quantidade_colaboradores: 1,
        valor_final: 130,
        quantidade_parcelas: 1,
        valor_parcela: 1400,
        condicao_pagamento: "À vista",
        valor_avista: 1400,
        mensalidade_pagamento: "avista",
        mensalidade_valor_mensal: 130,
        mensalidade_meses: 12,
        mensalidade_valor_bruto: 1560,
        mensalidade_desconto_valor: 160,
        mensalidade_vencimento: "2026-10-14",
        desconto_percentual: 10.2564,
      }),
      dataContrato: "2026-10-13",
      diaVencimentoMensalidade: 10,
    });
    assert.doesNotMatch(semDatas.texto, /tem início em/);
    assert.doesNotMatch(semDatas.texto, /13\/10\/2026/);
    assert.match(semDatas.texto, /14\/10\/2026/);
    assert.match(semDatas.texto, /1 \(um\) colaborador/);
    assert.match(semDatas.texto, /130,00/);
    assert.match(semDatas.texto, /1\.560,00/);
    assert.match(semDatas.texto, /160,00/);
    assert.match(semDatas.texto, /1\.400,00/);
    assert.match(semDatas.texto, /50,00/);
    assert.match(semDatas.texto, /periódico ou demissional/);
    assert.match(semDatas.texto, /não lhe atribui, por si só/);
    assert.doesNotMatch(semDatas.texto, /inclusão de novo funcionário|taxa de inclusão|cadastro do colaborador/i);
    assert.match(semDatas.texto, /quinto dia útil/);
    assert.match(semDatas.texto, /boleto bancário/);
    assert.match(semDatas.texto, /Não há reajuste automático pelo IPCA/);
    assert.match(semDatas.texto, /Não há mensalidades no período pago antecipadamente/);
    assert.match(semDatas.texto, /não gera devolução/);
    assert.doesNotMatch(semDatas.texto, /critério de cálculo|reajuste anual pelo IPCA/);
    assert.match(semDatas.texto, /limita-se ao período efetivamente pago antecipadamente/);
    assert.doesNotMatch(semDatas.texto, /mediante 12 \(doze\) mensalidades/);
    const renovacao = semDatas.texto.match(/automaticamente renovado/g) ?? [];
    assert.equal(renovacao.length, 1);

    const comDatas = buildContratoNavarroDocumento({
      orcamento: orcamentoAvista,
      aprovacao: makeAprovacao({
        quantidade_colaboradores: 1,
        valor_final: 130,
        mensalidade_pagamento: "avista",
        mensalidade_valor_mensal: 130,
        mensalidade_meses: 12,
        mensalidade_valor_bruto: 1560,
        mensalidade_desconto_valor: 160,
        mensalidade_vencimento: "2026-10-14",
        valor_avista: 1400,
      }),
      dataContrato: "2026-10-13",
      vigenciaInicio: "2026-11-01",
      vigenciaFim: "2027-10-31",
      diaVencimentoMensalidade: 10,
    });
    assert.match(comDatas.texto, /início em 01\/11\/2026/);
    assert.match(comDatas.texto, /término em 31\/10\/2027/);
    assert.match(comDatas.texto, /dia 10 \(dez\)/);
    assert.doesNotMatch(comDatas.texto, /não está definido nesta contratação/);

    const cinco = buildContratoNavarroDocumento({
      orcamento: makeOrcamento({
        modalidade: ORCAMENTO_MODALIDADE_MENSALIDADE,
        valor_total: 180,
        quantidade_parcelas: null,
        orcamento_itens: [
          {
            id: "i1",
            orcamento_id: "o1",
            servico_id: "s2",
            servico_nome: GESTAO_SST_MENSAL_NOME,
            quantidade: 5,
            valor_unitario: 180,
            valor_total: 180,
            ordem: 0,
          },
        ],
      }),
      aprovacao: makeAprovacao({
        quantidade_colaboradores: 5,
        valor_final: 180,
        quantidade_parcelas: null,
        valor_parcela: null,
        condicao_pagamento: "12 mensalidades",
      }),
      dataContrato: "2026-09-17",
      diaVencimentoMensalidade: 10,
      vigenciaInicio: "2026-10-14",
      vigenciaFim: "2027-10-14",
    });
    assert.equal(cinco.parcelas.length, 12);
    assert.equal(cinco.parcelas[0]?.dataIso, "2026-11-10");
    assert.equal(cinco.parcelas[11]?.dataIso, "2027-10-10");
    assert.match(cinco.texto, /primeira mensalidade vence em 10\/11\/2026/);
    assert.match(cinco.texto, /5 \(cinco\) colaboradores/);
    assert.match(cinco.texto, /valor mensal de R\$ 180,00/);
    assert.doesNotMatch(cinco.texto, /pagamento antecipado aplica-se|em pagamento antecipado/i);
    assert.match(cinco.texto, /boleto bancário/);
    assert.doesNotMatch(cinco.texto, /1\.560,00|1\.400,00/);

    const oitenta = textoPlanoContrato(
      buildClausulasContrato({
        ...cinco,
        colaboradores: 2,
        valorExameClinicoAvulso: 80,
        valorExameClinicoDemissional: null,
      })
    );
    assert.match(oitenta, /2 \(dois\) colaboradores/);
    assert.match(oitenta, /R\$ 80,00/);
    assert.doesNotMatch(oitenta, /R\$ 50,00/);

    const congelado = buildContratoNavarroDocumento({
      orcamento: orcamentoAvista,
      aprovacao: makeAprovacao({
        quantidade_colaboradores: 1,
        valor_final: 130,
        mensalidade_pagamento: "avista",
        mensalidade_valor_mensal: 130,
        mensalidade_meses: 12,
        mensalidade_valor_bruto: 1560,
        mensalidade_desconto_valor: 160,
        mensalidade_vencimento: "2026-10-14",
        valor_avista: 1400,
        mensalidade_dia_vencimento: 20,
        mensalidade_exame_avulso_centavos: 8000,
        mensalidade_exame_demissional_centavos: 8000,
        mensalidade_renovacao_base_centavos: 15000,
        mensalidade_renovacao_incremento_centavos: 2000,
      }),
      dataContrato: "2026-10-13",
    });
    assert.match(congelado.texto, /R\$ 80,00/);
    assert.doesNotMatch(congelado.texto, /R\$ 50,00/);
    assert.match(congelado.texto, /R\$ 150,00/);
    assert.match(congelado.texto, /dia 20 \(vinte\)/);
    assert.equal(congelado.parcelas.length, 1);

    const proposta = paragrafosPropostaGestaoMensal().join("\n");
    assert.match(proposta, /1 exame clínico periódico/);
    assert.match(proposta, /R\$ 50,00/);
    assert.match(proposta, /quinto dia útil/);
    assert.match(proposta, /R\$ 130,00/);
    assert.match(proposta, /R\$ 10,00/);
    assert.match(proposta, /Não há reajuste automático pelo IPCA/);
    assert.match(proposta, /boleto bancário/);
    assert.match(proposta, /limita-se ao período contratado/);
    assert.match(proposta, /30 dias/);
    assert.match(proposta, /compromisso anual/);
    assert.match(proposta, /ainda não foi definido/);
    assert.doesNotMatch(proposta, /ASOs previstos no contrato|ASOs adicionais/);
    const propostaDia = paragrafosPropostaGestaoMensal({ dia: 20 }).join("\n");
    assert.match(propostaDia, /é 20/);
    assert.doesNotMatch(propostaDia, /ainda não foi definido/);

    const pdfAvista = new jsPDF({ unit: "mm", format: "a4" });
    drawContratoPdfDocument(pdfAvista, semDatas, null);
    const pdfMensal = new jsPDF({ unit: "mm", format: "a4" });
    drawContratoPdfDocument(pdfMensal, cinco, null);
    const pdfOutro = new jsPDF({ unit: "mm", format: "a4" });
    drawContratoPdfDocument(
      pdfOutro,
      {
        ...cinco,
        colaboradores: 2,
        clausulas: buildClausulasContrato({
          ...cinco,
          colaboradores: 2,
          valorExameClinicoAvulso: 80,
        }),
        texto: oitenta,
      },
      null
    );
    for (const [nome, doc] of [
      ["antecipado", pdfAvista],
      ["mensal", pdfMensal],
      ["exame-80", pdfOutro],
    ] as const) {
      const paginas = doc.getNumberOfPages();
      assert.ok(paginas >= 2 && paginas <= 8, `${nome}: ${paginas} páginas`);
      const raw = extractPdfLatin1(doc.output("arraybuffer") as ArrayBuffer);
      assert.ok(raw.includes("INSTRUMENTO PARTICULAR"));
      assert.ok(raw.includes("Página"));
      assert.ok(raw.includes("navarroeng.com.br"));
      assert.ok(!raw.includes("TODO"));
      assert.ok(!raw.includes("undefined"));
      assert.ok(!/NaN/.test(raw));
      assert.ok(!raw.includes("condicoes_revisao"));
    }
    const rawAvista = extractPdfLatin1(
      pdfAvista.output("arraybuffer") as ArrayBuffer
    );
    assert.ok(rawAvista.includes("DADOS PARA PAGAMENTO"));
    assert.ok(rawAvista.includes("1.400,00") || rawAvista.includes("1400"));
    assert.ok(rawAvista.includes("160"));
    assert.ok(rawAvista.includes("14/10/2026"));
    const rawOutro = extractPdfLatin1(
      pdfOutro.output("arraybuffer") as ArrayBuffer
    );
    assert.ok(rawOutro.includes("80,00") || rawOutro.includes("80.00"));
    assert.ok(!rawOutro.includes("DADOS PARA PAGAMENTO"));
  });

  await run("erro PostgREST plano não vira toast genérico", () => {
    const fallback = "Não foi possível gerar a prévia.";
    assert.equal(
      mensagemErroContratoDocumento(
        {
          message: "permission denied for table orcamento_contrato_documentos",
          code: "42501",
        },
        fallback
      ),
      "permission denied for table orcamento_contrato_documentos"
    );
    assert.equal(
      mensagemErroContratoDocumento(new Error("Data ISO inválida."), fallback),
      "Data ISO inválida."
    );
    assert.equal(mensagemErroContratoDocumento({ foo: 1 }, fallback), fallback);
  });

  console.log("\nTodos os testes de contrato Navarro passaram.");
}

void main();
