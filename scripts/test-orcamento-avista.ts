/**
 * Alternativa à vista manual dos laudos pontuais.
 * Executar: npx tsx scripts/test-orcamento-avista.ts
 */

import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import {
  calcValorFinalAvista,
  camposAvistaDoOrcamento,
  DESCONTO_AVISTA_PERCENTUAL_MSG,
  DESCONTO_AVISTA_REAIS_MSG,
  orcamentoMostraAlternativaAvista,
  orcamentoPermiteOpcaoAvistaManual,
  resolverApresentacaoAvistaPdf,
  resolverAvistaPersistido,
  validarDescontoAvista,
} from "../lib/orcamento-avista";
import { drawOrcamentoPdfDocument } from "../lib/orcamento-pdf";
import type { OrcamentoComItens, ServicoSstRecord } from "../lib/orcamento-types";
import { SERVICO_AET_NOME } from "../lib/servico-aet";
import { SERVICO_INSALUBRIDADE_NOME } from "../lib/servico-insalubridade";
import { SERVICO_LTCAT_NOME } from "../lib/servico-ltcat";
import { SERVICO_PARECER_TECNICO_NOME } from "../lib/servico-parecer-tecnico";
import { SERVICO_PERICULOSIDADE_NOME } from "../lib/servico-periculosidade";
import { SERVICO_PGR_NOME } from "../lib/servico-pgr";

const servicos = [
  SERVICO_PGR_NOME,
  SERVICO_LTCAT_NOME,
  SERVICO_AET_NOME,
  SERVICO_INSALUBRIDADE_NOME,
  SERVICO_PERICULOSIDADE_NOME,
  SERVICO_PARECER_TECNICO_NOME,
];

for (const nome of servicos) {
  assert.equal(
    orcamentoPermiteOpcaoAvistaManual([{ servico_nome: nome }]),
    true,
    nome
  );
}
assert.equal(
  orcamentoPermiteOpcaoAvistaManual([
    { servico_nome: SERVICO_PGR_NOME },
    { servico_nome: "Pacote completo - SST" },
  ]),
  false
);

assert.equal(
  calcValorFinalAvista({ valorTotal: 3200, tipo: "valor", desconto: 200 }),
  3000
);
assert.equal(
  calcValorFinalAvista({ valorTotal: 3200, tipo: "percentual", desconto: 10 }),
  2880
);
assert.equal(
  calcValorFinalAvista({ valorTotal: 3200, tipo: "valor", desconto: 0 }),
  3200
);
assert.equal(
  calcValorFinalAvista({ valorTotal: 3200, tipo: "percentual", desconto: 0 }),
  3200
);
assert.equal(
  validarDescontoAvista({
    oferecer: true,
    tipo: "percentual",
    descontoTexto: "100,5",
    valorTotal: 3200,
  }),
  DESCONTO_AVISTA_PERCENTUAL_MSG
);
assert.equal(
  validarDescontoAvista({
    oferecer: true,
    tipo: "valor",
    descontoTexto: "R$ 3.201,00",
    valorTotal: 3200,
  }),
  DESCONTO_AVISTA_REAIS_MSG
);
assert.equal(
  validarDescontoAvista({
    oferecer: true,
    tipo: "valor",
    descontoTexto: "R$ 0,00",
    valorTotal: 3200,
  }),
  null
);
assert.equal(
  validarDescontoAvista({
    oferecer: false,
    tipo: "valor",
    descontoTexto: "",
    valorTotal: 3200,
  }),
  null
);

const legado = camposAvistaDoOrcamento({
  oferecer_desconto_avista: true,
  valor_avista: 1700,
  valor_total: 2000,
  orcamento_itens: [{ servico_nome: SERVICO_PARECER_TECNICO_NOME }],
});
assert.equal(legado.oferecer, true);
assert.equal(legado.tipo, "valor");
assert.match(legado.informado, /300,00/);

const salvo = camposAvistaDoOrcamento({
  oferecer_desconto_avista: true,
  desconto_avista_tipo: "percentual",
  desconto_avista_valor: 10,
  valor_avista: 2880,
  valor_total: 3200,
  orcamento_itens: [{ servico_nome: SERVICO_PGR_NOME }],
});
assert.equal(salvo.tipo, "percentual");
assert.equal(salvo.informado, "10");

const persistido = resolverAvistaPersistido({
  itens: [{ servico_nome: SERVICO_LTCAT_NOME }],
  oferecer: true,
  tipo: "valor",
  desconto: 200,
  valorTotal: 2000,
});
assert.equal(persistido.valor_avista, 1800);
assert.equal(persistido.desconto_avista_valor, 200);
assert.equal(persistido.oferecer_desconto_avista, true);

function orcamento(
  nome: string,
  avista?: {
    tipo?: "valor" | "percentual" | null;
    desconto?: number | null;
    valor?: number | null;
  }
): OrcamentoComItens {
  const oferecer = avista != null;
  return {
    id: "o1",
    numero: "ORC-2026-0802",
    data_proposta: "2026-10-28",
    cliente_id: null,
    cliente_nome: "Metal Norte",
    cliente_cnpj: null,
    cliente_endereco: null,
    cliente_setor: null,
    contato: null,
    email: null,
    telefone: null,
    responsavel: "AGATHA",
    origem_cliente: null,
    modalidade: "pontual",
    observacoes: null,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: null,
    quantidade_parcelas: 2,
    oferecer_desconto_avista: oferecer,
    desconto_avista_tipo: oferecer ? avista?.tipo ?? null : null,
    desconto_avista_valor: oferecer ? avista?.desconto ?? null : null,
    valor_avista: oferecer ? avista?.valor ?? null : null,
    validade_proposta: null,
    subtotal: 3200,
    valor_total: 3200,
    status: "em_elaboracao",
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
        orcamento_id: "o1",
        servico_id: "s1",
        servico_nome: nome,
        quantidade: 1,
        valor_unitario: 3200,
        valor_total: 3200,
        ordem: 0,
      },
    ],
  };
}

function textoPdf(doc: OrcamentoComItens): string {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const catalogo: ServicoSstRecord[] = [
    {
      id: "s1",
      nome: doc.orcamento_itens[0].servico_nome,
      descricao: null,
      valor_sugerido: null,
      ativo: true,
      ordem: 1,
      itens_inclusos: [],
    },
  ];
  drawOrcamentoPdfDocument(pdf, doc, { catalogo });
  return Buffer.from(pdf.output("arraybuffer"))
    .toString("latin1")
    .replace(/\\([()\\])/g, "$1");
}

for (const nome of servicos) {
  const cru = textoPdf(orcamento(nome));
  assert.doesNotMatch(cru, /[àaÀA] vista/i, `${nome} sem opção à vista`);
  assert.doesNotMatch(cru, /5%/, nome);
  assert.match(cru, /3\.200,00/);
}

const reais = textoPdf(
  orcamento(SERVICO_PGR_NOME, { tipo: "valor", desconto: 200, valor: 3000 })
);
assert.match(reais, /Pagamento à vista/);
assert.match(reais, /3\.000,00/);
assert.match(reais, /Desconto/);
assert.match(reais, /200,00/);
assert.match(reais, /1\.600,00/);
assert.match(reais, /3\.200,00/);
assert.doesNotMatch(reais, /5%/);

const percentual = textoPdf(
  orcamento(SERVICO_LTCAT_NOME, {
    tipo: "percentual",
    desconto: 10,
    valor: 2880,
  })
);
assert.match(percentual, /2\.880,00/);
assert.match(percentual, /10%/);
assert.match(percentual, /1\.600,00/);
assert.doesNotMatch(percentual, /5%/);

const zero = textoPdf(
  orcamento(SERVICO_AET_NOME, { tipo: "valor", desconto: 0, valor: 3200 })
);
assert.match(zero, /Pagamento à vista/);
assert.match(zero, /Desconto/);
assert.match(zero, /0,00/);
assert.equal(
  orcamentoMostraAlternativaAvista(
    orcamento(SERVICO_AET_NOME, { tipo: "valor", desconto: 0, valor: 3200 })
  ),
  true
);

const antigo = orcamento(SERVICO_PARECER_TECNICO_NOME, {
  tipo: null,
  desconto: null,
  valor: 1700,
});
assert.equal(orcamentoMostraAlternativaAvista(antigo), true);
assert.equal(resolverApresentacaoAvistaPdf(antigo, true).modo, "manual");
const antigoPdf = textoPdf(antigo);
assert.match(antigoPdf, /1\.700,00/);
assert.match(antigoPdf, /Pagamento à vista/);
assert.doesNotMatch(antigoPdf, /Desconto/);

console.log("ok: orcamento-avista");
