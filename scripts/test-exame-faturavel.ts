/** Smoke: regra única isExameFaturavel e listagem de Faturas Clientes. */

import assert from "node:assert/strict";
import {
  FATURA_VALOR_MINIMO,
  isExameFaturavel,
  isValorTotalFaturavel,
} from "../lib/fatura-elegibilidade";
import { buildFaturaItensFromAgendamentos } from "../lib/fatura-mappers";
import { buildResumoClientesMes } from "../lib/fatura-mes-resumo";
import type { AgendamentoWithExames, FaturaRecord } from "../lib/types";

assert.equal(FATURA_VALOR_MINIMO, 1);

// 1–5: valores limítrofes
assert.equal(isExameFaturavel({ status: "agendado", valor: 0 }), false);
assert.equal(isExameFaturavel({ status: "agendado", valor: 0.01 }), false);
assert.equal(isExameFaturavel({ status: "agendado", valor: 0.99 }), false);
assert.equal(isExameFaturavel({ status: "agendado", valor: 1 }), true);
assert.equal(isExameFaturavel({ status: "agendado", valor: 100 }), true);

// 6: cancelado com valor alto
assert.equal(isExameFaturavel({ status: "cancelado", valor: 200 }), false);
assert.equal(isExameFaturavel({ status: "Cancelado", valor: 200 }), false);
assert.equal(isExameFaturavel({ status: "aso_retido", valor: 1 }), true);

assert.equal(isValorTotalFaturavel(0), false);
assert.equal(isValorTotalFaturavel(0.99), false);
assert.equal(isValorTotalFaturavel(1), true);

function ag(
  id: string,
  cliente: string,
  data: string,
  valor: number,
  status: string = "agendado"
): AgendamentoWithExames {
  return {
    id,
    cliente_nome: cliente,
    data_agendamento: data,
    status,
    colaborador: "Colab",
    clinica_nome: "Clínica A",
    responsavel: "Resp",
    aso: "Admissional",
    agendamento_exames: [
      {
        id: `${id}-e1`,
        agendamento_id: id,
        tipo_exame: "Clínico",
        valor_cliente: valor,
        custo_clinica: 0,
      },
    ],
  } as AgendamentoWithExames;
}

function fatura(
  id: string,
  cliente: string,
  mes: string,
  status: FaturaRecord["status"]
): FaturaRecord {
  return {
    id,
    numero: `FAT-${id}`,
    tipo: "cliente",
    referencia_id: null,
    referencia_nome: cliente,
    periodo_inicio: `${mes}-01`,
    periodo_fim: `${mes}-30`,
    mes_referencia: mes,
    data_emissao: status === "emitida" ? `${mes}-05` : null,
    data_vencimento: `${mes}-15`,
    valor_total: 100,
    total_exames: 1,
    status,
    gerado_por: "Teste",
    pago: false,
    data_pagamento: null,
    observacao_pagamento: null,
    comprovante_pagamento_path: null,
    comprovante_pagamento_nome: null,
    conferido_em: null,
    conferido_por: null,
    fatura_clinica_path: null,
    fatura_clinica_nome: null,
    fatura_clinica_tipo: null,
    fatura_clinica_tamanho: null,
    observacao_conferencia: null,
    conferencia_registrada_em: null,
    fatura_origem_id: null,
    fatura_substituta_id: null,
    created_at: "",
    updated_at: "",
  };
}

// Itens da fatura: 0,99 fora; 1,00 e 100 dentro; cancelado fora
const itens = buildFaturaItensFromAgendamentos(
  [
    ag("a0", "ACME", "2026-08-01", 0),
    ag("a001", "ACME", "2026-08-01", 0.01),
    ag("a099", "ACME", "2026-08-01", 0.99),
    ag("a1", "ACME", "2026-08-02", 1),
    ag("a100", "ACME", "2026-08-03", 100),
    ag("a200", "ACME", "2026-08-04", 200, "cancelado"),
  ],
  "cliente"
);
assert.equal(itens.length, 2);
assert.deepEqual(
  itens.map((i) => i.valor_unitario).sort((a, b) => a - b),
  [1, 100]
);

// 7: só cancelados
const soCancelados = buildResumoClientesMes(
  [ag("c1", "Só Cancelados", "2026-08-10", 200, "cancelado")],
  [],
  "08/2026"
);
assert.ok(soCancelados);
assert.equal(soCancelados.rows.length, 0);

// 8: só < R$ 1,00
const soBaixos = buildResumoClientesMes(
  [
    ag("b1", "Só Baixos", "2026-08-10", 0),
    ag("b2", "Só Baixos", "2026-08-11", 0.5),
    ag("b3", "Só Baixos", "2026-08-12", 0.99),
  ],
  [],
  "08/2026"
);
assert.ok(soBaixos);
assert.equal(soBaixos.rows.length, 0);

// 9: cancelados + 0,01
const mistosZerados = buildResumoClientesMes(
  [
    ag("m1", "Mistos", "2026-08-10", 200, "cancelado"),
    ag("m2", "Mistos", "2026-08-11", 0.01),
  ],
  [],
  "08/2026"
);
assert.ok(mistosZerados);
assert.equal(mistosZerados.rows.length, 0);

// Empresa com R$ 1,00 aparece
const comUmReal = buildResumoClientesMes(
  [ag("u1", "Com Um Real", "2026-08-10", 1)],
  [],
  "08/2026"
);
assert.ok(comUmReal);
assert.equal(comUmReal.rows.length, 1);
assert.equal(comUmReal.rows[0].valorTotal, 1);
assert.equal(comUmReal.rows[0].qtdExames, 1);
assert.equal(comUmReal.rows[0].status, "aberta_emissao");

// 10: reabertura + valores não faturáveis — some da listagem; histórico no banco
const reaberta = fatura("f-reab", "Empresa Reaberta", "2026-08", "rascunho");
const aposReabrirZerada = buildResumoClientesMes(
  [
    ag("r1", "Empresa Reaberta", "2026-08-10", 0.5),
    ag("r2", "Empresa Reaberta", "2026-08-11", 150, "cancelado"),
  ],
  [reaberta],
  "08/2026"
);
assert.ok(aposReabrirZerada);
assert.equal(
  aposReabrirZerada.rows.length,
  0,
  "reaberta sem exames faturáveis não deve aparecer"
);

// Agendamento misto: um exame faturável e outro não
const mistoExames = {
  ...ag("mix", "Misto Exames", "2026-08-10", 100),
  agendamento_exames: [
    {
      id: "mix-e1",
      agendamento_id: "mix",
      tipo_exame: "Clínico",
      valor_cliente: 0.5,
      custo_clinica: 0,
    },
    {
      id: "mix-e2",
      agendamento_id: "mix",
      tipo_exame: "Audiometria",
      valor_cliente: 80,
      custo_clinica: 0,
    },
  ],
} as AgendamentoWithExames;
const itensMistos = buildFaturaItensFromAgendamentos([mistoExames], "cliente");
assert.equal(itensMistos.length, 1);
assert.equal(itensMistos[0].valor_unitario, 80);

console.log("test-exame-faturavel: ok");
