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

function agCancelado(
  id: string,
  cliente: string,
  data: string,
  valor: number
): AgendamentoWithExames {
  return { ...ag(id, cliente, data, valor), status: "cancelado" };
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
assert.equal(result.resumo.valorEmitido, 50);
assert.equal(result.resumo.valorPago, 50);
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
  "referência com valor zero não deve aparecer sem fatura"
);

const faturaJulhoSemAgendamento = fatura(
  "f2",
  "Aluminio Firenze",
  "2026-07",
  "rascunho"
);
const julho = buildResumoClientesMes(
  ags,
  [...faturas, faturaJulhoSemAgendamento],
  "07/2026"
);
assert.ok(julho);
assert.equal(
  julho.rows.length,
  0,
  "fatura sem agendamentos válidos no mês não deve aparecer"
);

const faturaNecessitaSemAg = fatura(
  "f-club",
  "Club Coffee",
  "2026-06",
  "necessita_reemissao"
);
const clubCoffeeCancelado = buildResumoClientesMes(
  [agCancelado("club-1", "Club Coffee", "2026-06-12", 129)],
  [faturaNecessitaSemAg],
  "06/2026",
  "Club"
);
assert.ok(clubCoffeeCancelado);
assert.equal(
  clubCoffeeCancelado.rows.length,
  0,
  "cliente só com agendamento cancelado não deve aparecer"
);

const clubCoffeeParcial = buildResumoClientesMes(
  [
    agCancelado("club-1", "Club Coffee", "2026-06-12", 129),
    ag("club-2", "Club Coffee", "2026-06-18", 40),
  ],
  [faturaNecessitaSemAg],
  "06/2026",
  "Club"
);
assert.ok(clubCoffeeParcial);
assert.equal(clubCoffeeParcial.rows.length, 1);
assert.equal(clubCoffeeParcial.rows[0].qtdAgendamentos, 1);
assert.equal(clubCoffeeParcial.rows[0].qtdExames, 1);
assert.equal(clubCoffeeParcial.rows[0].valorTotal, 40);

const reemitidaAntiga = fatura("f-old", "Empresa X", "2026-06", "reemitida");
const emitidaNova = fatura("f-new", "Empresa X", "2026-06", "emitida");
const junhoMultiplas = buildResumoClientesMes(
  ags,
  [reemitidaAntiga, emitidaNova],
  "06/2026",
  "Empresa X"
);
assert.ok(junhoMultiplas);
assert.equal(junhoMultiplas.rows.length, 1);
assert.equal(junhoMultiplas.rows[0].fatura?.id, "f-new");
assert.equal(junhoMultiplas.resumo.valorEmitido, 50);
assert.equal(junhoMultiplas.resumo.valorPrevisto, 50);

const periodoCompleto = buildResumoClientesMes(
  ags,
  [...faturas, faturaJulhoSemAgendamento],
  ""
);
assert.ok(periodoCompleto);
assert.equal(periodoCompleto.rows.length, 1);
assert.equal(periodoCompleto.rows[0].fatura?.id, "f1");

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

assert.equal(
  deriveFaturaMesStatus(fatura("rasc", "Empresa R", "2026-06", "rascunho")),
  "aberta_emissao",
  "rascunho deve exibir como Aberta para emissão"
);

const faturaCanceladaComAg = fatura(
  "f-cancel",
  "Empresa Cancelada",
  "2026-06",
  "cancelada"
);
const depoisCancelada = buildResumoClientesMes(
  [ag("c-1", "Empresa Cancelada", "2026-06-10", 80)],
  [faturaCanceladaComAg],
  "06/2026"
);
assert.ok(depoisCancelada);
assert.equal(
  depoisCancelada.rows.length,
  1,
  "cliente com fatura cancelada + agendamentos não deve sumir da lista"
);
assert.equal(depoisCancelada.rows[0].status, "aberta_emissao");
assert.equal(depoisCancelada.rows[0].fatura, null);
assert.equal(depoisCancelada.rows[0].valorTotal, 80);

const faturaReaberta = fatura(
  "f-reab",
  "Empresa Reaberta",
  "2026-06",
  "rascunho"
);
const depoisReabrir = buildResumoClientesMes(
  [ag("r-1", "Empresa Reaberta", "2026-06-10", 90)],
  [faturaReaberta],
  "06/2026"
);
assert.ok(depoisReabrir);
assert.equal(depoisReabrir.rows.length, 1);
assert.equal(depoisReabrir.rows[0].status, "aberta_emissao");
assert.equal(depoisReabrir.rows[0].fatura?.id, "f-reab");
assert.equal(depoisReabrir.rows[0].valorTotal, 90);

// Fatura reaberta (rascunho) com total R$ 0,00 — some da listagem operacional
const faturaFanGames = fatura(
  "f-fan",
  "FAN GAMES",
  "2026-07",
  "rascunho"
);
const fanZerado = buildResumoClientesMes(
  [ag("fan-1", "FAN GAMES", "2026-07-10", 0)],
  [faturaFanGames],
  "07/2026"
);
assert.ok(fanZerado);
assert.equal(
  fanZerado.rows.length,
  0,
  "rascunho com total zero não deve aparecer na listagem operacional"
);
assert.equal(fanZerado.resumo.totalReferencias, 0);
assert.equal(fanZerado.resumo.valorPrevisto, 0);

// Mesmo rascunho volta a aparecer se surgir valor faturável
const fanComValor = buildResumoClientesMes(
  [
    ag("fan-1", "FAN GAMES", "2026-07-10", 0),
    ag("fan-2", "FAN GAMES", "2026-07-15", 40),
  ],
  [faturaFanGames],
  "07/2026"
);
assert.ok(fanComValor);
assert.equal(fanComValor.rows.length, 1);
assert.equal(fanComValor.rows[0].referenciaNome, "FAN GAMES");
assert.equal(fanComValor.rows[0].status, "aberta_emissao");
assert.equal(fanComValor.rows[0].fatura?.id, "f-fan");
assert.equal(fanComValor.rows[0].valorTotal, 40);

// Reaberta com valor reduzido, mas > 0 — permanece
const faturaReduzida = fatura(
  "f-red",
  "Empresa Reduzida",
  "2026-07",
  "rascunho"
);
const reduzida = buildResumoClientesMes(
  [ag("red-1", "Empresa Reduzida", "2026-07-10", 25)],
  [faturaReduzida],
  "07/2026"
);
assert.ok(reduzida);
assert.equal(reduzida.rows.length, 1);
assert.equal(reduzida.rows[0].valorTotal, 25);

console.log("test-fatura-mes-resumo: ok");
