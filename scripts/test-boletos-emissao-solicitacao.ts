/** Solicitação de emissão dos boletos na aba Financeiro da implantação. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BOLETOS_EMISSAO_DATA_OBRIGATORIA_MSG,
  BOLETOS_EMISSAO_ORIENTACAO,
  dataSolicitacaoEmissaoBoletosValida,
  estadoFormularioSolicitacaoEmissaoBoletos,
  gravacaoSolicitacaoEmissaoBoletos,
  registroSolicitacaoOuHistoricoLiberado,
  solicitacaoEmissaoBoletosConfirmada,
} from "../lib/boletos-emissao-solicitacao";
import { resolveImplantacaoEtapaAtual } from "../lib/implantacao-clientes";
import {
  isOrcamentoEtapaLiberada,
  resolveOrcamentoEtapaAtual,
  resolveOrcamentoEtapaEstado,
} from "../lib/orcamento-etapas";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import { usaControleParcelasMensalidade } from "../lib/mensalidade-parcelas";

function aprovacao(
  partial: Partial<OrcamentoAprovacaoRecord>
): OrcamentoAprovacaoRecord {
  return {
    id: "a1",
    orcamento_id: "o1",
    quantidade_colaboradores: 10,
    valor_final: 350,
    condicao_pagamento: "12 mensalidades",
    quantidade_parcelas: null,
    valor_parcela: null,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "AGATHA",
    aprovado_em: "2026-10-14T00:00:00Z",
    contrato_enviado: true,
    contrato_enviado_em: "2026-10-14",
    contrato_assinado: true,
    contrato_assinado_em: "2026-10-14",
    contrato_salvo_em: "2026-10-14T12:00:00.000Z",
    observacao_contrato: null,
    boleto_vencimento: "2026-10-14",
    boleto_pago: false,
    boleto_pago_em: null,
    comprovante_path: null,
    comprovante_nome: null,
    comprovante_tipo: null,
    comprovante_tamanho: null,
    observacao_pagamento: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

const ctx = { controleMensalidades: true };
const semConfirmacao = aprovacao({
  mensalidade_pagamento: "mensal",
  boletos_emissao_solicitada: null,
  boletos_emissao_solicitada_em: null,
  financeiro_salvo_em: "2026-10-14T12:00:00.000Z",
});

assert.equal(solicitacaoEmissaoBoletosConfirmada(semConfirmacao), false);
assert.equal(registroSolicitacaoOuHistoricoLiberado(semConfirmacao), false);
assert.equal(
  isOrcamentoEtapaLiberada("procuracao", semConfirmacao, true, ctx),
  false
);
assert.equal(
  resolveOrcamentoEtapaAtual(semConfirmacao, true, null, ctx),
  "financeiro"
);
assert.equal(
  resolveImplantacaoEtapaAtual(semConfirmacao, { controleMensalidades: true }),
  "financeiro"
);
assert.deepEqual(estadoFormularioSolicitacaoEmissaoBoletos(semConfirmacao), {
  solicitar: false,
  data: "",
});

const simSemData = aprovacao({
  boletos_emissao_solicitada: true,
  boletos_emissao_solicitada_em: null,
});
assert.equal(dataSolicitacaoEmissaoBoletosValida(""), null);
assert.equal(dataSolicitacaoEmissaoBoletosValida("2026-02-31"), null);
assert.equal(solicitacaoEmissaoBoletosConfirmada(simSemData), false);
assert.equal(
  isOrcamentoEtapaLiberada("procuracao", simSemData, true, ctx),
  false
);
assert.throws(
  () => gravacaoSolicitacaoEmissaoBoletos(true, ""),
  new Error(BOLETOS_EMISSAO_DATA_OBRIGATORIA_MSG)
);

const pagoSemSolicitacao = aprovacao({
  boleto_pago: true,
  boleto_pago_em: "2026-10-20",
  financeiro_salvo_em: "2026-10-20T12:00:00.000Z",
});
assert.equal(
  isOrcamentoEtapaLiberada("procuracao", pagoSemSolicitacao, true, ctx),
  false
);

const gravada = aprovacao({
  boletos_emissao_solicitada: true,
  boletos_emissao_solicitada_em: "2026-11-11",
  boleto_pago: false,
});
assert.deepEqual(gravacaoSolicitacaoEmissaoBoletos(true, "2026-11-11"), {
  boletos_emissao_solicitada: true,
  boletos_emissao_solicitada_em: "2026-11-11",
});
assert.equal(solicitacaoEmissaoBoletosConfirmada(gravada), true);
assert.equal(isOrcamentoEtapaLiberada("procuracao", gravada, true, ctx), true);
assert.equal(
  isOrcamentoEtapaLiberada("funcionarios", gravada, true, ctx),
  false
);
assert.equal(resolveOrcamentoEtapaAtual(gravada, true, null, ctx), "procuracao");
assert.equal(
  resolveImplantacaoEtapaAtual(gravada, { controleMensalidades: true }),
  "procuracao"
);
assert.deepEqual(estadoFormularioSolicitacaoEmissaoBoletos(gravada), {
  solicitar: true,
  data: "2026-11-11",
});
assert.equal(
  resolveOrcamentoEtapaEstado(
    "procuracao",
    gravada,
    true,
    "financeiro",
    null,
    ctx
  ) === "bloqueada",
  false
);

const antiga = aprovacao({
  boletos_emissao_solicitada: null,
  boletos_emissao_solicitada_em: null,
  procuracao_status: "ativa",
  procuracao_salva_em: "2026-09-01T15:00:00.000Z",
  financeiro_salvo_em: "2026-08-01T15:00:00.000Z",
});
assert.equal(solicitacaoEmissaoBoletosConfirmada(antiga), false);
assert.deepEqual(estadoFormularioSolicitacaoEmissaoBoletos(antiga), {
  solicitar: false,
  data: "",
});
assert.equal(isOrcamentoEtapaLiberada("procuracao", antiga, true, ctx), true);
assert.equal(
  resolveImplantacaoEtapaAtual(antiga, { controleMensalidades: true }),
  "funcionarios"
);
assert.equal(
  isOrcamentoEtapaLiberada("funcionarios", antiga, true, ctx),
  true
);

const treinamentoAntigo = aprovacao({});
assert.equal(
  resolveImplantacaoEtapaAtual(treinamentoAntigo, {
    controleMensalidades: true,
    fluxo: "somente_treinamentos",
    treinamento: {
      id: "t1",
      orcamento_id: "o1",
      aprovacao_id: "a1",
      data_treinamento: "2026-09-02",
      horario_inicio: "08:00",
      horario_termino: "12:00",
      modalidade: "presencial",
      local_treinamento: "Sala",
      endereco: null,
      link_reuniao: null,
      tipo_nome: "NR-35",
      quantidade_participantes: 8,
      instrutor_responsavel: null,
      contato_empresa: null,
      observacoes: null,
      status: "realizado",
      motivo_cancelamento: null,
      motivo_reagendamento: null,
      data_anterior: null,
      horario_inicio_anterior: null,
      horario_termino_anterior: null,
    },
  }),
  "concluido"
);
assert.equal(
  resolveImplantacaoEtapaAtual(aprovacao({}), {
    controleMensalidades: true,
    fluxo: "somente_treinamentos",
  }),
  "financeiro"
);

assert.equal(usaControleParcelasMensalidade("mensalidade", "avista"), false);
assert.equal(
  isOrcamentoEtapaLiberada(
    "procuracao",
    aprovacao({ mensalidade_pagamento: "avista", boleto_pago: false }),
    true,
    { controleMensalidades: false }
  ),
  false
);

const aba = readFileSync(
  resolve(
    "components/orcamentos/OrcamentoAbaFinanceiroMensalidade.tsx"
  ),
  "utf8"
);
const modal = readFileSync(
  resolve("components/orcamentos/OrcamentoAprovarModal.tsx"),
  "utf8"
);
const servico = readFileSync(
  resolve("services/mensalidade-parcelas.service.ts"),
  "utf8"
);
assert.ok(aba.indexOf("Solicitar emissão dos boletos?") >= 0);
assert.ok(
  aba.indexOf("Solicitar emissão dos boletos?") <
    aba.indexOf("Mensalidades da vigência")
);
assert.ok(aba.includes("Data da solicitação"));
assert.ok(aba.includes("BOLETOS_EMISSAO_ORIENTACAO"));
assert.ok(aba.includes("exibirParcelas"));
assert.equal(
  BOLETOS_EMISSAO_ORIENTACAO,
  "Registre a solicitação de emissão dos boletos para continuar."
);
const salvarFinanceiro = modal.slice(
  modal.indexOf("async function handleSalvarFinanceiroClick")
);
assert.ok(salvarFinanceiro.includes("gravacaoSolicitacaoEmissaoBoletos"));
assert.ok(modal.includes("estadoFormularioSolicitacaoEmissaoBoletos"));
assert.ok(
  salvarFinanceiro.indexOf("BOLETOS_EMISSAO_DATA_OBRIGATORIA_MSG") <
    salvarFinanceiro.indexOf("setSalvandoParcelas(true)")
);
assert.ok(salvarFinanceiro.includes("toast.error"));
assert.ok(servico.includes("boletos_emissao_solicitada_em"));
assert.ok(servico.includes("planejarPersistenciaParcelas"));

console.log("test-boletos-emissao-solicitacao: OK");
