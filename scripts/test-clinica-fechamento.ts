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

function porVencimento(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mes: string,
  clinicas: ReturnType<typeof config>[],
  extra: {
    semVencimento?: boolean;
    anoFechamento?: number;
    periodosRegistrados?: PeriodoRegistradoClinica[];
  } = {}
) {
  return buildResumoClinicasMes(agendamentos, faturas, mes, "", {
    porVencimento: true,
    clinicas,
    ...extra,
  });
}

const bc = config("BC WORK", null, null, "mes_seguinte", 30);
const exameBc = [ag("bc1", "BC WORK", "2026-10-15", 80)];
const outubroBc = porVencimento(exameBc, [], "10/2026", [bc]);
const novembroBc = porVencimento(exameBc, [], "11/2026", [bc]);
assert.ok(outubroBc && novembroBc);
assert.equal(outubroBc.rows.length, 0);
assert.equal(novembroBc.rows.length, 1);
assert.equal(novembroBc.rows[0]?.periodoInicio, "2026-10-01");
assert.equal(novembroBc.rows[0]?.periodoFim, "2026-10-31");
assert.equal(novembroBc.rows[0]?.dataFechamento, "2026-10-31");
assert.equal(novembroBc.rows[0]?.dataVencimento, "2026-11-30");
assert.equal(novembroBc.rows[0]?.mesFechamento, "10/2026");
assert.equal(novembroBc.rows[0]?.valorTotal, 80);

const mesmoMes = config("Alpha", null, null, "mesmo_mes", 10);
const novembroMesmo = porVencimento(
  [ag("m1", "Alpha", "2026-11-05", 50)],
  [],
  "11/2026",
  [mesmoMes]
);
const outubroMesmo = porVencimento(
  [ag("m1", "Alpha", "2026-11-05", 50)],
  [],
  "10/2026",
  [mesmoMes]
);
assert.ok(novembroMesmo && outubroMesmo);
assert.equal(outubroMesmo.rows.length, 0);
assert.equal(novembroMesmo.rows[0]?.periodoInicio, "2026-11-01");
assert.equal(novembroMesmo.rows[0]?.dataFechamento, "2026-11-30");
assert.equal(novembroMesmo.rows[0]?.dataVencimento, "2026-11-10");
assert.equal(novembroMesmo.rows[0]?.mesFechamento, "11/2026");

const virada = config("Delta", null, null, "mes_seguinte", 15);
const janeiroVenc = porVencimento(
  [ag("d1", "Delta", "2026-12-10", 60)],
  [],
  "01/2027",
  [virada]
);
const dezembroVenc = porVencimento(
  [ag("d1", "Delta", "2026-12-10", 60)],
  [],
  "12/2026",
  [virada]
);
assert.ok(janeiroVenc && dezembroVenc);
assert.equal(dezembroVenc.rows.length, 0);
assert.equal(janeiroVenc.rows[0]?.periodoInicio, "2026-12-01");
assert.equal(janeiroVenc.rows[0]?.periodoFim, "2026-12-31");
assert.equal(janeiroVenc.rows[0]?.dataVencimento, "2027-01-15");
assert.equal(janeiroVenc.rows[0]?.mesFechamento, "12/2026");

const ciclo20 = config("Gama", "dia_especifico", 20, "mesmo_mes", 10);
const nov20 = porVencimento(
  [ag("g1", "Gama", "2026-11-20", 30), ag("g2", "Gama", "2026-11-21", 90)],
  [],
  "11/2026",
  [ciclo20]
);
const dez20 = porVencimento(
  [ag("g1", "Gama", "2026-11-20", 30), ag("g2", "Gama", "2026-11-21", 90)],
  [],
  "12/2026",
  [ciclo20]
);
assert.ok(nov20 && dez20);
assert.equal(nov20.rows[0]?.periodoInicio, "2026-10-21");
assert.equal(nov20.rows[0]?.periodoFim, "2026-11-20");
assert.equal(nov20.rows[0]?.valorTotal, 30);
assert.equal(nov20.rows[0]?.dataVencimento, "2026-11-10");
assert.equal(dez20.rows[0]?.periodoInicio, "2026-11-21");
assert.equal(dez20.rows[0]?.valorTotal, 90);

const ciclo20Seguinte = config("Gama", "dia_especifico", 20, "mes_seguinte", 25);
const novSeguinte = porVencimento(
  [ag("g3", "Gama", "2026-10-20", 45)],
  [],
  "11/2026",
  [ciclo20Seguinte]
);
assert.ok(novSeguinte);
assert.equal(novSeguinte.rows[0]?.periodoInicio, "2026-09-21");
assert.equal(novSeguinte.rows[0]?.periodoFim, "2026-10-20");
assert.equal(novSeguinte.rows[0]?.dataVencimento, "2026-11-25");
assert.equal(novSeguinte.rows[0]?.mesFechamento, "10/2026");

const paga = fatura({
  id: "fat-paga",
  referencia_nome: "BC WORK",
  referencia_id: "id-BC WORK",
  mes_referencia: "2026-10",
  periodo_inicio: "2026-10-01",
  periodo_fim: "2026-10-31",
  data_fechamento: "2026-10-31",
  data_vencimento: "2026-11-30",
  data_pagamento: "2026-12-02",
  valor_total: 80,
  status: "emitida",
  pago: true,
});
const novembroPaga = porVencimento(
  [ag("bc1", "BC WORK", "2026-10-15", 200)],
  [paga],
  "11/2026",
  [bc]
);
const outubroPaga = porVencimento(
  [ag("bc1", "BC WORK", "2026-10-15", 200)],
  [paga],
  "10/2026",
  [bc]
);
assert.ok(novembroPaga && outubroPaga);
assert.equal(novembroPaga.rows.length, 1);
assert.equal(novembroPaga.rows[0]?.valorTotal, 80);
assert.equal(novembroPaga.rows[0]?.fatura?.id, "fat-paga");
assert.equal(novembroPaga.rows[0]?.mesFechamento, "10/2026");
assert.equal(outubroPaga.rows.length, 0);

const atrasada = fatura({
  id: "fat-atraso",
  referencia_nome: "BC WORK",
  referencia_id: "id-BC WORK",
  mes_referencia: "2026-10",
  periodo_inicio: "2026-10-01",
  periodo_fim: "2026-10-31",
  data_fechamento: "2026-10-31",
  data_vencimento: "2026-11-30",
  status: "vencida",
  pago: false,
  conferido_em: "2026-11-01",
  valor_total: 80,
});
const novembroAtraso = porVencimento([ag("bc1", "BC WORK", "2026-10-15", 200)], [atrasada], "11/2026", [bc]);
const dezembroAtraso = porVencimento([ag("bc1", "BC WORK", "2026-10-15", 200)], [atrasada], "12/2026", [bc]);
assert.ok(novembroAtraso && dezembroAtraso);
assert.equal(novembroAtraso.rows[0]?.fatura?.id, "fat-atraso");
assert.equal(novembroAtraso.rows[0]?.valorTotal, 80);
assert.equal(dezembroAtraso.rows.length, 0);

const semDia = config("Sem Dia", "dia_especifico", 20, null, null);
const semAba = porVencimento(
  [ag("s1", "Sem Dia", "2026-03-10", 12), ag("s2", "Sem Dia", "2026-10-05", 18)],
  [],
  "11/2026",
  [semDia],
  { semVencimento: true, anoFechamento: 2026 }
);
const semNoMes = porVencimento(
  [ag("s1", "Sem Dia", "2026-03-10", 12)],
  [],
  "03/2026",
  [semDia]
);
assert.ok(semAba && semNoMes);
assert.equal(semNoMes.rows.length, 0);
assert.equal(semAba.rows.length, 2);
assert.ok(semAba.rows.every((row) => row.dataVencimento == null));
const somaSem = semAba.rows.reduce((total, row) => total + row.valorTotal, 0);
assert.equal(somaSem, semAba.resumo.valorEmAberto);
assert.equal(somaSem, 30);
assert.equal(semNoMes.resumo.valorPrevisto, 0);

function assertCardsIguaisTabela(
  resultado: NonNullable<ReturnType<typeof porVencimento>>
) {
  const soma = resultado.rows.reduce((total, row) => total + row.valorTotal, 0);
  assert.equal(soma, resultado.resumo.valorPrevisto);
  assert.equal(soma, resultado.resumo.valorPago + resultado.resumo.valorEmAberto);
}

assertCardsIguaisTabela(novembroBc);
assertCardsIguaisTabela(novembroPaga);
assertCardsIguaisTabela(novembroAtraso);
assertCardsIguaisTabela(semAba);

const semData = fatura({
  id: "fat-sem",
  referencia_nome: "Sem Dia",
  referencia_id: "id-Sem Dia",
  mes_referencia: "2026-03",
  periodo_inicio: "2026-02-21",
  periodo_fim: "2026-03-20",
  data_fechamento: "2026-03-20",
  data_vencimento: "",
  status: "emitida",
  pago: false,
  valor_total: 12,
  conferido_em: "2026-03-21",
});
const semDataAba = porVencimento(
  [ag("s1", "Sem Dia", "2026-03-10", 99), ag("s2", "Sem Dia", "2026-10-05", 18)],
  [semData],
  "11/2026",
  [semDia],
  { semVencimento: true, anoFechamento: 2026 }
);
const semDataNoMes = porVencimento(
  [ag("s1", "Sem Dia", "2026-03-10", 99)],
  [semData],
  "03/2026",
  [semDia],
  {
    periodosRegistrados: [
      {
        faturaId: "fat-sem",
        numero: "CC-1",
        referenciaId: "id-Sem Dia",
        referenciaNome: "Sem Dia",
        mesReferencia: "2026-03",
        inicio: "2026-02-21",
        fim: "2026-03-20",
        status: "emitida",
      },
    ],
  }
);
assert.ok(semDataAba && semDataNoMes);
assert.equal(semDataNoMes.rows.length, 0);
const marçoSalvo = semDataAba.rows.find((row) => row.fatura?.id === "fat-sem");
assert.equal(marçoSalvo?.valorTotal, 12);
assert.equal(marçoSalvo?.dataVencimento, null);
assert.equal(marçoSalvo?.mesFechamento, "03/2026");
assert.equal(
  semDataAba.rows.filter((row) => row.mesFechamento === "03/2026").length,
  1
);

const salvaFora = fatura({
  id: "fat-fora",
  referencia_nome: "Alpha",
  referencia_id: "id-Alpha",
  mes_referencia: "2026-11",
  periodo_inicio: "2026-11-01",
  periodo_fim: "2026-11-30",
  data_fechamento: "2026-11-30",
  data_vencimento: "2026-12-10",
  valor_total: 50,
  pago: true,
  status: "emitida",
  data_pagamento: "2026-12-20",
});
const periodoFora = {
  faturaId: "fat-fora",
  numero: "CC-1",
  referenciaId: "id-Alpha",
  referenciaNome: "Alpha",
  mesReferencia: "2026-11",
  inicio: "2026-11-01",
  fim: "2026-11-30",
  status: "emitida",
};
const novembroFora = buildResumoClinicasMes(
  [ag("m1", "Alpha", "2026-11-05", 50)],
  [],
  "11/2026",
  "",
  {
    porVencimento: true,
    clinicas: [mesmoMes],
    periodosRegistrados: [periodoFora],
  }
);
const dezembroFora = buildResumoClinicasMes(
  [ag("m1", "Alpha", "2026-11-05", 50), ag("m2", "Alpha", "2026-12-05", 20)],
  [salvaFora],
  "12/2026",
  "",
  {
    porVencimento: true,
    clinicas: [mesmoMes],
    periodosRegistrados: [periodoFora],
  }
);
assert.ok(novembroFora && dezembroFora);
assert.equal(novembroFora.rows.length, 0);
assert.equal(
  dezembroFora.rows.filter((row) => row.fatura?.id === "fat-fora").length,
  1
);
assert.equal(
  dezembroFora.rows.find((row) => row.fatura?.id === "fat-fora")?.mesFechamento,
  "11/2026"
);
assert.equal(
  dezembroFora.rows.find((row) => row.fatura?.id === "fat-fora")?.valorTotal,
  50
);
assert.ok(
  dezembroFora.rows.some((row) => row.mesFechamento === "12/2026" && !row.fatura)
);
assertCardsIguaisTabela(dezembroFora);

console.log("test-clinica-fechamento: ok");
