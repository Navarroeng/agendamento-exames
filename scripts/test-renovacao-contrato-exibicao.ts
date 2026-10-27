/** Renovação gravada: listagem, histórico e proposta comercial intacta. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  labelRenovacaoContratoListagem,
  paragrafosPropostaGestaoMensal,
  renovacaoContratoSalva,
} from "../lib/contrato-navarro";
import {
  renovacaoSalvaDoContratoAtual,
  type ClienteContratoConsulta,
} from "../lib/cliente-contrato-atual";
import { ORCAMENTO_MENSALIDADE_RENOVACAO_LABEL } from "../lib/orcamento-modalidade";

function contrato(
  over: Partial<ClienteContratoConsulta> & Pick<ClienteContratoConsulta, "id">
): ClienteContratoConsulta {
  return {
    cliente_id: "c1",
    data_inicio: "2026-01-01",
    data_fim: "2026-12-31",
    quantidade_colaboradores: 10,
    valor_contrato: 350,
    condicao_pagamento: "12 mensalidades",
    tipo_contrato: "mensal",
    reajuste_percentual: null,
    observacoes: null,
    status: "ativo",
    contrato_assinado_em: "2026-01-02",
    modalidadeOrcamento: "mensalidade",
    mensalidadePagamento: "mensal",
    ...over,
  };
}

assert.equal(renovacaoContratoSalva(true), "automatica");
assert.equal(renovacaoContratoSalva(false), "nao_automatica");
assert.equal(renovacaoContratoSalva(null), null);
assert.equal(renovacaoContratoSalva(undefined), null);
assert.equal(labelRenovacaoContratoListagem(true), "Automática");
assert.equal(labelRenovacaoContratoListagem(false), "Não automática");
assert.equal(labelRenovacaoContratoListagem(null), "—");
assert.equal(labelRenovacaoContratoListagem(undefined), "—");

const hoje = "2026-06-01";
const semEvidencia = contrato({
  id: "sem",
  renovacaoAutomatica: null,
  quantidade_parcelas: 12,
  mensalidadePagamento: "avista",
});
assert.equal(renovacaoSalvaDoContratoAtual([semEvidencia], hoje), null);
assert.equal(
  labelRenovacaoContratoListagem(semEvidencia.renovacaoAutomatica),
  "—"
);

const pontualAntigo = contrato({
  id: "pontual",
  tipo_contrato: "anual",
  modalidadeOrcamento: "pontual",
  mensalidadePagamento: null,
  condicao_pagamento: "3 parcelas",
  renovacaoAutomatica: undefined,
});
assert.equal(renovacaoSalvaDoContratoAtual([pontualAntigo], hoje), null);

const anterior = contrato({
  id: "antigo",
  data_inicio: "2024-01-01",
  data_fim: "2024-12-31",
  status: "encerrado",
  renovacaoAutomatica: true,
});
const atual = contrato({
  id: "atual",
  data_inicio: "2026-01-01",
  data_fim: "2026-12-31",
  renovacaoAutomatica: false,
});
assert.equal(renovacaoSalvaDoContratoAtual([anterior, atual], hoje), false);
assert.equal(labelRenovacaoContratoListagem(anterior.renovacaoAutomatica), "Automática");
assert.equal(labelRenovacaoContratoListagem(atual.renovacaoAutomatica), "Não automática");
assert.equal(renovacaoSalvaDoContratoAtual([], hoje), null);

const proposta = paragrafosPropostaGestaoMensal().join("\n");
assert.match(proposta, /renovação automática/);
assert.match(proposta, /30 dias/);
assert.doesNotMatch(proposta, /sem renovação automática/);
assert.doesNotMatch(proposta, /será encerrado, sem renovação/);
assert.equal(
  ORCAMENTO_MENSALIDADE_RENOVACAO_LABEL,
  "Automática, aviso de 30 dias"
);

const painel = readFileSync(
  "components/orcamentos/OrcamentoContratoGerarPanel.tsx",
  "utf8"
);
assert.match(painel, /Renovação do contrato/);
assert.match(painel, /RENOVACAO_CONTRATO_OPCOES/);
assert.match(painel, /salvarRenovacaoContratoMensalidade/);
assert.match(
  readFileSync("lib/contrato-navarro.ts", "utf8"),
  /Sem renovação automática/
);
const orcamentoPdf = readFileSync("lib/orcamento-pdf.ts", "utf8");
assert.doesNotMatch(orcamentoPdf, /sem renovação automática/);
assert.doesNotMatch(orcamentoPdf, /será encerrado, sem renovação/);

const tabela = readFileSync("components/clientes/ClientesTable.tsx", "utf8");
assert.match(tabela, /Renovação/);
assert.match(tabela, /RenovacaoContratoBadge/);
const card = readFileSync(
  "components/clientes/ClienteContratoAtualCard.tsx",
  "utf8"
);
assert.match(card, /Renovação/);
const historico = readFileSync(
  "components/clientes/ClienteContratosHistoricoTable.tsx",
  "utf8"
);
assert.match(historico, /contrato\.renovacaoAutomatica/);

console.log("test-renovacao-contrato-exibicao: OK");
