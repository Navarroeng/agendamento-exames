/** Contrato documental do Laudo AET — independente de cliente_contratos SST. */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import { AET_INCLUSOS_ITENS, SERVICO_AET_NOME } from "../lib/servico-aet";
import { SERVICO_INSALUBRIDADE_CONTRATO_NAO_CONFIGURADO_MSG, SERVICO_INSALUBRIDADE_NOME } from "../lib/servico-insalubridade";
import { valorPorExtenso } from "../lib/extenso";
import { PACOTE_COMPLETO_SST_NOME } from "../lib/servico-sst-pacote";
import {
  GESTAO_SST_MENSAL_NOME,
  ORCAMENTO_MODALIDADE_MENSALIDADE,
  ORCAMENTO_MODALIDADE_PONTUAL,
} from "../lib/orcamento-modalidade";
import { SERVICO_SST_NOME_TREINAMENTOS } from "../lib/servico-treinamentos";
import {
  buildContratoNavarroDocumento,
  motivoBloqueioGeracaoContrato,
  podeGerarContratoNavarro,
} from "../lib/contrato-modelo";
import { drawContratoPdfDocument, nomeArquivoContratoNavarro } from "../lib/contrato-pdf";
import { NAVARRO_CONTRATO_AET } from "../lib/contrato-aet";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoComItens } from "../lib/orcamento-types";

function makeOrcamento(
  over: Partial<OrcamentoComItens> &
    Pick<OrcamentoComItens, "modalidade" | "valor_total" | "orcamento_itens">
): OrcamentoComItens {
  return {
    id: "o-aet",
    numero: "ORC-2026-0063",
    data_proposta: "2026-09-10",
    cliente_id: "cli-firenze",
    cliente_nome: "ALUMINIO FIRENZE",
    cliente_cnpj: "12345678000195",
    cliente_endereco: "Rua Industrial, 100, São Paulo/SP",
    cliente_setor: null,
    contato: null,
    email: null,
    telefone: null,
    responsavel: "AGATHA",
    origem_cliente: "indicacao",
    observacoes: null,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: "2 parcelas",
    quantidade_parcelas: 2,
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
    id: "ap-aet",
    orcamento_id: "o-aet",
    quantidade_colaboradores: 0,
    valor_final: 3200,
    condicao_pagamento: "2 parcelas de R$ 1.600,00",
    quantidade_parcelas: 2,
    valor_parcela: 1600,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "AGATHA",
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
    orcamento_aprovacao_itens: [
      {
        id: "ai1",
        aprovacao_id: "ap-aet",
        servico_id: "aet-1",
        servico_nome: SERVICO_AET_NOME,
        quantidade: 1,
        valor_unitario: 3200,
        valor_total: 3200,
        ordem: 0,
      },
    ],
    ...over,
  };
}

function itemAet() {
  return {
    id: "i-aet",
    orcamento_id: "o-aet",
    servico_id: "aet-1",
    servico_nome: SERVICO_AET_NOME,
    quantidade: 1,
    valor_unitario: 3200,
    valor_total: 3200,
    ordem: 0,
  };
}

function extractPdfLatin1(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("latin1");
}

const orcAet = makeOrcamento({
  modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
  valor_total: 3200,
  orcamento_itens: [itemAet()],
});
const apAet = makeAprovacao();

assert.equal(podeGerarContratoNavarro(orcAet, apAet), true);
assert.equal(motivoBloqueioGeracaoContrato(orcAet, apAet), null);

const orcInsal = makeOrcamento({
  id: "o-insal",
  numero: "ORC-2026-0501",
  modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
  valor_total: 4500,
  orcamento_itens: [
    {
      id: "i-insal",
      orcamento_id: "o-insal",
      servico_id: "insal-1",
      servico_nome: SERVICO_INSALUBRIDADE_NOME,
      quantidade: 1,
      valor_unitario: 4500,
      valor_total: 4500,
      ordem: 0,
    },
  ],
});
const apInsal = makeAprovacao({
  id: "ap-insal",
  orcamento_id: "o-insal",
  valor_final: 4500,
  orcamento_aprovacao_itens: [
    {
      id: "ai-insal",
      aprovacao_id: "ap-insal",
      servico_id: "insal-1",
      servico_nome: SERVICO_INSALUBRIDADE_NOME,
      quantidade: 1,
      valor_unitario: 4500,
      valor_total: 4500,
      ordem: 0,
    },
  ],
});
assert.equal(podeGerarContratoNavarro(orcInsal, apInsal), false);
assert.equal(
  motivoBloqueioGeracaoContrato(orcInsal, apInsal),
  SERVICO_INSALUBRIDADE_CONTRATO_NAO_CONFIGURADO_MSG
);
assert.equal(valorPorExtenso(3200), "três mil e duzentos reais");
assert.equal(
  valorPorExtenso(3200.5),
  "três mil e duzentos reais e cinquenta centavos"
);

const doc = buildContratoNavarroDocumento({
  orcamento: orcAet,
  aprovacao: apAet,
  dataContrato: "2026-09-18",
});

assert.equal(doc.tipoDocumento, "aet");
assert.equal(doc.colaboradores, 0);
assert.equal(doc.valor, 3200);
assert.equal(doc.parcelas.length, 2);
assert.equal(doc.parcelas[0]?.dataIso, "2026-09-18");
assert.equal(doc.parcelas[1]?.dataIso, "2026-10-18");
assert.equal(doc.numeroOrcamento, "ORC-2026-0063");
assert.equal(apAet.contrato_enviado, false);
assert.equal(apAet.contrato_assinado, false);

const texto = doc.texto;
assert.match(texto, /ANÁLISE ERGONÔMICA DO TRABALHO – AET|QUALIFICAÇÃO/);
assert.match(texto, /ALUMINIO FIRENZE/);
assert.match(texto, /12\.345\.678\/0001-95/);
assert.match(texto, /Rua Industrial, 100/);
assert.match(texto, /Proposta Comercial nº ORC-2026-0063/);
assert.match(texto, /R\$ 3\.200,00 \(três mil e duzentos reais\)/);
assert.match(texto, /2 \(duas\) parcelas de R\$ 1\.600,00 \(mil e seiscentos reais\)/);
assert.match(texto, /PARCELA \| VALOR \| VENCIMENTO/);
assert.match(texto, /1 \| R\$ 1\.600,00 \| 18\/09\/2026/);
assert.match(texto, /2 \| R\$ 1\.600,00 \| 18\/10\/2026/);
assert.doesNotMatch(
  texto,
  /O primeiro vencimento ocorrerá na data da formalização/
);
assert.match(texto, /Pedro Henrique Navarro/);
assert.match(texto, /385\.381\.338-02/);
assert.match(texto, /CEP 03138-010/);
assert.match(texto, /Lei nº 13\.709\/2018/);
assert.match(texto, /LGPD/);
assert.match(texto, /multa de 2%/);
assert.match(texto, /juros de 1%/);
assert.match(texto, /Comarca de São Paulo\/SP/);
assert.match(texto, /CLÁUSULA 1ª – DO OBJETO/);
assert.match(texto, /CLÁUSULA 13ª – DO FORO/);
for (const item of AET_INCLUSOS_ITENS) {
  assert.ok(texto.includes(item), `faltou item oficial: ${item}`);
}
assert.equal(AET_INCLUSOS_ITENS.length, 8);

const ausentes = [
  "PGR",
  "PCMSO",
  "LTCAT",
  "eSocial",
  "Riscos Psicossociais",
  "quantidade de colaboradores",
  "à vista",
  "valor à vista",
  "renovação automática",
  "automaticamente renovado",
  "mensalidade",
  "IPCA",
  "admissional",
];
for (const termo of ausentes) {
  assert.ok(
    !texto.toLowerCase().includes(termo.toLowerCase()),
    `AET não pode conter "${termo}"`
  );
}
assert.ok(!/\bASO\b/i.test(texto), "AET não pode citar ASO");
assert.ok(!/5%/.test(texto));

const aet1 = buildContratoNavarroDocumento({
  orcamento: makeOrcamento({
    id: "o-aet-1",
    numero: "ORC-2026-0101",
    modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
    valor_total: 3200,
    quantidade_parcelas: 1,
    orcamento_itens: [itemAet()],
  }),
  aprovacao: makeAprovacao({
    id: "ap-aet-1",
    orcamento_id: "o-aet-1",
    quantidade_parcelas: 1,
    valor_parcela: 3200,
    condicao_pagamento: "1 parcela",
  }),
  dataContrato: "2026-09-18",
  vencimentosIso: ["2026-09-25"],
});
assert.equal(aet1.parcelas.length, 1);
assert.equal(aet1.parcelas[0]?.dataIso, "2026-09-25");
assert.match(aet1.texto, /1 \(uma\) parcela/);
assert.match(aet1.texto, /1 \| R\$ 3\.200,00 \| 25\/09\/2026/);

const aet3 = buildContratoNavarroDocumento({
  orcamento: makeOrcamento({
    id: "o-aet-3",
    numero: "ORC-2026-0103",
    modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
    valor_total: 3200,
    quantidade_parcelas: 3,
    orcamento_itens: [itemAet()],
  }),
  aprovacao: makeAprovacao({
    id: "ap-aet-3",
    orcamento_id: "o-aet-3",
    quantidade_parcelas: 3,
    valor_parcela: 3200 / 3,
    condicao_pagamento: "3 parcelas",
  }),
  dataContrato: "2026-01-31",
  vencimentosIso: ["2026-01-31", "2026-02-28", "2026-03-31"],
});
assert.equal(aet3.parcelas.map((p) => p.dataIso).join(","), "2026-01-31,2026-02-28,2026-03-31");
assert.match(aet3.texto, /3 \(três\) parcelas/);
assert.match(aet3.texto, /31\/01\/2026/);
assert.match(aet3.texto, /28\/02\/2026/);
assert.match(aet3.texto, /31\/03\/2026/);

const aetManual = buildContratoNavarroDocumento({
  orcamento: orcAet,
  aprovacao: apAet,
  dataContrato: "2026-09-18",
  vencimentosIso: ["2026-09-20", "2026-10-20"],
});
assert.equal(aetManual.parcelas[0]?.dataIso, "2026-09-20");
assert.equal(aetManual.parcelas[1]?.dataIso, "2026-10-20");
assert.match(aetManual.texto, /20\/09\/2026/);
assert.match(aetManual.texto, /20\/10\/2026/);
assert.ok(!aetManual.texto.includes("18/09/2026"));
assert.ok(doc.texto.includes("18/09/2026"));
assert.ok(!doc.texto.includes("20/09/2026"));

const sst = buildContratoNavarroDocumento({
  orcamento: makeOrcamento({
    id: "o-sst",
    numero: "ORC-2026-0028",
    modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
    valor_total: 18000,
    quantidade_parcelas: 1,
    orcamento_itens: [
      {
        id: "i-sst",
        orcamento_id: "o-sst",
        servico_id: "sst-1",
        servico_nome: PACOTE_COMPLETO_SST_NOME,
        quantidade: 57,
        valor_unitario: 18000,
        valor_total: 18000,
        ordem: 0,
      },
    ],
  }),
  aprovacao: makeAprovacao({
    id: "ap-sst",
    orcamento_id: "o-sst",
    quantidade_colaboradores: 57,
    valor_final: 18000,
    quantidade_parcelas: 1,
    valor_parcela: 18000,
    orcamento_aprovacao_itens: [
      {
        id: "ai-sst",
        aprovacao_id: "ap-sst",
        servico_id: "sst-1",
        servico_nome: PACOTE_COMPLETO_SST_NOME,
        quantidade: 57,
        valor_unitario: 18000,
        valor_total: 18000,
        ordem: 0,
      },
    ],
  }),
  dataContrato: "2026-01-10",
});
assert.equal(sst.tipoDocumento, "pontual_sst");
assert.match(sst.texto, /Programa de Gerenciamento de Riscos \(PGR\)/);
assert.doesNotMatch(sst.texto, /PARCELA \| VALOR \| VENCIMENTO/);
assert.doesNotMatch(sst.texto, /2 \(duas\) parcelas/);
assert.equal(sst.colaboradores, 57);
assert.ok(!doc.texto.includes("PGR"));
assert.notEqual(doc.numeroOrcamento, sst.numeroOrcamento);

const soAet = buildContratoNavarroDocumento({
  orcamento: makeOrcamento({
    id: "o-aet-only",
    numero: "ORC-2026-0099",
    cliente_id: "cli-novo",
    cliente_nome: "EMPRESA SO AET",
    modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
    valor_total: 3200,
    orcamento_itens: [itemAet()],
  }),
  aprovacao: makeAprovacao({
    id: "ap-only",
    orcamento_id: "o-aet-only",
  }),
  dataContrato: "2026-09-18",
});
assert.equal(soAet.tipoDocumento, "aet");
assert.match(soAet.texto, /EMPRESA SO AET/);

const aet2 = buildContratoNavarroDocumento({
  orcamento: makeOrcamento({
    id: "o-aet-2",
    numero: "ORC-2027-0001",
    modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
    valor_total: 4100,
    quantidade_parcelas: 1,
    orcamento_itens: [
      { ...itemAet(), id: "i2", orcamento_id: "o-aet-2", valor_total: 4100 },
    ],
  }),
  aprovacao: makeAprovacao({
    id: "ap-aet-2",
    orcamento_id: "o-aet-2",
    valor_final: 4100,
    quantidade_parcelas: 1,
    valor_parcela: 4100,
    orcamento_aprovacao_itens: [
      {
        id: "ai2",
        aprovacao_id: "ap-aet-2",
        servico_id: "aet-1",
        servico_nome: SERVICO_AET_NOME,
        quantidade: 1,
        valor_unitario: 4100,
        valor_total: 4100,
        ordem: 0,
      },
    ],
  }),
  dataContrato: "2027-02-01",
});
assert.equal(aet2.numeroOrcamento, "ORC-2027-0001");
assert.match(aet2.texto, /ORC-2027-0001/);
assert.ok(!aet2.texto.includes("ORC-2026-0063"));
assert.ok(!doc.texto.includes("ORC-2027-0001"));

const mensal = buildContratoNavarroDocumento({
  orcamento: makeOrcamento({
    id: "o-men",
    numero: "ORC-2026-0300",
    modalidade: ORCAMENTO_MODALIDADE_MENSALIDADE,
    valor_total: 350,
    orcamento_itens: [
      {
        id: "i-men",
        orcamento_id: "o-men",
        servico_id: "s-men",
        servico_nome: GESTAO_SST_MENSAL_NOME,
        quantidade: 10,
        valor_unitario: 350,
        valor_total: 350,
        ordem: 0,
      },
    ],
  }),
  aprovacao: makeAprovacao({
    id: "ap-men",
    orcamento_id: "o-men",
    quantidade_colaboradores: 10,
    valor_final: 350,
    quantidade_parcelas: null,
    valor_parcela: null,
    condicao_pagamento: "12 mensalidades",
    orcamento_aprovacao_itens: [
      {
        id: "ai-men",
        aprovacao_id: "ap-men",
        servico_id: "s-men",
        servico_nome: GESTAO_SST_MENSAL_NOME,
        quantidade: 10,
        valor_unitario: 350,
        valor_total: 350,
        ordem: 0,
      },
    ],
  }),
  dataContrato: "2026-09-17",
});
assert.equal(mensal.tipoDocumento, "mensalidade");
assert.match(mensal.texto, /automaticamente renovado/);
assert.doesNotMatch(mensal.texto, /PARCELA \| VALOR \| VENCIMENTO/);

const treino = buildContratoNavarroDocumento({
  orcamento: makeOrcamento({
    id: "o-tr",
    numero: "ORC-2026-0400",
    modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
    valor_total: 900,
    quantidade_parcelas: 1,
    orcamento_itens: [
      {
        id: "i-tr",
        orcamento_id: "o-tr",
        servico_id: "s-tr",
        servico_nome: SERVICO_SST_NOME_TREINAMENTOS,
        quantidade: 1,
        valor_unitario: 900,
        valor_total: 900,
        ordem: 0,
      },
    ],
  }),
  aprovacao: makeAprovacao({
    id: "ap-tr",
    orcamento_id: "o-tr",
    quantidade_colaboradores: 1,
    valor_final: 900,
    quantidade_parcelas: 1,
    valor_parcela: 900,
    orcamento_aprovacao_itens: [
      {
        id: "ai-tr",
        aprovacao_id: "ap-tr",
        servico_id: "s-tr",
        servico_nome: SERVICO_SST_NOME_TREINAMENTOS,
        quantidade: 1,
        valor_unitario: 900,
        valor_total: 900,
        ordem: 0,
      },
    ],
  }),
  dataContrato: "2026-09-17",
});
assert.equal(treino.tipoDocumento, "pontual_sst");
assert.match(treino.texto, /INSTRUMENTO PARTICULAR|DAS PARTES|DO OBJETO/);

assert.equal(
  nomeArquivoContratoNavarro("ORC-2026-0063", "ALUMINIO FIRENZE", "aet"),
  "Contrato_Navarro_AET_ALUMINIO_FIRENZE_ORC-2026-0063.pdf"
);

const pdfDoc = new jsPDF({ unit: "mm", format: "a4" });
drawContratoPdfDocument(pdfDoc, doc, null);
assert.ok(pdfDoc.getNumberOfPages() >= 2, "AET deve paginar");
const buf = pdfDoc.output("arraybuffer") as ArrayBuffer;
const raw = extractPdfLatin1(buf);
assert.ok(raw.includes("ANALISE ERGONOMICA") || raw.includes("AET"));
assert.ok(!/PGR/.test(raw));
assert.ok(!/PCMSO/.test(raw));
assert.ok(!/LTCAT/.test(raw));
assert.ok(!/eSocial/.test(raw));

const srcAet = fs.readFileSync(
  path.join(process.cwd(), "lib", "contrato-aet.ts"),
  "utf8"
);
assert.doesNotMatch(srcAet, /\.from\(["']cliente_contratos["']\)/);

const srcModelo = fs.readFileSync(
  path.join(process.cwd(), "lib", "contrato-modelo.ts"),
  "utf8"
);
assert.doesNotMatch(srcModelo, /\.from\(["']cliente_contratos["']\)/);
const srcPanel = fs.readFileSync(
  path.join(process.cwd(), "components", "orcamentos", "OrcamentoContratoGerarPanel.tsx"),
  "utf8"
);
assert.doesNotMatch(srcPanel, /\.from\(["']cliente_contratos["']\)/);
const srcPersist = fs.readFileSync(
  path.join(process.cwd(), "services", "orcamento-contrato-documento.service.ts"),
  "utf8"
);
assert.match(srcPersist, /orcamento_contrato_documentos/);
assert.doesNotMatch(srcPersist, /\.from\(["']cliente_contratos["']\)/);
const srcVenc = fs.readFileSync(
  path.join(process.cwd(), "services", "orcamento-contrato-vencimento.service.ts"),
  "utf8"
);
assert.match(srcVenc, /orcamento_contrato_vencimentos/);
assert.doesNotMatch(srcVenc, /\.from\(["']cliente_contratos["']\)/);
const srcMig = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "126_orcamento_contrato_vencimentos.sql"
  ),
  "utf8"
);
assert.match(srcMig, /orcamento_contrato_vencimentos/);
assert.match(srcMig, /NÃO altera cliente_contratos SST/);

const previewDir = path.join(process.cwd(), "tmp");
fs.mkdirSync(previewDir, { recursive: true });
const pdfPath = path.join(previewDir, "preview-contrato-aet.pdf");
fs.writeFileSync(pdfPath, Buffer.from(buf));
console.log(`PDF AET: ${pdfPath} (${pdfDoc.getNumberOfPages()} págs)`);
console.log("test-contrato-aet: OK");
