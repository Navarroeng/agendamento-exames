/** Smoke: exame futuro na implantação consome vaga e conclui etapa. */

import assert from "node:assert/strict";
import {
  buildContratoAgendamentoContagem,
} from "../lib/contrato-agendamentos";
import {
  formatMesAnoPrevisto,
  labelMotivoExameFuturo,
  labelOrigemPeriodico,
  MOTIVOS_EXAME_FUTURO,
  ORIGEM_PERIODICO_IMPLANTACAO,
} from "../lib/contrato-programacao-futura";
import {
  buildImplantacaoProcesso,
  isAgendamentosImplantacaoConcluida,
  resolveImplantacaoEtapaAtual,
} from "../lib/implantacao-clientes";
import type { OrcamentoAprovacaoRecord } from "../lib/orcamento-aprovacao";
import type { OrcamentoRecord } from "../lib/orcamento-types";
import type { ClienteContratoRecord } from "../lib/types";

assert.ok(MOTIVOS_EXAME_FUTURO.includes("ASO ainda vigente"));
assert.ok(MOTIVOS_EXAME_FUTURO.includes("Outro"));
assert.equal(labelOrigemPeriodico(ORIGEM_PERIODICO_IMPLANTACAO), "Implantação Inicial");
assert.equal(labelOrigemPeriodico("agendamento"), "Agendamento");
assert.equal(
  labelMotivoExameFuturo("Outro", "Exame especial"),
  "Outro — Exame especial"
);
assert.equal(formatMesAnoPrevisto("2027-01-15"), "Janeiro/2027");

// Cenário: 2 agendados + 1 programado = concluído
assert.equal(isAgendamentosImplantacaoConcluida(3, 3, false), true);

const contagem = buildContratoAgendamentoContagem(3, 2 + 1, 0);
assert.equal(contagem.previstos, 3);
assert.equal(contagem.utilizados, 3);
assert.equal(contagem.disponiveis, 0);
assert.equal(contagem.concluido, true);

function aprovacaoCompleta(): OrcamentoAprovacaoRecord {
  return {
    id: "a1",
    orcamento_id: "o1",
    quantidade_colaboradores: 3,
    valor_final: 1000,
    quantidade_parcelas: 1,
    valor_parcela: 1000,
    desconto_percentual: 0,
    valor_avista: null,
    condicao_pagamento: "avista",
    condicoes_iguais: true,
    aprovado_em: "2026-08-01",
    aprovado_por: "user",
    contrato_assinado: true,
    contrato_assinado_em: "2026-08-02",
    contrato_salvo_em: "2026-08-02",
    boleto_pago: true,
    boleto_pago_em: "2026-08-03",
    financeiro_salvo_em: "2026-08-03",
    procuracao_status: "ativa",
    procuracao_salva_em: "2026-08-04",
    funcionarios_lista_path: "path/lista.pdf",
    logo_path: "path/logo.png",
    visita_tecnica_necessaria: false,
    visita_tecnica_salva_em: "2026-08-05",
    orcamento_aprovacao_itens: [],
  } as unknown as OrcamentoAprovacaoRecord;
}

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoCompleta(), {
    quantidadeContratada: 3,
    agendamentosRealizados: 2,
    agendamentosDispensados: false,
  }),
  "aguardando_agendamentos"
);

assert.equal(
  resolveImplantacaoEtapaAtual(aprovacaoCompleta(), {
    quantidadeContratada: 3,
    agendamentosRealizados: 3,
    agendamentosDispensados: false,
  }),
  "concluido"
);

const processo = buildImplantacaoProcesso({
  orcamento: {
    id: "o1",
    numero: "ORC-1",
    status: "aprovado",
    cliente_nome: "ACME",
    cliente_cnpj: "00",
    responsavel: "Admin",
    origem_cliente: null,
  } as OrcamentoRecord,
  aprovacao: aprovacaoCompleta(),
  contrato: {
    id: "c1",
    numero: "CT-1",
    quantidade_colaboradores: 3,
    agendamentos_iniciais_dispensados: false,
  } as ClienteContratoRecord,
  agendamentosRealizados: 2,
  examesProgramadosFuturos: 1,
});

assert.equal(processo.etapaAtual, "concluido");
assert.equal(processo.examesProgramadosFuturos, 1);
assert.equal(processo.concluidoComExamesFuturos, true);
assert.equal(processo.agendamentosRealizados, 3);

console.log("ok: exame-futuro-implantacao");
