import assert from "node:assert/strict";
import {
  buildResumoClientesMes,
  deriveClienteMesStatus,
  findFaturaClienteMes,
} from "../lib/fatura-mes-resumo";
import type { AgendamentoWithExames, FaturaRecord } from "../lib/types";

function ag(
  id: string,
  cliente: string,
  data: string,
  valor: number
): AgendamentoWithExames {
  return {
    id,
    cliente_nome: cliente,
    data_agendamento: data,
    status: "agendado",
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
  status: FaturaRecord["status"],
  pago = false
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
    pago,
    data_pagamento: pago ? `${mes}-20` : null,
    observacao_pagamento: null,
    created_at: "",
    updated_at: "",
  };
}

const ags = [
  ag("1", "Mil Bolhas", "2026-06-10", 80),
  ag("2", "Mil Bolhas", "2026-06-15", 120),
  ag("3", "Empresa X", "2026-06-05", 50),
  ag("4", "Empresa Zerada", "2026-06-08", 0),
];

const faturas = [
  fatura("f1", "Empresa X", "2026-06", "emitida", true),
];

const result = buildResumoClientesMes(ags, faturas, "06/2026");
assert.ok(result);
assert.equal(result.rows.length, 2);
assert.deepEqual(
  result.rows.map((r) => r.clienteNome),
  ["Empresa X", "Mil Bolhas"]
);

const mil = result.rows.find((r) => r.clienteNome === "Mil Bolhas");
assert.ok(mil);
assert.equal(mil.qtdAgendamentos, 2);
assert.equal(mil.qtdExames, 2);
assert.equal(mil.valorTotal, 200);
assert.equal(mil.status, "aberta_emissao");

const emp = result.rows.find((r) => r.clienteNome === "Empresa X");
assert.ok(emp);
assert.equal(emp.status, "paga");

assert.equal(result.resumo.totalClientes, 2);
assert.equal(result.resumo.totalAgendamentos, 3);
assert.equal(result.resumo.totalExames, 3);
assert.equal(result.resumo.valorPrevisto, 250);
assert.equal(result.resumo.valorEmitido, 100);
assert.equal(result.resumo.valorPago, 100);
assert.equal(result.resumo.valorEmAberto, 0);

assert.equal(deriveClienteMesStatus(null), "aberta_emissao");
assert.equal(
  deriveClienteMesStatus(fatura("x", "A", "2026-06", "emitida", false)),
  "emitida"
);

assert.equal(
  findFaturaClienteMes(faturas, "empresa x", "06/2026")?.id,
  "f1"
);

const filtered = buildResumoClientesMes(ags, faturas, "06/2026", "Mil");
assert.ok(filtered);
assert.equal(filtered.rows.length, 1);
assert.equal(filtered.rows[0].clienteNome, "Mil Bolhas");

assert.ok(
  !result.rows.some((r) => r.clienteNome === "Empresa Zerada"),
  "cliente com valor zero não deve aparecer"
);
assert.equal(result.resumo.totalAgendamentos, 3);
assert.equal(result.resumo.totalExames, 3);

console.log("test-fatura-mes-resumo: ok");
