/** Testes do helper canônico e exclusividade do Laudo AET. */

import assert from "node:assert/strict";
import {
  AET_INCLUSOS_ITENS,
  bloqueioAetExclusivo,
  isServicoAetNome,
  orcamentoEhExclusivoAet,
  orcamentoPermitePagamentoAVista,
  orcamentoPossuiAet,
  PROPOSTA_DESCRICAO_PARAGRAFOS_AET,
  resolveTipoDocumentoContrato,
  SERVICO_AET_EXCLUSIVIDADE_MSG,
  SERVICO_AET_NOME,
} from "../lib/servico-aet";
import {
  filterServicosPorModalidade,
  labelItensInclusosServico,
} from "../lib/orcamento-modalidade";
import {
  PACOTE_COMPLETO_SST_NOME,
  resolveItensInclusosServico,
} from "../lib/servico-sst-pacote";
import { classifyOrcamentoFluxoImplantacao } from "../lib/servico-treinamentos";

assert.equal(isServicoAetNome(SERVICO_AET_NOME), true);
assert.equal(
  isServicoAetNome("laudo aet - analise ergonomica do trabalho"),
  true
);
assert.equal(
  isServicoAetNome("Treinamento sobre elaboração de AET"),
  false
);
assert.equal(isServicoAetNome("Serviço relacionado à ergonomia"), false);
assert.equal(isServicoAetNome(PACOTE_COMPLETO_SST_NOME), false);
assert.equal(isServicoAetNome("LTCAT"), false);
assert.equal(SERVICO_AET_NOME.includes("AET"), true);

const aetItem = {
  servico_id: "aet-1",
  servico_nome: SERVICO_AET_NOME,
};
assert.equal(orcamentoPossuiAet([aetItem]), true);
assert.equal(orcamentoEhExclusivoAet([aetItem]), true);
assert.equal(orcamentoPermitePagamentoAVista([aetItem]), false);
assert.equal(
  orcamentoPermitePagamentoAVista([
    { servico_id: "pgr", servico_nome: "PGR" },
  ]),
  true
);
assert.equal(
  orcamentoEhExclusivoAet([
    aetItem,
    { servico_id: "pgr", servico_nome: "PGR" },
  ]),
  false
);

assert.equal(
  bloqueioAetExclusivo({
    itens: [],
    itemIdAlterado: "i1",
    novoNome: SERVICO_AET_NOME,
    novoServicoId: "aet-1",
  }),
  null
);

assert.equal(
  bloqueioAetExclusivo({
    itens: [{ id: "i1", servico_id: "pgr", servico_nome: "PGR" }],
    itemIdAlterado: null,
    novoNome: SERVICO_AET_NOME,
  }),
  SERVICO_AET_EXCLUSIVIDADE_MSG
);

assert.equal(
  bloqueioAetExclusivo({
    itens: [
      { id: "i1", servico_id: "aet-1", servico_nome: SERVICO_AET_NOME },
      { id: "i2", servico_id: "", servico_nome: "" },
    ],
    itemIdAlterado: "i2",
    novoNome: "Treinamentos",
    novoServicoId: "treino",
  }),
  SERVICO_AET_EXCLUSIVIDADE_MSG
);

assert.equal(
  classifyOrcamentoFluxoImplantacao([aetItem]),
  "aet"
);
assert.equal(
  classifyOrcamentoFluxoImplantacao([
    { servico_id: "t1", servico_nome: "Treinamentos" },
  ]),
  "somente_treinamentos"
);
assert.equal(
  classifyOrcamentoFluxoImplantacao([
    { servico_id: "pgr", servico_nome: "PGR" },
  ]),
  "padrao"
);

assert.equal(
  resolveTipoDocumentoContrato({ itens: [aetItem] }),
  "aet"
);
assert.equal(
  resolveTipoDocumentoContrato({
    isMensalidade: true,
    itens: [{ servico_nome: "Gestão Completa SST" }],
  }),
  "mensalidade"
);
assert.equal(
  resolveTipoDocumentoContrato({
    itens: [{ servico_nome: PACOTE_COMPLETO_SST_NOME }],
  }),
  "pontual_sst"
);

assert.equal(
  PROPOSTA_DESCRICAO_PARAGRAFOS_AET[0],
  "A presente proposta contempla a elaboração da Análise Ergonômica do Trabalho (AET), com avaliação das condições de trabalho, organização das atividades, exigências das tarefas e fatores ergonômicos relacionados às funções avaliadas, conforme os critérios aplicáveis da NR-17."
);
assert.equal(
  PROPOSTA_DESCRICAO_PARAGRAFOS_AET[1],
  "O trabalho contempla levantamento das informações, análise técnica das atividades e condições observadas durante a avaliação, identificação dos fatores de risco ergonômico e elaboração do relatório técnico com conclusões e recomendações de medidas de prevenção e adequação, quando aplicáveis."
);
assert.equal(
  PROPOSTA_DESCRICAO_PARAGRAFOS_AET[2],
  "Laudo elaborado conforme os critérios aplicáveis da NR-17 – Ergonomia."
);
assert.equal(AET_INCLUSOS_ITENS.length, 8);
assert.equal(
  AET_INCLUSOS_ITENS[0],
  "Visita técnica para avaliação das atividades e postos de trabalho."
);
assert.equal(
  AET_INCLUSOS_ITENS[7],
  "Entrega do documento final em formato digital."
);

assert.deepEqual(resolveItensInclusosServico({ nome: SERVICO_AET_NOME }), [
  ...AET_INCLUSOS_ITENS,
]);
assert.equal(labelItensInclusosServico(SERVICO_AET_NOME), "O que está incluso?");
assert.deepEqual(
  filterServicosPorModalidade(
    [
      { id: "1", nome: PACOTE_COMPLETO_SST_NOME },
      { id: "2", nome: SERVICO_AET_NOME },
    ],
    "pontual"
  ).map((s) => s.nome),
  [PACOTE_COMPLETO_SST_NOME, SERVICO_AET_NOME]
);
assert.deepEqual(
  filterServicosPorModalidade(
    [
      { id: "1", nome: PACOTE_COMPLETO_SST_NOME },
      { id: "2", nome: SERVICO_AET_NOME },
    ],
    "mensalidade"
  ).map((s) => s.nome),
  [PACOTE_COMPLETO_SST_NOME]
);

console.log("test-servico-aet: ok");
