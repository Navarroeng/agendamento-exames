import assert from "node:assert/strict";
import {
  buildContratoAgendamentoContagem,
  contratoTemAgendamentosIniciaisDispensados,
  resolveClassificacaoAgendamento,
} from "../lib/contrato-agendamentos";
import {
  isAgendamentosImplantacaoConcluida,
  resolveImplantacaoEtapaAtual,
} from "../lib/implantacao-clientes";
import { isAgendamentosEtapaConcluida } from "../lib/orcamento-etapas";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";

function aprovacaoBase(
  overrides: Partial<OrcamentoAprovacaoRecord> = {}
): OrcamentoAprovacaoRecord {
  return {
    id: "a1",
    orcamento_id: "o1",
    quantidade_colaboradores: 2,
    valor_final: 1000,
    quantidade_parcelas: 1,
    valor_parcela: 1000,
    desconto_percentual: 0,
    valor_avista: null,
    condicao_pagamento: "avista",
    condicoes_iguais: true,
    aprovado_em: "2026-01-01",
    aprovado_por: "user",
    contrato_assinado: true,
    contrato_assinado_em: "2026-01-02",
    contrato_salvo_em: "2026-01-02",
    boleto_pago: true,
    boleto_pago_em: "2026-01-03",
    financeiro_salvo_em: "2026-01-03",
    procuracao_status: "ativa",
    procuracao_salva_em: "2026-01-04",
    funcionarios_lista_path: "path/lista.pdf",
    logo_path: "path/logo.png",
    visita_tecnica_necessaria: false,
    visita_tecnica_salva_em: "2026-01-05",
    orcamento_aprovacao_itens: [],
    ...overrides,
  } as OrcamentoAprovacaoRecord;
}

assert.equal(
  contratoTemAgendamentosIniciaisDispensados({
    agendamentos_iniciais_dispensados: true,
  }),
  true
);
assert.equal(
  contratoTemAgendamentosIniciaisDispensados({
    agendamentos_iniciais_dispensados: false,
  }),
  false
);

assert.equal(isAgendamentosImplantacaoConcluida(2, 0, true), true);
assert.equal(isAgendamentosImplantacaoConcluida(2, 0, false), false);
assert.equal(isAgendamentosImplantacaoConcluida(2, 2, false), true);

const contagem = buildContratoAgendamentoContagem(2, 0, 1, {
  dispensado: true,
});
assert.equal(contagem.progressoLabel, "Concluído por dispensa");
assert.equal(contagem.utilizados, 0);
assert.equal(contagem.disponiveis, 0);

assert.equal(
  resolveClassificacaoAgendamento({
    status: "agendado",
    selecionado: false,
    dispensado: true,
  }),
  "adicional"
);

assert.equal(
  isAgendamentosEtapaConcluida(aprovacaoBase(), {
    quantidadeContratada: 2,
    agendamentosRealizados: 0,
    agendamentosDispensados: true,
  }),
  true
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase(), {
    quantidadeContratada: 2,
    agendamentosRealizados: 0,
    agendamentosDispensados: true,
  }),
  "concluido"
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase(), {
    quantidadeContratada: 2,
    agendamentosRealizados: 0,
    agendamentosDispensados: false,
  }),
  "aguardando_agendamentos"
);

console.log("ok: dispensa-agendamentos-iniciais");
