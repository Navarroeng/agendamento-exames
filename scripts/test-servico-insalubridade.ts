/** Catálogo, exclusividade, quantidade, pagamento e fluxo do Laudo de Insalubridade. */

import assert from "node:assert/strict";
import {
  bloqueioInsalubridadeExclusivo,
  INSALUBRIDADE_INCLUSOS_ITENS,
  INSALUBRIDADE_INCLUSOS_OBSERVACOES,
  isServicoInsalubridade,
  isServicoInsalubridadeNome,
  orcamentoEhExclusivoInsalubridade,
  orcamentoPossuiInsalubridade,
  PROPOSTA_DESCRICAO_PARAGRAFOS_INSALUBRIDADE,
  resolveInsalubridadeServicoId,
  SERVICO_INSALUBRIDADE_CONTRATO_NAO_CONFIGURADO_MSG,
  SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG,
  SERVICO_INSALUBRIDADE_NOME,
} from "../lib/servico-insalubridade";
import {
  bloqueioLaudoPontualExclusivo,
  isFluxoLaudoPontual,
  isLaudoPontualExclusivo,
  isServicoLaudoPontualNome,
  mensagemExclusividadeLaudoPontual,
  resolveLaudoPontualKind,
} from "../lib/servico-laudo-pontual";
import {
  orcamentoPermitePagamentoAVista,
  resolveTipoDocumentoContrato,
  SERVICO_AET_EXCLUSIVIDADE_MSG,
  SERVICO_AET_NOME,
} from "../lib/servico-aet";
import {
  filterServicosPorModalidade,
  labelItensInclusosServico,
} from "../lib/orcamento-modalidade";
import { PACOTE_COMPLETO_SST_NOME } from "../lib/servico-sst-pacote";
import { classifyOrcamentoFluxoImplantacao } from "../lib/servico-treinamentos";
import { resolveQuantidadeColaboradoresOrcamento } from "../lib/orcamento-calculo";
import { isAprovacaoIntegracaoCompleta } from "../lib/orcamento-aprovacao-integracao";
import {
  motivoBloqueioGeracaoContrato,
  podeGerarContratoNavarro,
} from "../lib/contrato-modelo";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoComItens } from "../lib/orcamento-types";
import {
  buildOrcamentoEtapas,
  isOrcamentoEtapaLiberada,
} from "../lib/orcamento-etapas";
import {
  listServicosPontuaisContratados,
  resolveServicoPontualKind,
} from "../lib/servicos-pontuais";
import type { ImplantacaoAetRecord } from "../lib/implantacao-aet";

assert.equal(isServicoInsalubridadeNome(SERVICO_INSALUBRIDADE_NOME), true);
assert.equal(isServicoInsalubridadeNome("laudo de insalubridade"), true);
assert.equal(isServicoInsalubridadeNome("Laudo de Insalubridade NR-15"), false);
assert.equal(isServicoInsalubridadeNome("Avaliação de insalubridade"), false);
assert.equal(isServicoInsalubridadeNome(SERVICO_AET_NOME), false);
assert.equal(isServicoInsalubridadeNome(PACOTE_COMPLETO_SST_NOME), false);
assert.equal(isServicoInsalubridadeNome("LTCAT"), false);
assert.equal(isServicoLaudoPontualNome(SERVICO_INSALUBRIDADE_NOME), true);
assert.equal(isServicoLaudoPontualNome(SERVICO_AET_NOME), true);

const catalogoId = resolveInsalubridadeServicoId([
  { id: "insal-uuid", nome: SERVICO_INSALUBRIDADE_NOME },
  { id: "aet-uuid", nome: SERVICO_AET_NOME },
]);
assert.equal(catalogoId, "insal-uuid");

const itemId = { servico_id: "insal-uuid", servico_nome: "Outro nome" };
assert.equal(isServicoInsalubridade(itemId, "insal-uuid"), true);
assert.equal(
  isServicoInsalubridade(
    { servico_id: "outro", servico_nome: SERVICO_INSALUBRIDADE_NOME },
    "insal-uuid"
  ),
  false
);
assert.equal(
  isServicoInsalubridade({
    servico_id: "",
    servico_nome: SERVICO_INSALUBRIDADE_NOME,
  }),
  true
);

const insalItem = {
  servico_id: "insal-uuid",
  servico_nome: SERVICO_INSALUBRIDADE_NOME,
};
const aetItem = { servico_id: "aet-uuid", servico_nome: SERVICO_AET_NOME };
const pacoteItem = {
  servico_id: "sst-uuid",
  servico_nome: PACOTE_COMPLETO_SST_NOME,
};

assert.equal(orcamentoEhExclusivoInsalubridade([insalItem]), true);
assert.equal(orcamentoPossuiInsalubridade([insalItem, pacoteItem]), true);
assert.equal(orcamentoEhExclusivoInsalubridade([insalItem, pacoteItem]), false);
assert.equal(isLaudoPontualExclusivo([insalItem]), true);
assert.equal(resolveLaudoPontualKind([insalItem]), "insalubridade");
assert.equal(resolveLaudoPontualKind([aetItem]), "aet");
assert.equal(resolveLaudoPontualKind([insalItem, aetItem]), null);
assert.equal(isLaudoPontualExclusivo([insalItem, aetItem]), false);
assert.equal(isFluxoLaudoPontual("insalubridade"), true);
assert.equal(isFluxoLaudoPontual("aet"), true);
assert.equal(isFluxoLaudoPontual("padrao"), false);

assert.equal(
  mensagemExclusividadeLaudoPontual([insalItem, pacoteItem]),
  SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG
);
assert.equal(
  mensagemExclusividadeLaudoPontual([aetItem, pacoteItem]),
  SERVICO_AET_EXCLUSIVIDADE_MSG
);
assert.equal(
  mensagemExclusividadeLaudoPontual([insalItem, aetItem]),
  SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG
);
assert.equal(mensagemExclusividadeLaudoPontual([insalItem]), null);

assert.equal(
  bloqueioInsalubridadeExclusivo({
    itens: [insalItem],
    itemIdAlterado: null,
    novoNome: PACOTE_COMPLETO_SST_NOME,
  }),
  SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG
);
assert.equal(
  bloqueioLaudoPontualExclusivo({
    itens: [aetItem],
    itemIdAlterado: "x",
    novoNome: SERVICO_INSALUBRIDADE_NOME,
    novoServicoId: "insal-uuid",
  }),
  SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG
);
assert.equal(
  bloqueioLaudoPontualExclusivo({
    itens: [insalItem],
    itemIdAlterado: "x",
    novoNome: SERVICO_AET_NOME,
    novoServicoId: "aet-uuid",
  }),
  SERVICO_AET_EXCLUSIVIDADE_MSG
);

assert.equal(
  classifyOrcamentoFluxoImplantacao([insalItem]),
  "insalubridade"
);
assert.equal(classifyOrcamentoFluxoImplantacao([aetItem]), "aet");
assert.equal(
  classifyOrcamentoFluxoImplantacao([insalItem], null, null, "insal-uuid"),
  "insalubridade"
);

assert.equal(orcamentoPermitePagamentoAVista([insalItem]), false);
assert.equal(orcamentoPermitePagamentoAVista([aetItem]), false);
assert.equal(orcamentoPermitePagamentoAVista([pacoteItem]), true);

assert.equal(
  resolveTipoDocumentoContrato({ itens: [insalItem] }),
  "insalubridade"
);
assert.equal(resolveTipoDocumentoContrato({ itens: [aetItem] }), "aet");

assert.equal(
  resolveQuantidadeColaboradoresOrcamento({
    orcamento_itens: [
      {
        id: "i1",
        orcamento_id: "o1",
        servico_id: "insal-uuid",
        servico_nome: SERVICO_INSALUBRIDADE_NOME,
        quantidade: 1,
        valor_unitario: 4500,
        valor_total: 4500,
        ordem: 0,
      },
    ],
  }),
  0
);

assert.equal(
  isAprovacaoIntegracaoCompleta({
    result: {
      aprovacao_id: "ap-insal",
      cliente_id: "cli-1",
      contrato_id: null,
    },
    itens: [insalItem],
  }),
  true
);
assert.equal(
  isAprovacaoIntegracaoCompleta({
    result: {
      aprovacao_id: "ap-sst",
      cliente_id: "cli-1",
      contrato_id: null,
    },
    itens: [pacoteItem],
  }),
  false
);

assert.equal(PROPOSTA_DESCRICAO_PARAGRAFOS_INSALUBRIDADE.length, 1);
assert.equal(
  PROPOSTA_DESCRICAO_PARAGRAFOS_INSALUBRIDADE[0],
  "Realização de avaliação de insalubridade nas dependências da empresa, com base nos critérios estabelecidos pela Norma Regulamentadora nº 15 (NR-15) e demais normas técnicas aplicáveis. O serviço contempla visita técnica aos ambientes de trabalho, levantamento das atividades exercidas, identificação e análise dos agentes físicos, químicos e biológicos, bem como, quando necessário, a realização de medições quantitativas conforme metodologias reconhecidas. Ênfase para o cargo de auxiliar de limpeza, contemplando a avaliação das atividades executadas e análises quantitativas relacionadas à exposição de produtos domissanitários utilizados na rotina de trabalho. Ao final, será elaborado e entregue o Laudo de Insalubridade, contendo enquadramento das atividades, caracterização ou descaracterização do adicional, grau de insalubridade (mínimo, médio ou máximo), além de recomendações técnicas para adequação às exigências legais. Ressaltamos que a implementação das medidas corretivas indicadas é de responsabilidade da contratante."
);
assert.deepEqual([...INSALUBRIDADE_INCLUSOS_ITENS], [
  "Visita técnica na empresa.",
  "Mapeamento dos riscos insalubres.",
  "Análises quantitativas utilizando método e equipamento adequado.",
  "Elaboração de Laudo de Insalubridade.",
]);
assert.deepEqual([...INSALUBRIDADE_INCLUSOS_OBSERVACOES], [
  "Será necessário agendar um dia de visita prévia para avaliações quantitativas dos agentes insalubres, com uso de metodologia e equipamentos adequados.",
]);
assert.equal(
  labelItensInclusosServico(SERVICO_INSALUBRIDADE_NOME),
  "O que está incluso?"
);

assert.deepEqual(
  filterServicosPorModalidade(
    [
      { id: "1", nome: PACOTE_COMPLETO_SST_NOME },
      { id: "2", nome: SERVICO_INSALUBRIDADE_NOME },
    ],
    "pontual"
  ).map((s) => s.nome),
  [PACOTE_COMPLETO_SST_NOME, SERVICO_INSALUBRIDADE_NOME]
);
assert.deepEqual(
  filterServicosPorModalidade(
    [
      { id: "1", nome: PACOTE_COMPLETO_SST_NOME },
      { id: "2", nome: SERVICO_INSALUBRIDADE_NOME },
    ],
    "mensalidade"
  ).map((s) => s.nome),
  [PACOTE_COMPLETO_SST_NOME]
);

const abas = buildOrcamentoEtapas("insalubridade");
assert.deepEqual(
  abas.map((e) => e.id),
  [
    "resumo",
    "aprovado",
    "contrato",
    "financeiro",
    "visita_aet",
    "elaboracao",
    "envio",
  ]
);
assert.equal(
  abas.find((e) => e.id === "elaboracao")?.label,
  "Elaboração do Laudo"
);
assert.equal(
  buildOrcamentoEtapas("aet").find((e) => e.id === "elaboracao")?.label,
  "Elaboração do AET"
);

const contratoOk = {
  id: "ap1",
  orcamento_id: "o1",
  quantidade_colaboradores: 0,
  valor_final: 4500,
  condicao_pagamento: "2x",
  quantidade_parcelas: 2,
  valor_parcela: 2250,
  desconto_percentual: 0,
  valor_avista: null,
  observacoes: null,
  aprovado_por: "AGATHA",
  aprovado_em: "2026-09-18T00:00:00Z",
  contrato_enviado: false,
  contrato_enviado_em: null,
  contrato_assinado: true,
  contrato_assinado_em: "2026-09-18",
  contrato_salvo_em: "2026-09-18T12:00:00Z",
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
} as const;

assert.equal(
  isOrcamentoEtapaLiberada("visita_aet", contratoOk, true, {
    fluxo: "insalubridade",
  }),
  true
);
assert.equal(
  isOrcamentoEtapaLiberada("elaboracao", contratoOk, true, {
    fluxo: "insalubridade",
    aet: { visita_status: "realizada" } as ImplantacaoAetRecord,
  }),
  true
);
assert.equal(
  isOrcamentoEtapaLiberada("envio", contratoOk, true, {
    fluxo: "insalubridade",
    aet: {
      visita_status: "realizada",
      elaboracao_status: "concluido",
      laudo_path: "laudo.pdf",
    } as ImplantacaoAetRecord,
  }),
  true
);

function makeOrcamento(
  itens: OrcamentoComItens["orcamento_itens"]
): OrcamentoComItens {
  return {
    id: "o-insal",
    numero: "ORC-2026-0501",
    data_proposta: "2026-09-18",
    cliente_id: "cli-1",
    cliente_nome: "EMPRESA TESTE",
    cliente_cnpj: "12345678000195",
    cliente_endereco: null,
    cliente_setor: null,
    contato: null,
    email: null,
    telefone: null,
    origem_cliente: "indicacao",
    responsavel: "AGATHA",
    validade_proposta: "2026-10-18",
    quantidade_parcelas: 2,
    subtotal: 4500,
    valor_total: 4500,
    forma_pagamento: "parcelado",
    desconto_percentual: 0,
    modalidade: "pontual",
    status: "aprovado",
    observacoes: null,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    assinatura_status: "nao_aplicavel",
    assinatura_token: null,
    aceite_em: null,
    aceite_ip: null,
    aceite_usuario_nome: null,
    link_aceite_expira_em: null,
    created_at: "",
    updated_at: "",
    orcamento_itens: itens,
  };
}

const orcInsal = makeOrcamento([
  {
    id: "i1",
    orcamento_id: "o-insal",
    servico_id: "insal-uuid",
    servico_nome: SERVICO_INSALUBRIDADE_NOME,
    quantidade: 1,
    valor_unitario: 4500,
    valor_total: 4500,
    ordem: 0,
  },
]);
const apInsal = {
  ...contratoOk,
  id: "ap-insal",
  orcamento_id: "o-insal",
  orcamento_aprovacao_itens: [
    {
      id: "ai1",
      aprovacao_id: "ap-insal",
      servico_id: "insal-uuid",
      servico_nome: SERVICO_INSALUBRIDADE_NOME,
      quantidade: 1,
      valor_unitario: 4500,
      valor_total: 4500,
      ordem: 0,
    },
  ],
} as OrcamentoAprovacaoRecord;

assert.equal(podeGerarContratoNavarro(orcInsal, apInsal), false);
assert.equal(
  motivoBloqueioGeracaoContrato(orcInsal, apInsal),
  SERVICO_INSALUBRIDADE_CONTRATO_NAO_CONFIGURADO_MSG
);

assert.equal(resolveServicoPontualKind([insalItem]), "insalubridade");

const sst = {
  ...contratoOk,
  id: "ap-sst",
  orcamento_id: "o-sst",
  quantidade_colaboradores: 10,
  valor_final: 18000,
  orcamento_aprovacao_itens: [
    {
      id: "sst-i",
      aprovacao_id: "ap-sst",
      servico_id: "sst-uuid",
      servico_nome: PACOTE_COMPLETO_SST_NOME,
      quantidade: 10,
      valor_unitario: 18000,
      valor_total: 18000,
      ordem: 0,
    },
  ],
} as OrcamentoAprovacaoRecord;
const aet = {
  ...contratoOk,
  id: "ap-aet",
  orcamento_id: "o-aet",
  orcamento_aprovacao_itens: [
    {
      id: "aet-i",
      aprovacao_id: "ap-aet",
      servico_id: "aet-uuid",
      servico_nome: SERVICO_AET_NOME,
      quantidade: 1,
      valor_unitario: 2800,
      valor_total: 2800,
      ordem: 0,
    },
  ],
} as OrcamentoAprovacaoRecord;

const ficha = listServicosPontuaisContratados({
  orcamentos: [
    { id: "o-sst", numero: "ORC-2026-0001" },
    { id: "o-aet", numero: "ORC-2026-0002" },
    { id: "o-insal", numero: "ORC-2026-0501" },
  ],
  aprovacoesByOrcamentoId: new Map([
    ["o-sst", sst],
    ["o-aet", aet],
    ["o-insal", apInsal],
  ]),
});
assert.equal(ficha.length, 2);
assert.deepEqual(
  ficha.map((item) => item.kind).sort(),
  ["aet", "insalubridade"]
);
assert.ok(ficha.some((item) => item.servicoNome === SERVICO_INSALUBRIDADE_NOME));
assert.ok(ficha.some((item) => item.servicoNome === SERVICO_AET_NOME));
assert.ok(!ficha.some((item) => item.servicoNome === PACOTE_COMPLETO_SST_NOME));

console.log("test-servico-insalubridade: ok");
