/** Smoke: créditos ASO em aberto — progresso, zero seletivo e fatura. */

import assert from "node:assert/strict";
import { buildContratoAgendamentoContagem } from "../lib/contrato-agendamentos";
import {
  applyValoresCreditoContratoNosExamesPayload,
  creditoContaNoProgresso,
  examesCobertosPeloCreditoContrato,
  isCreditoUtilizavel,
  MOTIVO_ASO_INCLUSO_CONTRATO,
} from "../lib/contrato-creditos-aso";
import { isExameFaturavel } from "../lib/fatura-elegibilidade";
import { buildImplantacaoProcesso } from "../lib/implantacao-clientes";
import { isAgendamentosEtapaConcluida } from "../lib/orcamento-etapas";
import type { OrcamentoRecord } from "../lib/orcamento-types";
import type { ExameFormItem } from "../lib/types";

// --- Contagem: 1 ag + 1 futuro + 1 aberto = 3 / 100%
const c = buildContratoAgendamentoContagem(3, 3, 0, {
  agendados: 1,
  programadosFuturos: 1,
  emAberto: 1,
});
assert.equal(c.previstos, 3);
assert.equal(c.agendados, 1);
assert.equal(c.programadosFuturos, 1);
assert.equal(c.emAberto, 1);
assert.equal(c.comprometidos, 3);
assert.equal(c.percentual, 100);
assert.equal(c.concluido, true);

// Após uso do crédito: 2 ag + 1 futuro + 0 aberto = 3
const depois = buildContratoAgendamentoContagem(3, 3, 0, {
  agendados: 2,
  programadosFuturos: 1,
  emAberto: 0,
});
assert.equal(depois.comprometidos, 3);
assert.equal(depois.concluido, true);

assert.equal(creditoContaNoProgresso("disponivel"), true);
assert.equal(creditoContaNoProgresso("utilizado"), false);
assert.equal(creditoContaNoProgresso("removido"), false);

assert.equal(
  isCreditoUtilizavel(
    { status: "disponivel", valido_ate: "2027-07-31" },
    "2026-08-06"
  ),
  true
);
assert.equal(
  isCreditoUtilizavel(
    { status: "disponivel", valido_ate: "2026-07-31" },
    "2026-08-06"
  ),
  false
);

// Zero seletivo: Clínico + cargo; adicional permanece
const exams: ExameFormItem[] = [
  {
    id: "1",
    exame_id: "a",
    tipo_exame: "Clínico",
    valor_cliente: "100,00",
    custo_clinica: "40,00",
    lucro: "60,00",
    aviso: "",
    precoAutomatico: true,
  },
  {
    id: "2",
    exame_id: "b",
    tipo_exame: "Audiometria",
    valor_cliente: "50,00",
    custo_clinica: "20,00",
    lucro: "30,00",
    aviso: "",
    precoAutomatico: true,
  },
  {
    id: "3",
    exame_id: "c",
    tipo_exame: "Hemograma",
    valor_cliente: "80,00",
    custo_clinica: "30,00",
    lucro: "50,00",
    aviso: "",
    precoAutomatico: false,
  },
];

const cobertos = examesCobertosPeloCreditoContrato(exams, ["Audiometria"]);
assert.ok(cobertos.has("clinico"));
assert.ok(cobertos.has("audiometria"));
assert.ok(!cobertos.has("hemograma"));

const payload = applyValoresCreditoContratoNosExamesPayload(
  exams.map((e) => ({
    tipo_exame: e.tipo_exame,
    valor_cliente: Number(String(e.valor_cliente).replace(",", ".")),
    custo_clinica: Number(String(e.custo_clinica).replace(",", ".")),
    motivo_valor_zero: null as string | null,
    incluso_credito_contrato: false,
  })),
  ["Audiometria"]
);
assert.equal(payload[0].valor_cliente, 0);
assert.equal(payload[0].motivo_valor_zero, MOTIVO_ASO_INCLUSO_CONTRATO);
assert.equal(payload[0].incluso_credito_contrato, true);
assert.equal(payload[1].incluso_credito_contrato, true);
assert.equal(payload[2].valor_cliente, 80);
assert.equal(payload[2].incluso_credito_contrato, false);

assert.equal(
  isExameFaturavel({
    status: "agendado",
    valor: 0,
    inclusoCreditoContrato: true,
  }),
  false
);
assert.equal(
  isExameFaturavel({
    status: "agendado",
    valor: 80,
    inclusoCreditoContrato: false,
  }),
  true
);

// Implantação conclui com 1+1+1
const orcamento = {
  id: "o1",
  numero: "ORC-2026-0015",
  status: "aprovado",
  cliente_nome: "J FERREIRA",
  responsavel: "Admin",
} as OrcamentoRecord;

const processo = buildImplantacaoProcesso({
  orcamento,
  aprovacao: {
    quantidade_colaboradores: 3,
    visita_tecnica_necessaria: false,
    visita_tecnica_salva_em: "2026-08-01",
  } as never,
  contrato: {
    id: "c1",
    numero: "CTR-2026-0015",
    quantidade_colaboradores: 3,
    status: "ativo",
  } as never,
  agendamentosRealizados: 1,
  examesProgramadosFuturos: 1,
  asosContratuaisEmAberto: 1,
});
assert.equal(processo.agendamentosRealizados, 3);
assert.equal(processo.asosContratuaisEmAberto, 1);
assert.equal(
  isAgendamentosEtapaConcluida(processo.aprovacao, {
    quantidadeContratada: 3,
    agendamentosRealizados: 3,
  }),
  true
);

console.log("test-contrato-creditos-aso: OK");
