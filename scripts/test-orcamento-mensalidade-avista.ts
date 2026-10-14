/** Mensalidade aprovada: à vista, desconto e contrato. */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { jsPDF } from "jspdf";
import {
  aprovacaoSegueOrcamentoOriginal,
  buildAprovacaoFormFromRecord,
  buildCondicoesComerciaisFromForm,
  formatCondicaoAprovada,
  type OrcamentoAprovacaoRecord,
} from "../lib/orcamento-aprovacao";
import { pdfContratoEstaDesatualizado } from "../lib/contrato-documento-revisao";
import { buildContratoNavarroDocumento } from "../lib/contrato-modelo";
import {
  CAMPOS_PAGAMENTO_CONTRATO_AUSENTES,
  CONTRATO_VIGENCIA_MENSALIDADE_MESES,
  linhasDadosPagamentoContrato,
} from "../lib/contrato-navarro";
import { drawContratoPdfDocument } from "../lib/contrato-pdf";
import { NAVARRO_DADOS_BANCARIOS } from "../lib/navarro-pagamento";
import { parseMoney } from "../lib/money";
import {
  GESTAO_SST_MENSAL_NOME,
  ORCAMENTO_MODALIDADE_MENSALIDADE,
} from "../lib/orcamento-modalidade";
import type { OrcamentoComItens } from "../lib/orcamento-types";
import {
  MENSALIDADE_DESCONTO_ACIMA_BASE_MSG,
  MENSALIDADE_DESCONTO_NEGATIVO_MSG,
  MENSALIDADE_FINAL_ACIMA_BRUTO_MSG,
  MENSALIDADE_FINAL_INVALIDO_MSG,
  calcularAvistaPorDesconto,
  calcularAvistaPorValorFinal,
  camposResumoMensalidadeAvista,
  mesesEntreDatas,
  montarBaseMensalidadeAvista,
  resolverMesesVigenciaMensalidade,
  validarCalculoMensalidadeAvista,
} from "../lib/orcamento-mensalidade-pagamento";

const MENSAL = 750;

function base(meses: number, itens?: { servico_nome: string; valor_total: number }[]) {
  return montarBaseMensalidadeAvista({
    valorMensal: MENSAL,
    meses,
    itens: itens ?? [
      { servico_nome: GESTAO_SST_MENSAL_NOME, valor_total: MENSAL },
    ],
  });
}

const doze = base(12);
const porValor = calcularAvistaPorDesconto(doze, "valor", 450);
assert.equal(porValor.valorBrutoCentavos, 900_000);
assert.equal(porValor.descontoCentavos, 45_000);
assert.equal(porValor.valorFinalCentavos, 855_000);
assert.equal(porValor.valorPontualCentavos, 0);
assert.equal(validarCalculoMensalidadeAvista(porValor), null);

const porPercentual = calcularAvistaPorDesconto(doze, "percentual", 5);
assert.equal(porPercentual.descontoCentavos, 45_000);
assert.equal(porPercentual.valorFinalCentavos, 855_000);

const peloFinal = calcularAvistaPorValorFinal(doze, 8550);
assert.equal(peloFinal.descontoCentavos, 45_000);
assert.equal(peloFinal.valorFinalCentavos, porValor.valorFinalCentavos);
assert.equal(peloFinal.descontoPercentual, 5);

const deVolta = calcularAvistaPorDesconto(doze, "valor", peloFinal.descontoValor);
assert.equal(deVolta.valorFinalCentavos, peloFinal.valorFinalCentavos);

assert.equal(
  validarCalculoMensalidadeAvista(calcularAvistaPorDesconto(doze, "valor", -1)),
  MENSALIDADE_DESCONTO_NEGATIVO_MSG
);
assert.equal(
  validarCalculoMensalidadeAvista(calcularAvistaPorDesconto(doze, "valor", 9000.01)),
  MENSALIDADE_DESCONTO_ACIMA_BASE_MSG
);
assert.equal(
  validarCalculoMensalidadeAvista(calcularAvistaPorValorFinal(doze, 0)),
  MENSALIDADE_FINAL_INVALIDO_MSG
);
assert.equal(
  validarCalculoMensalidadeAvista(
    calcularAvistaPorValorFinal(doze, 9000.01),
    "final"
  ),
  MENSALIDADE_FINAL_ACIMA_BRUTO_MSG
);

const comPontual = base(12, [
  { servico_nome: GESTAO_SST_MENSAL_NOME, valor_total: MENSAL },
  { servico_nome: "Treinamentos", valor_total: 200 },
]);
const avistaPontual = calcularAvistaPorDesconto(comPontual, "percentual", 5);
assert.equal(avistaPontual.baseGestaoCentavos, 900_000);
assert.equal(avistaPontual.valorPontualCentavos, 20_000);
assert.equal(avistaPontual.valorBrutoCentavos, 920_000);
assert.equal(avistaPontual.descontoCentavos, 45_000);
assert.equal(avistaPontual.valorFinalCentavos, 875_000);

const seis = calcularAvistaPorDesconto(base(6), "valor", 0);
assert.equal(seis.valorBrutoCentavos, 450_000);
assert.equal(seis.valorFinalCentavos, 450_000);

assert.equal(mesesEntreDatas("2026-01-15", "2027-01-15"), 12);
assert.equal(mesesEntreDatas("2026-01-15", "2026-07-15"), 6);
assert.equal(
  resolverMesesVigenciaMensalidade({}),
  CONTRATO_VIGENCIA_MENSALIDADE_MESES
);
assert.equal(
  resolverMesesVigenciaMensalidade({
    dataInicio: "2026-03-01",
    dataFim: "2026-09-01",
    mesesSalvos: 12,
  }),
  6
);

function orcamento(): OrcamentoComItens {
  return {
    id: "o-m",
    numero: "ORC-2026-0750",
    data_proposta: "2026-10-01",
    cliente_id: "c1",
    cliente_nome: "EMPRESA EXEMPLO LTDA",
    cliente_cnpj: "12345678000199",
    cliente_endereco: "Rua das Flores, 100",
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
    forma_pagamento: null,
    quantidade_parcelas: null,
    validade_proposta: null,
    subtotal: MENSAL,
    valor_total: MENSAL,
    status: "aprovado",
    modalidade: ORCAMENTO_MODALIDADE_MENSALIDADE,
    assinatura_status: "nao_aplicavel",
    assinatura_token: null,
    aceite_em: null,
    aceite_ip: null,
    aceite_usuario_nome: null,
    link_aceite_expira_em: null,
    created_at: "",
    updated_at: "",
    orcamento_itens: [
      {
        id: "i1",
        orcamento_id: "o-m",
        servico_id: "s1",
        servico_nome: GESTAO_SST_MENSAL_NOME,
        quantidade: 10,
        valor_unitario: MENSAL,
        valor_total: MENSAL,
        ordem: 0,
      },
    ],
  };
}

function aprovacao(
  over: Partial<OrcamentoAprovacaoRecord> = {}
): OrcamentoAprovacaoRecord {
  return {
    id: "ap-m",
    orcamento_id: "o-m",
    quantidade_colaboradores: 10,
    valor_final: MENSAL,
    condicao_pagamento: "12 mensalidades",
    quantidade_parcelas: null,
    valor_parcela: null,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "Ágatha",
    aprovado_em: "2026-10-01T12:00:00.000Z",
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

const antiga = aprovacao();
assert.equal(formatCondicaoAprovada(antiga), "12 mensalidades");
const formAntiga = buildAprovacaoFormFromRecord(orcamento(), antiga);
assert.equal(formAntiga.mensalidade_pagamento, "mensal");

const salva = aprovacao({
  mensalidade_pagamento: "avista",
  mensalidade_valor_mensal: MENSAL,
  mensalidade_meses: 12,
  mensalidade_valor_bruto: 9000,
  mensalidade_valor_pontual: 0,
  mensalidade_desconto_valor: 450,
  mensalidade_desconto_tipo: "valor",
  mensalidade_vencimento: "2026-11-15",
  desconto_percentual: 5,
  valor_avista: 8550,
  condicao_pagamento: "À vista",
  quantidade_parcelas: 1,
  valor_parcela: 8550,
});
const reaberta = buildAprovacaoFormFromRecord(orcamento(), salva);
assert.equal(reaberta.mensalidade_pagamento, "avista");
assert.equal(parseMoney(reaberta.valor_final), MENSAL);
assert.equal(parseMoney(reaberta.mensalidade_desconto), 450);
assert.equal(parseMoney(reaberta.mensalidade_valor_avista), 8550);
assert.equal(reaberta.mensalidade_vencimento, "2026-11-15");

const payload = buildCondicoesComerciaisFromForm(
  { ...reaberta, mensalidade_fonte: "desconto" },
  parseMoney,
  ORCAMENTO_MODALIDADE_MENSALIDADE,
  orcamento().orcamento_itens
);
assert.equal(payload.mensalidade_pagamento, "avista");
assert.equal(payload.valor_final, MENSAL);
assert.equal(payload.valor_avista, 8550);
assert.equal(payload.mensalidade_valor_bruto, 9000);
assert.equal(payload.mensalidade_desconto_valor, 450);
assert.equal(payload.condicao_pagamento, "À vista");

const doc = buildContratoNavarroDocumento({
  orcamento: orcamento(),
  aprovacao: salva,
  dataContrato: "2026-10-13",
  diaVencimentoMensalidade: 10,
});
assert.equal(doc.modalidade, "mensalidade");
assert.equal(doc.valor, MENSAL);
assert.equal(doc.parcelas.length, 1);
assert.equal(doc.parcelas[0]?.valor, 8550);
assert.equal(doc.parcelas[0]?.dataIso, "2026-11-15");
assert.equal(doc.condicaoPagamento, "À vista");
const texto = doc.texto;
assert.match(texto, /pagamento antecipado/i);
assert.match(texto, /valor bruto do período/i);
assert.match(texto, /desconto de R\$ 450,00/);
assert.match(texto, /após o desconto concedido/i);
assert.match(texto, /a ser pago à vista até 15\/11\/2026/);
assert.match(texto, /por Pix ou transferência bancária/i);
assert.match(texto, /DADOS PARA PAGAMENTO/);
assert.match(texto, /99729-6/);
assert.match(texto, /8\.550,00/);
assert.match(texto, /prazo de 12 \(doze\) meses/);
assert.match(texto, /Não há mensalidades no período pago antecipadamente/);
assert.doesNotMatch(texto, /mediante 12 \(doze\) mensalidades/);
assert.doesNotMatch(texto, /vencem mensalmente/);
assert.doesNotMatch(texto, /não possui valor global anual/);
assert.doesNotMatch(texto, /mensalidades correspondentes/);
assert.match(texto, /quitação depende da confirmação do pagamento/);

const mensalDoc = buildContratoNavarroDocumento({
  orcamento: orcamento(),
  aprovacao: antiga,
  dataContrato: "2026-10-13",
  diaVencimentoMensalidade: 10,
  vigenciaInicio: "2026-10-14",
  vigenciaFim: "2027-10-14",
});
assert.equal(mensalDoc.parcelas.length, CONTRATO_VIGENCIA_MENSALIDADE_MESES);
assert.equal(mensalDoc.parcelas[0]?.dataIso, "2026-11-10");
assert.match(mensalDoc.texto, /12 \(doze\) mensalidades/);
assert.doesNotMatch(mensalDoc.texto, /DADOS PARA PAGAMENTO/);
assert.doesNotMatch(mensalDoc.texto, /99729-6/);

const referencia = 130;
const orcamentoReferencia: OrcamentoComItens = {
  ...orcamento(),
  subtotal: referencia,
  valor_total: referencia,
  orcamento_itens: orcamento().orcamento_itens.map((item) => ({
    ...item,
    valor_unitario: referencia,
    valor_total: referencia,
  })),
};
const mensalIgual = aprovacao({ valor_final: referencia });
const negociada = aprovacao({
  valor_final: referencia,
  mensalidade_pagamento: "avista",
  mensalidade_valor_mensal: referencia,
  mensalidade_meses: 12,
  mensalidade_valor_bruto: 1560,
  mensalidade_valor_pontual: 0,
  mensalidade_desconto_valor: 160,
  mensalidade_desconto_tipo: "valor",
  mensalidade_vencimento: "2026-10-14",
  desconto_percentual: 10.2564,
  valor_avista: 1400,
  condicao_pagamento: "À vista",
  quantidade_parcelas: 1,
  valor_parcela: 1400,
});
assert.equal(
  aprovacaoSegueOrcamentoOriginal(orcamentoReferencia, mensalIgual),
  true
);
assert.equal(
  aprovacaoSegueOrcamentoOriginal(orcamentoReferencia, negociada),
  false
);

const campos = camposResumoMensalidadeAvista(negociada);
assert.ok(campos);
const porLabel = Object.fromEntries(campos.map((campo) => [campo.label, campo]));
assert.equal(porLabel["Valor final à vista"]?.value, "R$ 1.400,00");
assert.equal(porLabel["Valor final à vista"]?.destaque, true);
assert.equal(porLabel["Total bruto do período"]?.value, "R$ 1.560,00");
assert.equal(porLabel["Desconto"]?.value, "R$ 160,00 (10,26%)");
assert.equal(porLabel["Vencimento"]?.value, "14/10/2026");
assert.equal(porLabel["Vigência"]?.value, "12 meses");
assert.equal(porLabel["Valor mensal de referência"]?.value, "R$ 130,00 / mês");
assert.equal(porLabel["Valor mensal de referência"]?.secundario, true);
assert.equal(campos.at(-1)?.label, "Valor mensal de referência");
assert.equal(camposResumoMensalidadeAvista(mensalIgual), null);

const historico = formatCondicaoAprovada(negociada);
assert.match(historico, /1\.400,00/);
assert.match(historico, /160,00/);
assert.match(historico, /14\/10\/2026/);
assert.match(historico, /Valor mensal de referência/);

const docNegociado = buildContratoNavarroDocumento({
  orcamento: orcamentoReferencia,
  aprovacao: negociada,
  dataContrato: "2026-10-13",
  diaVencimentoMensalidade: 20,
});
assert.equal(docNegociado.modalidade, "mensalidade");
assert.equal(docNegociado.valor, referencia);
assert.equal(docNegociado.parcelas.length, 1);
assert.equal(docNegociado.parcelas[0]?.valor, 1400);
assert.equal(docNegociado.parcelas[0]?.dataIso, "2026-10-14");
assert.match(docNegociado.texto, /pagamento antecipado/i);
assert.match(docNegociado.texto, /pago à vista/i);
assert.match(docNegociado.texto, /1\.560,00/);
assert.match(docNegociado.texto, /160,00/);
assert.match(docNegociado.texto, /1\.400,00/);
assert.match(docNegociado.texto, /14\/10\/2026/);
assert.match(docNegociado.texto, /DADOS PARA PAGAMENTO/);
assert.match(docNegociado.texto, /Chave Pix/);
assert.match(docNegociado.texto, /Não há mensalidades no período pago antecipadamente/);
assert.doesNotMatch(docNegociado.texto, /mediante 12 \(doze\) mensalidades/);
assert.doesNotMatch(docNegociado.texto, /Tipo de conta/);
assert.deepEqual([...CAMPOS_PAGAMENTO_CONTRATO_AUSENTES], ["Tipo de conta"]);
const linhas = linhasDadosPagamentoContrato();
assert.equal(linhas.find((linha) => linha.rotulo === "Banco")?.valor, NAVARRO_DADOS_BANCARIOS.banco);
assert.equal(linhas.find((linha) => linha.rotulo === "Agência")?.valor, NAVARRO_DADOS_BANCARIOS.agencia);
assert.equal(linhas.find((linha) => linha.rotulo === "Conta")?.valor, NAVARRO_DADOS_BANCARIOS.conta);
assert.equal(linhas.find((linha) => linha.rotulo === "Titular")?.valor, NAVARRO_DADOS_BANCARIOS.favorecido);
assert.equal(linhas.find((linha) => linha.rotulo === "CNPJ")?.valor, NAVARRO_DADOS_BANCARIOS.pixCnpj);
assert.equal(linhas.find((linha) => linha.rotulo === "Chave Pix")?.valor, NAVARRO_DADOS_BANCARIOS.pixCnpj);
assert.equal(linhas.some((linha) => linha.rotulo === "Tipo de conta"), false);

const pdfDoc = new jsPDF({ unit: "mm", format: "a4" });
drawContratoPdfDocument(pdfDoc, docNegociado, null);
const paginas = pdfDoc.getNumberOfPages();
assert.ok(paginas >= 2 && paginas <= 8, `paginação inesperada: ${paginas}`);
const buf = pdfDoc.output("arraybuffer") as ArrayBuffer;
const raw = Buffer.from(buf).toString("latin1");
assert.ok(raw.includes("DADOS PARA PAGAMENTO"));
assert.ok(raw.includes("99729-6"));
assert.ok(raw.includes("0760"));
assert.ok(raw.includes("45.206.250"));
assert.ok(raw.includes("1.400,00") || raw.includes("1400"));
assert.ok(raw.includes("160,00") || raw.includes("160"));
assert.ok(raw.includes("14/10/2026"));
assert.ok(!raw.includes("Tipo de conta"));
assert.equal(
  pdfContratoEstaDesatualizado(
    { condicoes_revisao: 2, desatualizado_em: "2026-10-14T12:00:00.000Z" },
    { condicoes_revisao: 2 }
  ),
  false
);
assert.equal(
  pdfContratoEstaDesatualizado(
    { condicoes_revisao: 2, desatualizado_em: null },
    { condicoes_revisao: 3 }
  ),
  true
);
const pdfPath = path.join(os.tmpdir(), "contrato-avista-dados-bancarios.pdf");
fs.writeFileSync(pdfPath, Buffer.from(buf));
console.log(`PDF à vista: ${pdfPath} (${paginas} págs)`);

console.log("OK  mensalidade à vista");
