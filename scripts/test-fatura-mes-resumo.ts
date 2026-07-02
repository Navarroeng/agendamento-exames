import assert from "node:assert/strict";
import {
  buildResumoClientesMes,
  buildResumoClinicasMes,
  deriveFaturaMesStatus,
  findFaturaReferenciaMes,
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
    comprovante_pagamento_path: pago ? `${id}/comprovante.pdf` : null,
    comprovante_pagamento_nome: pago ? "comprovante.pdf" : null,
    fatura_origem_id: null,
    fatura_substituta_id: null,
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
  result.rows.map((r) => r.referenciaNome),
  ["Empresa X", "Mil Bolhas"]
);

const mil = result.rows.find((r) => r.referenciaNome === "Mil Bolhas");
assert.ok(mil);
assert.equal(mil.qtdAgendamentos, 2);
assert.equal(mil.qtdExames, 2);
assert.equal(mil.valorTotal, 200);
assert.equal(mil.status, "aberta_emissao");

const emp = result.rows.find((r) => r.referenciaNome === "Empresa X");
assert.ok(emp);
assert.equal(emp.status, "paga");

assert.equal(result.resumo.totalReferencias, 2);
assert.equal(result.resumo.totalAgendamentos, 3);
assert.equal(result.resumo.totalExames, 3);
assert.equal(result.resumo.valorPrevisto, 250);
assert.equal(result.resumo.valorEmitido, 100);
assert.equal(result.resumo.valorPago, 100);
assert.equal(result.resumo.valorEmAberto, 0);

assert.equal(deriveFaturaMesStatus(null), "aberta_emissao");
assert.equal(
  deriveFaturaMesStatus(fatura("x", "A", "2026-06", "emitida", false)),
  "emitida"
);

assert.equal(
  findFaturaReferenciaMes(faturas, "cliente", "empresa x", "06/2026")?.id,
  "f1"
);

const filtered = buildResumoClientesMes(ags, faturas, "06/2026", "Mil");
assert.ok(filtered);
assert.equal(filtered.rows.length, 1);
assert.equal(filtered.rows[0].referenciaNome, "Mil Bolhas");

assert.ok(
  !result.rows.some((r) => r.referenciaNome === "Empresa Zerada"),
  "referência com valor zero não deve aparecer"
);
assert.equal(result.resumo.totalAgendamentos, 3);
assert.equal(result.resumo.totalExames, 3);

const agsClinica = [
  ag("10", "Cliente A", "2026-06-10", 0),
  ag("11", "Cliente B", "2026-06-12", 0),
];
agsClinica[0].clinica_nome = "Clínica Alpha";
agsClinica[1].clinica_nome = "Clínica Beta";
agsClinica[0].agendamento_exames![0].custo_clinica = 40;
agsClinica[1].agendamento_exames![0].custo_clinica = 60;

const resumoClinica = buildResumoClinicasMes(agsClinica, [], "06/2026");
assert.ok(resumoClinica);
assert.equal(resumoClinica.rows.length, 2);
assert.deepEqual(
  resumoClinica.rows.map((r) => r.referenciaNome),
  ["Clínica Alpha", "Clínica Beta"]
);
assert.equal(resumoClinica.resumo.valorPrevisto, 100);

const periodoCompleto = buildResumoClientesMes(ags, faturas, "");
assert.ok(periodoCompleto);
assert.equal(periodoCompleto.rows.length, 2);
assert.ok(
  periodoCompleto.rows.every((r) => r.periodoLabel === "Todo o período")
);

console.log("test-fatura-mes-resumo: ok");
