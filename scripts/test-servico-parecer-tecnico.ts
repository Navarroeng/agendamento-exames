/** Laudo de Parecer Técnico: catálogo, parcelas, desconto opcional e PDF. */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import { drawOrcamentoPdfDocument } from "../lib/orcamento-pdf";
import {
  calcCondicoesPagamentoProposta,
  calcQuantidadeParcelas,
  resolveQuantidadeParcelasEscolhida,
} from "../lib/orcamento-pagamento";
import { resolveItemValorServico } from "../lib/orcamento-calculo";
import {
  filterServicosSelecaoOrcamento,
  isServicoOferecidoNoOrcamento,
} from "../lib/orcamento-modalidade";
import type { OrcamentoComItens, ServicoSstRecord } from "../lib/orcamento-types";
import { classifyOrcamentoFluxoImplantacao } from "../lib/servico-treinamentos";
import {
  isServicoInsalubridadeNome,
  resolveInsalubridadeServicoId,
  SERVICO_INSALUBRIDADE_NOME,
} from "../lib/servico-insalubridade";
import { isServicoLaudoPontualNome } from "../lib/servico-laudo-pontual";
import {
  PACOTE_COMPLETO_SST_NOME,
  resolveItensInclusosServico,
} from "../lib/servico-sst-pacote";
import {
  formatCondicaoParcelasCentavos,
  isServicoParecerTecnicoNome,
  orcamentoEhExclusivoParecerTecnico,
  PARECER_AVISTA_FAIXA_MSG,
  PARECER_AVISTA_OBRIGATORIO_MSG,
  PARECER_PARCELAS_INVALIDAS_MSG,
  PARECER_TECNICO_INCLUSOS_ITENS,
  parecerMostraAlternativaAvista,
  parcelasCentavosParecerTecnico,
  parseQuantidadeParcelasInteira,
  PROPOSTA_DESCRICAO_PARAGRAFOS_PARECER_TECNICO,
  SERVICO_PARECER_TECNICO_NOME,
  validarQuantidadeParcelasParecer,
  validarValorAvistaParecer,
} from "../lib/servico-parecer-tecnico";

assert.equal(isServicoParecerTecnicoNome(SERVICO_PARECER_TECNICO_NOME), true);
assert.equal(isServicoParecerTecnicoNome("laudo de parecer tecnico"), true);
assert.equal(isServicoParecerTecnicoNome(SERVICO_INSALUBRIDADE_NOME), false);
assert.equal(
  isServicoParecerTecnicoNome("Laudo de parecer técnico sobre insalubridade"),
  false
);
assert.equal(isServicoInsalubridadeNome(SERVICO_PARECER_TECNICO_NOME), false);
assert.equal(isServicoLaudoPontualNome(SERVICO_PARECER_TECNICO_NOME), true);
assert.equal(isServicoOferecidoNoOrcamento(SERVICO_PARECER_TECNICO_NOME), true);
assert.equal(isServicoOferecidoNoOrcamento(SERVICO_INSALUBRIDADE_NOME), true);

const catalogo = [
  { id: "pacote", nome: PACOTE_COMPLETO_SST_NOME },
  { id: "insal", nome: SERVICO_INSALUBRIDADE_NOME },
  { id: "parecer", nome: SERVICO_PARECER_TECNICO_NOME },
  { id: "pgr", nome: "PGR" },
];
assert.deepEqual(
  filterServicosSelecaoOrcamento(catalogo).map((s) => s.nome),
  [PACOTE_COMPLETO_SST_NOME, SERVICO_INSALUBRIDADE_NOME, SERVICO_PARECER_TECNICO_NOME]
);
assert.equal(resolveInsalubridadeServicoId(catalogo), "insal");
assert.notEqual(resolveInsalubridadeServicoId(catalogo), "parecer");

const itemParecer = {
  servico_id: "parecer",
  servico_nome: SERVICO_PARECER_TECNICO_NOME,
};
assert.equal(
  classifyOrcamentoFluxoImplantacao([itemParecer], null, null, "insal", null),
  "parecer_tecnico"
);
assert.equal(
  classifyOrcamentoFluxoImplantacao(
    [{ servico_id: "parecer", servico_nome: "Serviço interno" }],
    null,
    null,
    "insal",
    null,
    "parecer"
  ),
  "parecer_tecnico"
);
assert.equal(
  classifyOrcamentoFluxoImplantacao(
    [itemParecer, { servico_id: "pgr", servico_nome: "PGR" }],
    null,
    null,
    "insal",
    null,
    "parecer"
  ),
  "padrao"
);
assert.equal(
  classifyOrcamentoFluxoImplantacao(
    [{ servico_id: "insal", servico_nome: SERVICO_INSALUBRIDADE_NOME }],
    null,
    null,
    "insal",
    null
  ),
  "insalubridade"
);

assert.deepEqual(resolveItensInclusosServico({ nome: SERVICO_PARECER_TECNICO_NOME, itens_inclusos: [
  "Visita técnica na empresa.",
  "Mapeamento dos riscos insalubres.",
] }), [...PARECER_TECNICO_INCLUSOS_ITENS]);
assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_PARECER_TECNICO.length, 3);
assert.equal(PARECER_TECNICO_INCLUSOS_ITENS.length, 3);

assert.equal(
  resolveItemValorServico({
    quantidade: 8,
    valor_unitario: 2400,
    valor_total: 2400,
    servico_nome: SERVICO_PARECER_TECNICO_NOME,
  }),
  2400
);

assert.equal(parseQuantidadeParcelasInteira("12"), 12);
assert.equal(parseQuantidadeParcelasInteira("1"), 1);
assert.equal(parseQuantidadeParcelasInteira("0"), null);
assert.equal(parseQuantidadeParcelasInteira("1.5"), null);
assert.equal(parseQuantidadeParcelasInteira(""), null);
assert.equal(validarQuantidadeParcelasParecer("3"), null);
assert.equal(validarQuantidadeParcelasParecer(""), PARECER_PARCELAS_INVALIDAS_MSG);
assert.equal(calcQuantidadeParcelas(800), 1);
assert.equal(resolveQuantidadeParcelasEscolhida(800, 12), 1);

const centavos = parcelasCentavosParecerTecnico(1000, 3);
assert.equal(centavos.reduce((sum, valor) => sum + valor, 0), 100000);
assert.equal(
  formatCondicaoParcelasCentavos(1000, 3),
  "1 parcela de R$ 333,34 e 2 parcelas de R$ 333,33"
);
assert.equal(formatCondicaoParcelasCentavos(1500, 1), "1 parcela de R$ 1.500,00");
assert.equal(formatCondicaoParcelasCentavos(3000, 2), "2 parcelas de R$ 1.500,00");

assert.equal(
  validarValorAvistaParecer({
    oferecer: false,
    valorAvistaTexto: "",
    valorTotal: 2000,
  }),
  null
);
assert.equal(
  validarValorAvistaParecer({
    oferecer: true,
    valorAvistaTexto: "",
    valorTotal: 2000,
  }),
  PARECER_AVISTA_OBRIGATORIO_MSG
);
assert.equal(
  validarValorAvistaParecer({
    oferecer: true,
    valorAvistaTexto: "2.000,00",
    valorTotal: 2000,
  }),
  PARECER_AVISTA_FAIXA_MSG
);
assert.equal(
  validarValorAvistaParecer({
    oferecer: true,
    valorAvistaTexto: "1.800,00",
    valorTotal: 2000,
  }),
  null
);

const condicoes = calcCondicoesPagamentoProposta(2000, 4, [
  { servico_nome: SERVICO_PARECER_TECNICO_NOME, valor: 2000 },
]);
assert.equal(condicoes.permitePagamentoAVista, false);
assert.equal(condicoes.valorAVista, 0);
assert.equal(orcamentoEhExclusivoParecerTecnico([itemParecer]), true);
assert.equal(
  parecerMostraAlternativaAvista({
    oferecer_desconto_avista: false,
    valor_avista: 1800,
    valor_total: 2000,
    orcamento_itens: [itemParecer],
  }),
  false
);
assert.equal(
  parecerMostraAlternativaAvista({
    oferecer_desconto_avista: true,
    valor_avista: 1800,
    valor_total: 2000,
    orcamento_itens: [itemParecer],
  }),
  true
);

function buildOrcamento(params: {
  parcelas: number;
  valor: number;
  oferecer?: boolean;
  avista?: number | null;
  observacoes?: string;
}): OrcamentoComItens {
  return {
    id: "o-parecer",
    numero: "ORC-2026-0701",
    data_proposta: "2026-10-14",
    cliente_id: "c1",
    cliente_nome: "Empresa Parecer Ltda",
    cliente_cnpj: "12.345.678/0001-90",
    cliente_endereco: "Rua Augusta, 100",
    cliente_setor: "Juridico",
    contato: "Ana",
    email: "ana@teste.com",
    telefone: "(11) 98888-0000",
    responsavel: "Agatha",
    origem_cliente: null,
    modalidade: "pontual",
    observacoes: params.observacoes ?? "Proposta válida conforme condições desta página.",
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: null,
    quantidade_parcelas: params.parcelas,
    oferecer_desconto_avista: params.oferecer === true,
    valor_avista: params.oferecer === true ? params.avista ?? null : null,
    validade_proposta: null,
    subtotal: params.valor,
    valor_total: params.valor,
    status: "em_elaboracao",
    assinatura_status: "nao_aplicavel",
    assinatura_token: null,
    aceite_em: null,
    aceite_ip: null,
    aceite_usuario_nome: null,
    link_aceite_expira_em: null,
    created_at: "2026-10-14T12:00:00Z",
    updated_at: "2026-10-14T12:00:00Z",
    orcamento_itens: [
      {
        id: "i1",
        orcamento_id: "o-parecer",
        servico_id: "parecer",
        servico_nome: SERVICO_PARECER_TECNICO_NOME,
        quantidade: 1,
        valor_unitario: params.valor,
        valor_total: params.valor,
        ordem: 0,
      },
    ],
  };
}

function catalogoPdf(): ServicoSstRecord[] {
  return [
    {
      id: "parecer",
      nome: SERVICO_PARECER_TECNICO_NOME,
      descricao: "Não usar a descrição do Laudo de Insalubridade.",
      valor_sugerido: null,
      ativo: true,
      ordem: 12,
      itens_inclusos: [
        "Visita técnica na empresa.",
        "Mapeamento dos riscos insalubres.",
        "Análises quantitativas utilizando método e equipamento adequado.",
        "Elaboração de Laudo de Insalubridade.",
      ],
    },
  ];
}

function render(orcamento: OrcamentoComItens) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawOrcamentoPdfDocument(doc, orcamento, { catalogo: catalogoPdf() });
  return doc;
}

function pdfVisibleText(doc: InstanceType<typeof jsPDF>): string {
  const raw = Buffer.from(doc.output("arraybuffer")).toString("latin1");
  const chunks: string[] = [];
  const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    chunks.push(match[1].replace(/\\([()\\])/g, "$1"));
  }
  return chunks.join(" ").replace(/\s+/g, " ");
}

const medida = new jsPDF({ unit: "mm", format: "a4" });
medida.setFont("helvetica", "normal");
medida.setFontSize(7.5);
const largura = 176;
const linhasDescricao = PROPOSTA_DESCRICAO_PARAGRAFOS_PARECER_TECNICO.reduce(
  (total, paragrafo) => total + medida.splitTextToSize(paragrafo, largura).length,
  0
);
assert.ok(
  linhasDescricao > PROPOSTA_DESCRICAO_PARAGRAFOS_PARECER_TECNICO.length,
  "os três parágrafos precisam quebrar linha e aumentar o card"
);
assert.ok(linhasDescricao <= 16, "a fonte não deve encolher a ponto de estourar linhas");

const semAvista = render(buildOrcamento({ parcelas: 1, valor: 1500 }));
const semAvistaTexto = pdfVisibleText(semAvista);
assert.equal(semAvista.getNumberOfPages(), 1);
assert.match(semAvistaTexto, /Laudo de Parecer T[eé]cnico/);
assert.match(semAvistaTexto, /reclamat[oó]ria trabalhista/);
assert.match(semAvistaTexto, /emiss[aã]o de parecer t[eé]cnico/);
assert.match(semAvistaTexto, /prazo fixado/);
assert.match(semAvistaTexto, /Elabora[cç][aã]o dos quesitos t[eé]cnicos/);
assert.match(semAvistaTexto, /Acompanhamento de per[ií]cia trabalhista/);
assert.match(semAvistaTexto, /Elabora[cç][aã]o de laudo de parecer t[eé]cnico/);
assert.match(semAvistaTexto, /1 parcela de/);
assert.match(semAvistaTexto, /1\.500,00/);
assert.match(semAvistaTexto, /Empresa Parecer Ltda/);
assert.match(semAvistaTexto, /O que est[áa] incluso/i);
assert.match(semAvistaTexto, /Valor total/i);
assert.match(semAvistaTexto, /Proposta v[aá]lida/);
assert.doesNotMatch(semAvistaTexto, /[àa] vista/i);
assert.doesNotMatch(semAvistaTexto, /desconto/i);
assert.doesNotMatch(semAvistaTexto, /5%/);
assert.doesNotMatch(semAvistaTexto, /Quantidade de Colaboradores/i);
assert.doesNotMatch(semAvistaTexto, /Visita t[eé]cnica na empresa/i);
assert.doesNotMatch(semAvistaTexto, /Mapeamento dos riscos/i);
assert.doesNotMatch(semAvistaTexto, /An[aá]lises quantitativas/i);
assert.doesNotMatch(semAvistaTexto, /Laudo de Insalubridade/);
assert.doesNotMatch(semAvistaTexto, /Parcela m[ií]nima/i);

const tresParcelas = render(buildOrcamento({ parcelas: 3, valor: 1000 }));
const tresTexto = pdfVisibleText(tresParcelas);
assert.match(tresTexto, /1 parcela de/);
assert.match(tresTexto, /333,34/);
assert.match(tresTexto, /2 parcelas de/);
assert.match(tresTexto, /333,33/);
assert.match(tresTexto, /1\.000,00/);
assert.doesNotMatch(tresTexto, /[àa] vista/i);
assert.doesNotMatch(tresTexto, /5%/);

const comAvista = render(
  buildOrcamento({ parcelas: 2, valor: 2000, oferecer: true, avista: 1700 })
);
const comAvistaTexto = pdfVisibleText(comAvista);
assert.match(comAvistaTexto, /2 parcelas de/);
assert.match(comAvistaTexto, /1\.000,00/);
assert.match(comAvistaTexto, /2\.000,00/);
assert.match(comAvistaTexto, /Pagamento [àa] vista/);
assert.match(comAvistaTexto, /1\.700,00/);
assert.doesNotMatch(comAvistaTexto, /5%/);
assert.doesNotMatch(comAvistaTexto, /arredond/i);
assert.doesNotMatch(comAvistaTexto, /Visita t[eé]cnica na empresa/i);

const desmarcou = render(
  buildOrcamento({ parcelas: 2, valor: 2000, oferecer: false, avista: 1700 })
);
const desmarcouTexto = pdfVisibleText(desmarcou);
assert.match(desmarcouTexto, /2 parcelas de/);
assert.doesNotMatch(desmarcouTexto, /1\.700,00/);
assert.doesNotMatch(desmarcouTexto, /[àa] vista/i);
assert.doesNotMatch(desmarcouTexto, /desconto/i);

const previewDir = path.join(process.cwd(), "tmp");
fs.mkdirSync(previewDir, { recursive: true });
fs.writeFileSync(
  path.join(previewDir, "preview-parecer-tecnico.pdf"),
  Buffer.from(comAvista.output("arraybuffer"))
);
fs.writeFileSync(
  path.join(previewDir, "preview-parecer-tecnico-sem-avista.pdf"),
  Buffer.from(semAvista.output("arraybuffer"))
);

console.log("test-servico-parecer-tecnico: OK");
