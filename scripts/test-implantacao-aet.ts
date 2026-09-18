/** Testes do fluxo de implantação AET (etapas, dependências, KPIs). */

import assert from "node:assert/strict";
import {
  buildOrcamentoEtapas,
  isOrcamentoEtapaLiberada,
  isOrcamentoEtapaConcluida,
} from "../lib/orcamento-etapas";
import {
  buildImplantacaoEtapasOperacionais,
  buildImplantacaoProcesso,
  computeImplantacaoSummary,
  implantacaoEtapaToModalTab,
  resolveImplantacaoEtapaAtual,
  type ImplantacaoProcesso,
} from "../lib/implantacao-clientes";
import {
  isAetElaboracaoConcluida,
  isAetEnvioConcluido,
  isImplantacaoAetConcluida,
  validateAetElaboracaoPayload,
  validateAetEnvioPayload,
  validateAetVisitaPayload,
  type ImplantacaoAetRecord,
} from "../lib/implantacao-aet";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoRecord } from "../lib/orcamento-types";
import { SERVICO_AET_NOME } from "../lib/servico-aet";
import {
  motivoBloqueioGeracaoContrato,
  podeGerarContratoNavarro,
} from "../lib/contrato-modelo";
import type { OrcamentoComItens } from "../lib/orcamento-types";

const abas = buildOrcamentoEtapas("aet").map((e) => e.id);
assert.deepEqual(abas, [
  "resumo",
  "aprovado",
  "contrato",
  "financeiro",
  "documentos",
  "visita_aet",
  "elaboracao",
  "envio",
]);
assert.ok(!abas.includes("procuracao"));
assert.ok(!abas.includes("funcionarios"));
assert.ok(!abas.includes("logo"));
assert.ok(!abas.includes("agendamentos"));

const sst = buildOrcamentoEtapas("padrao").map((e) => e.id);
assert.ok(sst.includes("procuracao"));
assert.ok(sst.includes("agendamentos"));
assert.ok(!sst.includes("elaboracao"));

const treino = buildOrcamentoEtapas("somente_treinamentos").map((e) => e.id);
assert.deepEqual(treino, [
  "resumo",
  "aprovado",
  "contrato",
  "financeiro",
  "treinamento",
]);

assert.deepEqual(
  buildImplantacaoEtapasOperacionais("aet").map((e) => e.id),
  ["contrato", "financeiro", "documentos", "visita_aet", "elaboracao", "envio"]
);

function aprovacao(
  partial: Partial<OrcamentoAprovacaoRecord> = {}
): OrcamentoAprovacaoRecord {
  return {
    id: "ap1",
    orcamento_id: "o1",
    quantidade_colaboradores: 0,
    valor_final: 2500,
    condicao_pagamento: "À vista",
    quantidade_parcelas: 1,
    valor_parcela: null,
    desconto_percentual: 0,
    valor_avista: 2500,
    observacoes: null,
    aprovado_por: "AGATHA",
    aprovado_em: "2026-09-17T12:00:00Z",
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
        aprovacao_id: "ap1",
        servico_id: "aet-1",
        servico_nome: SERVICO_AET_NOME,
        quantidade: 1,
        valor_unitario: 2500,
        valor_total: 2500,
        ordem: 0,
      },
    ],
    ...partial,
  };
}

function aetRow(
  partial: Partial<ImplantacaoAetRecord> = {}
): ImplantacaoAetRecord {
  return {
    id: "aet1",
    orcamento_id: "o1",
    aprovacao_id: "ap1",
    documentos_conferidos: false,
    documentos_conferidos_em: null,
    documentos_conferidos_por: null,
    visita_status: "aguardando_agendamento",
    visita_data: null,
    visita_horario: null,
    visita_responsavel: null,
    visita_observacao: null,
    visita_realizada_em: null,
    elaboracao_status: "aguardando",
    elaboracao_observacao: null,
    elaboracao_concluida_em: null,
    laudo_path: null,
    laudo_nome: null,
    laudo_tipo: null,
    laudo_tamanho: null,
    enviado_cliente: false,
    enviado_em: null,
    envio_observacao: null,
    ...partial,
  };
}

const contratoOk = aprovacao({
  contrato_assinado: true,
  contrato_assinado_em: "2026-09-17",
  contrato_salvo_em: "2026-09-17T12:00:00Z",
});
const financeiroOk = aprovacao({
  ...contratoOk,
  boleto_pago: true,
  boleto_pago_em: "2026-09-18",
  financeiro_salvo_em: "2026-09-18T12:00:00Z",
});

assert.equal(
  isOrcamentoEtapaLiberada("documentos", financeiroOk, true, { fluxo: "aet" }),
  true
);
assert.equal(
  isOrcamentoEtapaLiberada("visita_aet", financeiroOk, true, {
    fluxo: "aet",
    aet: aetRow(),
  }),
  false
);
assert.equal(
  isOrcamentoEtapaLiberada("visita_aet", financeiroOk, true, {
    fluxo: "aet",
    aet: aetRow({ documentos_conferidos: true }),
  }),
  true
);

const visitaRealizada = aetRow({
  documentos_conferidos: true,
  visita_status: "realizada",
  visita_data: "2026-09-20",
});
assert.equal(
  isOrcamentoEtapaLiberada("elaboracao", financeiroOk, true, {
    fluxo: "aet",
    aet: visitaRealizada,
  }),
  true
);
assert.equal(
  validateAetElaboracaoPayload(
    { elaboracao_status: "em_elaboracao", elaboracao_observacao: null },
    aetRow({ documentos_conferidos: true })
  ),
  "Aguardando realização da visita"
);
assert.equal(
  validateAetElaboracaoPayload(
    { elaboracao_status: "concluido", elaboracao_observacao: null },
    visitaRealizada
  ),
  "Anexe o Laudo AET final antes de concluir esta etapa."
);

const elaboracaoOk = aetRow({
  documentos_conferidos: true,
  visita_status: "realizada",
  visita_data: "2026-09-20",
  elaboracao_status: "concluido",
  laudo_path: "ap1/aet_laudo-1.pdf",
  laudo_nome: "Laudo.pdf",
});
assert.equal(isAetElaboracaoConcluida(elaboracaoOk), true);
assert.equal(
  validateAetEnvioPayload(
    { enviado_cliente: true, enviado_em: null, envio_observacao: null },
    elaboracaoOk
  ),
  "Informe a data de envio ao cliente."
);
assert.equal(
  validateAetEnvioPayload(
    {
      enviado_cliente: true,
      enviado_em: "2026-09-22",
      envio_observacao: null,
    },
    visitaRealizada
  ),
  "Conclua a elaboração do AET e anexe o PDF final antes de registrar o envio."
);

const envioOk = aetRow({
  ...elaboracaoOk,
  enviado_cliente: true,
  enviado_em: "2026-09-22",
});
assert.equal(isAetEnvioConcluido(envioOk), true);
assert.equal(
  isImplantacaoAetConcluida(financeiroOk, envioOk, true, true),
  true
);
assert.equal(
  isImplantacaoAetConcluida(financeiroOk, elaboracaoOk, true, true),
  false
);

assert.equal(
  resolveImplantacaoEtapaAtual(financeiroOk, {
    fluxo: "aet",
    aet: aetRow({ documentos_conferidos: true, visita_status: "agendada" }),
  }),
  "visita_agendada"
);
assert.equal(
  implantacaoEtapaToModalTab("visita_agendada", "aet"),
  "visita_aet"
);
assert.equal(implantacaoEtapaToModalTab("concluido", "aet"), "envio");
assert.equal(
  implantacaoEtapaToModalTab("aguardando_agendamentos", "padrao"),
  "agendamentos"
);

const orcamento = {
  id: "o1",
  numero: "ORC-2026-0099",
  status: "aprovado",
  cliente_nome: "EMPRESA AET",
  cliente_cnpj: "123",
  cliente_id: "c1",
  responsavel: "AGATHA",
  origem_cliente: "indicacao",
} as OrcamentoRecord;

const processo = buildImplantacaoProcesso({
  orcamento,
  aprovacao: financeiroOk,
  contrato: null,
  fluxoImplantacao: "aet",
  aet: aetRow({ documentos_conferidos: true }),
});
assert.equal(processo.etapaAtual, "visita_aet");
assert.equal(processo.agendamentoLabel, "Não aplicável");
assert.equal(processo.agendamentoLiberado, false);
assert.equal(processo.totalEtapas, 8);

const summary = computeImplantacaoSummary([processo]);
assert.equal(summary.totalEmImplantacao, 1);
assert.equal(summary.liberadosAgendamento, 0);
assert.equal(summary.aguardandoDocumentos, 0);

const docsProcesso = buildImplantacaoProcesso({
  orcamento,
  aprovacao: financeiroOk,
  contrato: null,
  fluxoImplantacao: "aet",
  aet: aetRow(),
});
assert.equal(docsProcesso.etapaAtual, "documentos");
assert.equal(
  computeImplantacaoSummary([docsProcesso]).aguardandoDocumentos,
  1
);

const orcAet = {
  id: "o1",
  numero: "ORC-2026-0099",
  cliente_nome: "EMPRESA AET",
  orcamento_itens: [
    {
      id: "i1",
      orcamento_id: "o1",
      servico_id: "aet-1",
      servico_nome: SERVICO_AET_NOME,
      quantidade: 1,
      valor_unitario: 2500,
      valor_total: 2500,
      ordem: 0,
    },
  ],
} as OrcamentoComItens;
assert.equal(podeGerarContratoNavarro(orcAet, financeiroOk), true);
assert.equal(motivoBloqueioGeracaoContrato(orcAet, financeiroOk), null);

assert.equal(
  isOrcamentoEtapaLiberada("procuracao", financeiroOk, true, { fluxo: "aet" }),
  false
);
assert.equal(
  isOrcamentoEtapaConcluida(
    "envio",
    financeiroOk,
    true,
    null,
    { fluxo: "aet", aet: envioOk }
  ),
  true
);

const dummyProcesso = docsProcesso as ImplantacaoProcesso;
assert.equal(dummyProcesso.fluxoImplantacao, "aet");

assert.equal(
  validateAetVisitaPayload({
    visita_status: "agendada",
    visita_data: null,
    visita_horario: "09:00",
    visita_responsavel: null,
    visita_observacao: null,
  }),
  "Informe a data da visita."
);

console.log("test-implantacao-aet: ok");
