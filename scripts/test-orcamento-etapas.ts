/** Smoke test: gating das etapas do orçamento. */

import assert from "node:assert/strict";
import {
  isContratoEtapaConcluida,
  isFinanceiroEtapaConcluida,
  isOrcamentoEtapaLiberada,
  isProcuracaoEtapaConcluida,
} from "../lib/orcamento-etapas";
import { buildMensagemVisitaTecnica } from "../lib/orcamento-visita-mensagem";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";

function aprovacao(
  partial: Partial<OrcamentoAprovacaoRecord>
): OrcamentoAprovacaoRecord {
  return {
    id: "a1",
    orcamento_id: "o1",
    quantidade_colaboradores: 1,
    valor_final: 100,
    condicao_pagamento: null,
    quantidade_parcelas: null,
    valor_parcela: null,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: null,
    aprovado_por: "AGATHA",
    aprovado_em: "2026-07-28T00:00:00Z",
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
    ...partial,
  };
}

assert.equal(isOrcamentoEtapaLiberada("resumo", null, false), true);
assert.equal(isOrcamentoEtapaLiberada("contrato", null, false), false);
assert.equal(
  isOrcamentoEtapaLiberada("contrato", aprovacao({}), true),
  true
);
assert.equal(
  isOrcamentoEtapaLiberada("financeiro", aprovacao({}), true),
  false
);

const contratoOk = aprovacao({
  contrato_assinado: true,
  contrato_assinado_em: "2026-07-28",
  contrato_salvo_em: "2026-07-28T12:00:00Z",
});
assert.equal(isContratoEtapaConcluida(contratoOk), true);
assert.equal(isOrcamentoEtapaLiberada("financeiro", contratoOk, true), true);

const financeiroOk = aprovacao({
  ...contratoOk,
  boleto_pago: true,
  boleto_pago_em: "2026-07-30",
  financeiro_salvo_em: "2026-07-30T12:00:00Z",
});
assert.equal(isFinanceiroEtapaConcluida(financeiroOk), true);
assert.equal(isOrcamentoEtapaLiberada("procuracao", financeiroOk, true), true);

const procuracaoOk = aprovacao({
  ...financeiroOk,
  procuracao_status: "ativa",
  procuracao_salva_em: "2026-07-30T13:00:00Z",
});
assert.equal(isProcuracaoEtapaConcluida(procuracaoOk), true);
assert.equal(
  isOrcamentoEtapaLiberada("funcionarios", procuracaoOk, true),
  true
);

const msg = buildMensagemVisitaTecnica({
  data: "2026-08-10",
  horario: "09:00",
  endereco: "Rua A, 100",
});
assert.match(msg, /Navarro Engenharia de Segurança e Medicina Ocupacional/);
assert.match(msg, /Rua A, 100/);
assert.match(msg, /às 09:00/);
assert.match(msg, /Pedro Navarro/);

console.log("test-orcamento-etapas: OK");
