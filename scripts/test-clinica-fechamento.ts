/**
 * Períodos de fechamento dos custos de clínicas.
 * Executar: npx tsx scripts/test-clinica-fechamento.ts
 */
import assert from "node:assert/strict";
import { buildResumoClinicasMes } from "../lib/fatura-mes-resumo";
import {
  dataVencimentoFechamento,
  periodoFechamentoClinica,
  validarAjustePeriodo,
  type ClinicaCicloConfig,
  type PeriodoRegistradoClinica,
} from "../lib/clinica-fechamento";
import type { AgendamentoWithExames, FaturaRecord } from "../lib/types";

function config(
  nome: string,
  apuracao: ClinicaCicloConfig["fechamentoApuracao"],
  dia: number | null,
  vencimentoMes: ClinicaCicloConfig["vencimentoMes"] = null,
  diaVencimento: number | null = 10
): ClinicaCicloConfig {
  return {
    id: `id-${nome}`,
    nomes: [nome],
    fechamentoApuracao: apuracao,
    diaFechamento: dia,
    vencimentoMes,
    diaVencimento,
  };
}

function ag(
  id: string,
  clinicaNome: string,
  data: string,
  custo: number
): AgendamentoWithExames {
  return {
    id,
    cliente_nome: "Empresa",
    clinica_nome: clinicaNome,
    data_agendamento: data,
    status: "agendado",
    colaborador: "Colab",
    responsavel: "Resp",
    aso: "Admissional",
    agendamento_exames: [
      {
        id: `${id}-ex`,
        agendamento_id: id,
        tipo_exame: "Audiometria",
        valor_cliente: 0,
        custo_clinica: custo,
      },
    ],
  } as AgendamentoWithExames;
}

function fatura(partial: Partial<FaturaRecord>): FaturaRecord {
  return {
    id: "fat-1",
    numero: "CC-1",
    tipo: "clinica",
    referencia_id: "id-Alpha",
    referencia_nome: "Alpha",
    periodo_inicio: "2026-10-21",
    periodo_fim: "2026-11-20",
    mes_referencia: "2026-11",
    data_emissao: "2026-11-20",
    data_vencimento: "2026-11-10",
    data_fechamento: "2026-11-20",
    valor_total: 80,
    total_exames: 1,
    total_agendamentos: 1,
    status: "emitida",
    gerado_por: "Teste",
    pago: true,
    data_pagamento: "2026-11-25",
    observacao_pagamento: null,
    comprovante_pagamento_path: "fat-1/comprovante.pdf",
    comprovante_pagamento_nome: "comprovante.pdf",
    conferido_em: "2026-11-21",
    conferido_por: "Teste",
    fatura_clinica_path: null,
    fatura_clinica_nome: null,
    fatura_clinica_tipo: null,
    fatura_clinica_tamanho: null,
    observacao_conferencia: null,
    conferencia_registrada_em: "2026-11-21",
    fatura_origem_id: null,
    fatura_substituta_id: null,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    ...partial,
  };
}

function periodo(ano: number, mes: number, apuracao: ClinicaCicloConfig["fechamentoApuracao"], dia: number | null) {
  return periodoFechamentoClinica({
    ano,
    mes,
    fechamentoApuracao: apuracao,
    diaFechamento: dia,
  });
}

const completo = periodo(2026, 11, null, null);
assert.equal(completo.inicio, "2026-11-01");
assert.equal(completo.fim, "2026-11-30");
assert.equal(completo.dataFechamento, "2026-11-30");

const dia20 = periodo(2026, 11, "dia_especifico", 20);
assert.equal(dia20.inicio, "2026-10-21");
assert.equal(dia20.fim, "2026-11-20");

const janeiro = periodo(2026, 1, "dia_especifico", 20);
assert.equal(janeiro.inicio, "2025-12-21");
assert.equal(janeiro.fim, "2026-01-20");

const abril31 = periodo(2026, 4, "dia_especifico", 31);
assert.equal(abril31.fim, "2026-04-30");
assert.equal(abril31.inicio, "2026-04-01");

const fevereiro = periodo(2026, 2, "dia_especifico", 31);
assert.equal(fevereiro.fim, "2026-02-28");
assert.equal(fevereiro.inicio, "2026-02-01");

const bissexto = periodo(2024, 2, "dia_especifico", 31);
assert.equal(bissexto.fim, "2024-02-29");
assert.equal(bissexto.inicio, "2024-02-01");

const marcoAposFevereiro = periodo(2026, 3, "dia_especifico", 31);
assert.equal(marcoAposFevereiro.inicio, "2026-03-01");
assert.equal(marcoAposFevereiro.fim, "2026-03-31");

assert.equal(
  dataVencimentoFechamento({
    diaVencimento: 15,
    anoFechamento: 2026,
    mesFechamento: 11,
    vencimentoMes: "mesmo_mes",
  })?.iso,
  "2026-11-15"
);
assert.equal(
  dataVencimentoFechamento({
    diaVencimento: 15,
    anoFechamento: 2026,
    mesFechamento: 11,
    vencimentoMes: "mes_seguinte",
  })?.iso,
  "2026-12-15"
);
assert.equal(
  dataVencimentoFechamento({
    diaVencimento: 15,
    anoFechamento: 2026,
    mesFechamento: 11,
    vencimentoMes: null,
  })?.iso,
  "2026-11-15"
);
assert.equal(
  dataVencimentoFechamento({
    diaVencimento: 31,
    anoFechamento: 2026,
    mesFechamento: 2,
    vencimentoMes: "mesmo_mes",
  })?.iso,
  "2026-02-28"
);

const config20 = config("Alpha", "dia_especifico", 20, "mesmo_mes", 10);
const examesLimite = [
  ag("a1", "Alpha", "2026-11-20", 40),
  ag("a2", "Alpha", "2026-11-21", 70),
];
const novembro = buildResumoClinicasMes(examesLimite, [], "11/2026", "", {
  porFechamento: true,
  clinicas: [config20],
});
assert.ok(novembro);
assert.equal(novembro.rows.length, 1);
assert.equal(novembro.rows[0]?.periodoInicio, "2026-10-21");
assert.equal(novembro.rows[0]?.periodoFim, "2026-11-20");
assert.equal(novembro.rows[0]?.valorTotal, 40);
assert.equal(novembro.rows[0]?.dataVencimento, "2026-11-10");

const dezembro = buildResumoClinicasMes(examesLimite, [], "12/2026", "", {
  porFechamento: true,
  clinicas: [config20],
});
assert.ok(dezembro);
assert.equal(dezembro.rows[0]?.periodoInicio, "2026-11-21");
assert.equal(dezembro.rows[0]?.periodoFim, "2026-12-20");
assert.equal(dezembro.rows[0]?.valorTotal, 70);
assert.equal(
  novembro.resumo.valorEmAberto + dezembro.resumo.valorEmAberto,
  110
);

const periodos: PeriodoRegistradoClinica[] = [
  {
    faturaId: "fat-nov",
    numero: "CC-11",
    referenciaId: "id-Alpha",
    referenciaNome: "Alpha",
    mesReferencia: "2026-11",
    inicio: "2026-10-21",
    fim: "2026-11-20",
    status: "rascunho",
  },
];
const conflito = validarAjustePeriodo({
  inicio: "2026-11-10",
  fim: "2026-12-20",
  motivo: "Acerto operacional",
  mesFechamento: "12/2026",
  clinicaId: "id-Alpha",
  referenciaNome: "Alpha",
  config: config20,
  periodos,
  examesNovos: [],
  examesVinculados: [],
});
assert.match(conflito ?? "", /sobrepõe/);

const semConflito = validarAjustePeriodo({
  inicio: "2026-11-21",
  fim: "2026-12-15",
  motivo: "Acerto operacional",
  mesFechamento: "12/2026",
  clinicaId: "id-Alpha",
  referenciaNome: "Alpha",
  config: config20,
  periodos,
  examesNovos: [],
  examesVinculados: [],
});
assert.equal(semConflito, null);

const exameDuplicado = validarAjustePeriodo({
  inicio: "2026-11-21",
  fim: "2026-12-15",
  motivo: "Acerto operacional",
  mesFechamento: "12/2026",
  faturaIdAtual: "fat-dez",
  clinicaId: "id-Alpha",
  referenciaNome: "Alpha",
  config: config20,
  periodos,
  examesNovos: [
    {
      faturaId: "fat-dez",
      agendamentoId: "a9",
      exameNome: "Audiometria",
      data: "2026-12-01",
      numero: null,
    },
  ],
  examesVinculados: [
    {
      faturaId: "fat-outra",
      agendamentoId: "a9",
      exameNome: "Audiometria",
      data: "2026-12-01",
      numero: "CC-9",
    },
  ],
});
assert.match(exameDuplicado ?? "", /já está vinculado/);

const invertido = validarAjustePeriodo({
  inicio: "2026-12-20",
  fim: "2026-12-01",
  motivo: "Acerto",
  mesFechamento: "12/2026",
  referenciaNome: "Alpha",
  config: config20,
  periodos: [],
  examesNovos: [],
  examesVinculados: [],
});
assert.match(invertido ?? "", /posterior/);

const conferida = fatura({});
const aposMudanca = buildResumoClinicasMes(
  [ag("a1", "Alpha", "2026-11-20", 200)],
  [conferida],
  "11/2026",
  "",
  {
    porFechamento: true,
    clinicas: [config("Alpha", "mes_completo", null, "mes_seguinte", 5)],
  }
);
assert.ok(aposMudanca);
assert.equal(aposMudanca.rows[0]?.valorTotal, 80);
assert.equal(aposMudanca.rows[0]?.periodoInicio, "2026-10-21");
assert.equal(aposMudanca.rows[0]?.periodoFim, "2026-11-20");
assert.equal(aposMudanca.rows[0]?.dataVencimento, "2026-11-10");
assert.equal(aposMudanca.resumo.valorPago, 80);
assert.equal(aposMudanca.resumo.valorEmAberto, 0);

const semAgendamentos = buildResumoClinicasMes([], [conferida], "11/2026", "", {
  porFechamento: true,
  clinicas: [config("Alpha", "mes_completo", null)],
});
assert.ok(semAgendamentos);
assert.equal(semAgendamentos.rows[0]?.valorTotal, 80);
assert.equal(semAgendamentos.rows[0]?.periodoInicio, "2026-10-21");

const rascunho = fatura({
  status: "rascunho",
  pago: false,
  valor_total: 999,
  periodo_inicio: "2026-10-21",
  periodo_fim: "2026-11-20",
});
const abertoAjustado = buildResumoClinicasMes(
  [ag("a1", "Alpha", "2026-11-20", 40)],
  [rascunho],
  "11/2026",
  "",
  {
    porFechamento: true,
    clinicas: [config("Alpha", "mes_completo", null)],
  }
);
assert.ok(abertoAjustado);
assert.equal(abertoAjustado.rows[0]?.valorTotal, 40);
assert.equal(abertoAjustado.rows[0]?.periodoInicio, "2026-10-21");
assert.equal(abertoAjustado.resumo.valorEmAberto, 40);

const dois = buildResumoClinicasMes(
  [ag("b1", "Beta", "2026-11-02", 25), ag("c1", "Gama", "2026-11-03", 15)],
  [],
  "11/2026",
  "",
  { porFechamento: true, clinicas: [config("Beta", null, null, null, 8)] }
);
assert.ok(dois);
const somaLinhas = dois.rows.reduce((total, row) => total + row.valorTotal, 0);
assert.equal(somaLinhas, dois.resumo.valorEmAberto);
assert.equal(
  dois.resumo.totalExames,
  dois.rows.reduce((total, row) => total + row.qtdExames, 0)
);
assert.equal(
  dois.resumo.totalAgendamentos,
  dois.rows.reduce((total, row) => total + row.qtdAgendamentos, 0)
);
assert.equal(dois.resumo.valorPrevisto, somaLinhas);

console.log("test-clinica-fechamento: ok");
