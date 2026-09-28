/** LTCAT: valor livre, textos da proposta e fluxo de laudo pontual. */

import assert from "node:assert/strict";
import {
  calcSubtotalItens,
  resolveItemValorServico,
  resolveQuantidadeColaboradoresOrcamento,
} from "../lib/orcamento-calculo";
import {
  buildAprovacaoFormFromOrcamento,
  buildAprovacaoInsertPayload,
  buildResumoComercialOrcamento,
} from "../lib/orcamento-aprovacao";
import { isAprovacaoIntegracaoCompleta } from "../lib/orcamento-aprovacao-integracao";
import { parseMoney } from "../lib/money";
import { labelItensInclusosServico } from "../lib/orcamento-modalidade";
import {
  buildOrcamentoEtapas,
  fluxoOperacaoIndependeDoPagamento,
} from "../lib/orcamento-etapas";
import type { OrcamentoComItens, OrcamentoItemFormItem } from "../lib/orcamento-types";
import {
  motivoBloqueioGeracaoContrato,
  podeGerarContratoNavarro,
} from "../lib/contrato-modelo";
import {
  bloqueioLaudoPontualExclusivo,
  copyLaudoPontual,
  isFluxoLaudoPontual,
  isLaudoPontualExclusivo,
  isServicoLaudoPontualNome,
  laudoPontualOcultaColaboradores,
  resolveLaudoPontualKind,
} from "../lib/servico-laudo-pontual";
import { resolveItensInclusosServico } from "../lib/servico-sst-pacote";
import { classifyOrcamentoFluxoImplantacao } from "../lib/servico-treinamentos";
import {
  isServicoLtcatNome,
  LTCAT_INCLUSOS_ITENS,
  orcamentoEhExclusivoLtcat,
  PROPOSTA_DESCRICAO_PARAGRAFOS_LTCAT,
  resolveValorTotalLtcat,
  SERVICO_LTCAT_CONTRATO_NAO_CONFIGURADO_MSG,
  SERVICO_LTCAT_NOME,
} from "../lib/servico-ltcat";
import { SERVICO_AET_NOME } from "../lib/servico-aet";
import { SERVICO_INSALUBRIDADE_NOME } from "../lib/servico-insalubridade";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";

assert.equal(isServicoLtcatNome(SERVICO_LTCAT_NOME), true);
assert.equal(isServicoLtcatNome("ltcat"), true);
assert.equal(
  isServicoLtcatNome("LTCAT - Laudo técnico das condições do ambiente de trabalho."),
  false
);
assert.equal(isServicoLaudoPontualNome(SERVICO_LTCAT_NOME), false);
assert.equal(isServicoLtcatNome(SERVICO_AET_NOME), false);
assert.equal(isServicoLtcatNome(SERVICO_INSALUBRIDADE_NOME), false);

assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_LTCAT.length, 2);
assert.match(PROPOSTA_DESCRICAO_PARAGRAFOS_LTCAT[0], /Condições Ambientais do Trabalho/);
assert.match(PROPOSTA_DESCRICAO_PARAGRAFOS_LTCAT[1], /aposentadoria especial/);
assert.equal(LTCAT_INCLUSOS_ITENS.length, 6);
assert.equal(labelItensInclusosServico(SERVICO_LTCAT_NOME), "O que está incluso?");
assert.deepEqual(resolveItensInclusosServico({ nome: SERVICO_LTCAT_NOME }), [
  ...LTCAT_INCLUSOS_ITENS,
]);

const formLtcat: OrcamentoItemFormItem = {
  id: "1",
  servico_id: "ltcat-1",
  servico_nome: SERVICO_LTCAT_NOME,
  quantidade: "20",
  valor_unitario: "2.000,00",
  valor_total: "2000",
  valor_manual: true,
};
const formPgr: OrcamentoItemFormItem = {
  id: "2",
  servico_id: "pgr-1",
  servico_nome: "PGR",
  quantidade: "20",
  valor_unitario: "800,00",
  valor_total: "800",
  valor_manual: true,
};
assert.equal(calcSubtotalItens([formLtcat]), 2000);
assert.equal(calcSubtotalItens([formLtcat, formPgr]), 2800);
assert.equal(
  resolveValorTotalLtcat({
    quantidade: 20,
    valor_unitario: 2000,
    valor_total: 2000,
  }),
  2000
);
assert.equal(
  resolveValorTotalLtcat({
    quantidade: 20,
    valor_unitario: 2000,
    valor_total: 40000,
  }),
  2000
);
assert.equal(
  resolveItemValorServico({
    servico_nome: SERVICO_LTCAT_NOME,
    quantidade: 20,
    valor_unitario: 2000,
    valor_total: 40000,
  }),
  2000
);

const ltcatItem = { servico_id: "ltcat-1", servico_nome: SERVICO_LTCAT_NOME };
const pgrItem = { servico_id: "pgr-1", servico_nome: "PGR" };
assert.equal(orcamentoEhExclusivoLtcat([ltcatItem]), true);
assert.equal(orcamentoEhExclusivoLtcat([ltcatItem, pgrItem]), false);
assert.equal(resolveLaudoPontualKind([ltcatItem]), "ltcat");
assert.equal(resolveLaudoPontualKind([ltcatItem, pgrItem]), null);
assert.equal(isLaudoPontualExclusivo([ltcatItem]), true);
assert.equal(laudoPontualOcultaColaboradores("ltcat"), false);
assert.equal(laudoPontualOcultaColaboradores("aet"), true);
assert.equal(bloqueioLaudoPontualExclusivo({
  itens: [{ id: "1", ...pgrItem }],
  itemIdAlterado: "2",
  novoNome: SERVICO_LTCAT_NOME,
  novoServicoId: "ltcat-1",
}), null);
assert.equal(classifyOrcamentoFluxoImplantacao([ltcatItem]), "ltcat");
assert.equal(classifyOrcamentoFluxoImplantacao([ltcatItem, pgrItem]), "padrao");
assert.equal(isFluxoLaudoPontual("ltcat"), true);
assert.equal(fluxoOperacaoIndependeDoPagamento("ltcat"), true);
assert.deepEqual(
  buildOrcamentoEtapas("ltcat").map((etapa) => etapa.id),
  buildOrcamentoEtapas("aet").map((etapa) => etapa.id)
);
const copy = copyLaudoPontual("ltcat");
assert.equal(copy.abaElaboracao, "LTCAT em elaboração");
assert.match(copy.textoVisitaEdicao, /condições de trabalho/);
assert.doesNotMatch(copy.textoVisitaEdicao, /postos de trabalho/);
assert.doesNotMatch(copy.textoElaboracao, /Insalubridade/);
assert.equal(copyLaudoPontual("aet").abaElaboracao, "AET em elaboração");
assert.match(
  copyLaudoPontual("insalubridade").textoVisitaEdicao,
  /agentes insalubres/
);

const orcamentoLtcat = {
  id: "o-ltcat",
  numero: "ORC-2026-0601",
  data_proposta: "2026-09-28",
  cliente_id: null,
  cliente_nome: "Empresa LTCAT",
  cliente_cnpj: "12.345.678/0001-90",
  cliente_endereco: null,
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
  forma_pagamento: null,
  quantidade_parcelas: 2,
  validade_proposta: null,
  subtotal: 2000,
  valor_total: 2000,
  status: "enviado",
  modalidade: "pontual",
  created_at: "2026-09-28T12:00:00Z",
  orcamento_itens: [
    {
      id: "i1",
      orcamento_id: "o-ltcat",
      servico_id: "ltcat-1",
      servico_nome: SERVICO_LTCAT_NOME,
      quantidade: 20,
      valor_unitario: 2000,
      valor_total: 2000,
      ordem: 0,
    },
  ],
} as OrcamentoComItens;

assert.equal(resolveQuantidadeColaboradoresOrcamento(orcamentoLtcat), 20);
assert.equal(buildResumoComercialOrcamento(orcamentoLtcat).quantidadeColaboradores, 20);
assert.equal(buildResumoComercialOrcamento(orcamentoLtcat).valorTotal, 2000);
const payload = buildAprovacaoInsertPayload(
  orcamentoLtcat,
  buildAprovacaoFormFromOrcamento(orcamentoLtcat),
  "Ágatha",
  parseMoney
);
assert.equal(payload.quantidade_colaboradores, 20);
assert.equal(payload.valor_final, 2000);
assert.equal(payload.itens[0]?.quantidade, 20);
assert.equal(payload.itens[0]?.valor_total, 2000);
assert.notEqual(payload.itens[0]?.valor_total, 40000);

assert.equal(
  isAprovacaoIntegracaoCompleta({
    result: {
      aprovacao_id: "ap1",
      cliente_id: "c1",
      contrato_id: null,
    },
    itens: [ltcatItem],
  }),
  true
);
const aprovacaoLtcat = {
  id: "ap1",
  orcamento_id: "o-ltcat",
  orcamento_aprovacao_itens: orcamentoLtcat.orcamento_itens,
} as unknown as OrcamentoAprovacaoRecord;
assert.equal(podeGerarContratoNavarro(orcamentoLtcat, aprovacaoLtcat), false);
assert.equal(
  motivoBloqueioGeracaoContrato(orcamentoLtcat, aprovacaoLtcat),
  SERVICO_LTCAT_CONTRATO_NAO_CONFIGURADO_MSG
);

console.log("test-servico-ltcat: OK");
