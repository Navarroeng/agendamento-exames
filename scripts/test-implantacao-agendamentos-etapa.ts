import assert from "node:assert/strict";
import {
  countImplantacaoEtapasConcluidas,
  resolveImplantacaoEtapaAtual,
} from "../lib/implantacao-clientes";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";

function aprovacaoBase(
  overrides: Partial<OrcamentoAprovacaoRecord> = {}
): OrcamentoAprovacaoRecord {
  return {
    id: "a1",
    orcamento_id: "o1",
    quantidade_colaboradores: 5,
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
  resolveImplantacaoEtapaAtual(aprovacaoBase(), {
    quantidadeContratada: 5,
    agendamentosRealizados: 0,
  }),
  "aguardando_agendamentos"
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase(), {
    quantidadeContratada: 5,
    agendamentosRealizados: 5,
  }),
  "concluido"
);

assert.equal(
  resolveImplantacaoEtapaAtual(
    aprovacaoBase({
      visita_tecnica_necessaria: null,
      visita_tecnica_salva_em: null,
    }),
    { quantidadeContratada: 5, agendamentosRealizados: 5 }
  ),
  "visita"
);

assert.equal(
  countImplantacaoEtapasConcluidas(aprovacaoBase(), {
    quantidadeContratada: 5,
    agendamentosRealizados: 2,
  }),
  6
);

assert.equal(
  countImplantacaoEtapasConcluidas(aprovacaoBase(), {
    quantidadeContratada: 5,
    agendamentosRealizados: 5,
  }),
  7
);

console.log("ok: implantacao-agendamentos-etapa");
