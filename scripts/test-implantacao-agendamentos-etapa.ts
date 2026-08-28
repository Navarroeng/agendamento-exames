import assert from "node:assert/strict";
import {
  buildImplantacaoProcesso,
  countImplantacaoEtapasConcluidas,
  resolveImplantacaoEtapaAtual,
} from "../lib/implantacao-clientes";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoRecord } from "../lib/orcamento-types";
import type { ClienteContratoRecord } from "../lib/types";

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

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase(), {
    quantidadeContratada: 2,
    agendamentosRealizados: 0,
    agendamentosDispensados: true,
  }),
  "concluido"
);

assert.equal(
  countImplantacaoEtapasConcluidas(aprovacaoBase(), {
    quantidadeContratada: 2,
    agendamentosRealizados: 0,
    agendamentosDispensados: true,
  }),
  7
);

const nepper = buildImplantacaoProcesso({
  orcamento: {
    id: "o-nepper",
    numero: "ORC-2026-0007",
    status: "aprovado",
    cliente_nome: "NEPPER CONSTRUTORA",
    cliente_cnpj: "00",
    responsavel: "Admin",
    origem_cliente: null,
  } as OrcamentoRecord,
  aprovacao: aprovacaoBase({ quantidade_colaboradores: 10 }),
  contrato: {
    id: "c-nepper",
    numero: "CTR-NEPPER",
    quantidade_colaboradores: 10,
    status: "ativo",
    agendamentos_iniciais_dispensados: false,
  } as ClienteContratoRecord,
  agendamentosRealizados: 5,
  examesProgramadosFuturos: 4,
  asosContratuaisEmAberto: 0,
  pendentesDefinicao: 0,
  vagasComprometidas: 0,
});
assert.equal(nepper.etapaAtual, "concluido");
assert.equal(nepper.etapasConcluidas, 7);
assert.equal(nepper.totalEtapas, 7);
assert.equal(nepper.progressoLabel, "7 de 7");

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase({ quantidade_colaboradores: 2 }), {
    quantidadeContratada: 2,
    agendamentosRealizados: 1,
    pendentesDefinicao: 0,
    vagasComprometidas: 0,
  }),
  "concluido"
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase({ quantidade_colaboradores: 10 }), {
    quantidadeContratada: 10,
    agendamentosRealizados: 9,
    pendentesDefinicao: 0,
    vagasComprometidas: 0,
  }),
  "concluido"
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase({ quantidade_colaboradores: 2 }), {
    quantidadeContratada: 2,
    agendamentosRealizados: 1,
    pendentesDefinicao: 1,
    vagasComprometidas: 0,
  }),
  "aguardando_agendamentos"
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase({ quantidade_colaboradores: 2 }), {
    quantidadeContratada: 2,
    agendamentosRealizados: 1,
    pendentesDefinicao: 0,
    vagasComprometidas: 1,
  }),
  "concluido"
);

const jFerreira = buildImplantacaoProcesso({
  orcamento: {
    id: "o-jferreira",
    numero: "ORC-2026-0019",
    status: "aprovado",
    cliente_nome: "J FERREIRA MARINHO REFRIGERAÇÃO LTDA",
    cliente_cnpj: "00",
    responsavel: "Admin",
    origem_cliente: null,
  } as OrcamentoRecord,
  aprovacao: aprovacaoBase({ quantidade_colaboradores: 3 }),
  contrato: {
    id: "c-jferreira",
    numero: "CTR-2026-0015",
    quantidade_colaboradores: 3,
    status: "ativo",
    agendamentos_iniciais_dispensados: false,
  } as ClienteContratoRecord,
  agendamentosRealizados: 0,
  examesProgramadosFuturos: 1,
  asosContratuaisEmAberto: 1,
  pendentesDefinicao: 0,
  vagasComprometidas: 1,
});
assert.equal(jFerreira.etapaAtual, "concluido");
assert.equal(jFerreira.etapasConcluidas, 7);
assert.equal(jFerreira.totalEtapas, 7);
assert.equal(jFerreira.progressoLabel, "7 de 7");
assert.equal(jFerreira.pendentesDefinicao, 0);
assert.equal(jFerreira.vagasComprometidas, 1);
assert.equal(jFerreira.agendamentosRealizados, 2);

assert.equal(
  countImplantacaoEtapasConcluidas(
    aprovacaoBase({ quantidade_colaboradores: 2 }),
    {
      quantidadeContratada: 2,
      agendamentosRealizados: 1,
      pendentesDefinicao: 0,
      vagasComprometidas: 1,
    }
  ),
  7
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase({ quantidade_colaboradores: 3 }), {
    quantidadeContratada: 3,
    agendamentosRealizados: 3,
    pendentesDefinicao: 0,
    vagasComprometidas: 0,
  }),
  "concluido"
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase({ quantidade_colaboradores: 3 }), {
    quantidadeContratada: 3,
    agendamentosRealizados: 1,
    pendentesDefinicao: 1,
    vagasComprometidas: 1,
  }),
  "aguardando_agendamentos"
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoBase({ quantidade_colaboradores: 3 }), {
    quantidadeContratada: 3,
    agendamentosRealizados: 2,
    pendentesDefinicao: 0,
    vagasComprometidas: 1,
  }),
  "concluido"
);

console.log("ok: implantacao-agendamentos-etapa");
