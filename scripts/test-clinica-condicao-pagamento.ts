/**
 * Condição de pagamento da clínica no fechamento mensal.
 * Executar: npx tsx scripts/test-clinica-condicao-pagamento.ts
 */
import assert from "node:assert/strict";
import {
  condicaoPagamentoClinicaEfetiva,
  filtrarAgendamentosFechamentoMensalClinica,
  pagamentoClinicaAvista,
  rotuloCondicaoPagamentoClinica,
} from "../lib/clinica-condicao-pagamento";
import { getEmptyClinicaForm } from "../lib/clinica-defaults";
import {
  clinicaToFormValues,
  formValuesToClinicaInsert,
} from "../lib/clinica-mappers";
import {
  buildResumoClientesMes,
  buildResumoClinicasMes,
} from "../lib/fatura-mes-resumo";
import type { ClinicaCicloConfig } from "../lib/clinica-fechamento";
import type {
  AgendamentoWithExames,
  ClinicaRecord,
  FaturaRecord,
} from "../lib/types";

assert.equal(condicaoPagamentoClinicaEfetiva(null), "fechamento_mensal");
assert.equal(condicaoPagamentoClinicaEfetiva(undefined), "fechamento_mensal");
assert.equal(condicaoPagamentoClinicaEfetiva("fechamento_mensal"), "fechamento_mensal");
assert.equal(condicaoPagamentoClinicaEfetiva("a_vista"), "a_vista");
assert.equal(pagamentoClinicaAvista("VISTA CLIN"), false);
assert.equal(rotuloCondicaoPagamentoClinica(null), "Fechamento mensal");
assert.equal(rotuloCondicaoPagamentoClinica("a_vista"), "À vista");

const vazio = getEmptyClinicaForm();
assert.equal(vazio.condicao_pagamento, "fechamento_mensal");
const gravado = formValuesToClinicaInsert({
  ...vazio,
  razao_social: "Clinica Mensal",
  nome_fantasia: "Clinica Mensal",
  condicao_pagamento: "a_vista",
});
assert.equal(gravado.condicao_pagamento, "a_vista");
const reaberto = clinicaToFormValues({
  ...gravado,
  id: "c1",
  condicao_pagamento: "fechamento_mensal",
} as ClinicaRecord);
assert.equal(reaberto.condicao_pagamento, "fechamento_mensal");

function config(nome: string, diaVencimento: number | null): ClinicaCicloConfig {
  return {
    id: `id-${nome}`,
    nomes: [nome],
    fechamentoApuracao: null,
    diaFechamento: null,
    vencimentoMes: null,
    diaVencimento,
  };
}

function ag(
  id: string,
  clinicaNome: string,
  data: string,
  custo: number,
  condicao: "fechamento_mensal" | "a_vista" | null,
  valorCliente = custo
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
    condicao_pagamento_clinica: condicao,
    agendamento_exames: [
      {
        id: `${id}-ex`,
        agendamento_id: id,
        tipo_exame: "Audiometria",
        valor_cliente: valorCliente,
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
    referencia_id: "id-Mista",
    referencia_nome: "Mista",
    periodo_inicio: "2026-10-01",
    periodo_fim: "2026-10-31",
    mes_referencia: "2026-10",
    data_emissao: "2026-10-31",
    data_vencimento: "2026-10-10",
    data_fechamento: "2026-10-31",
    valor_total: 80,
    total_exames: 1,
    total_agendamentos: 1,
    status: "emitida",
    gerado_por: "Teste",
    pago: false,
    data_pagamento: null,
    observacao_pagamento: null,
    comprovante_pagamento_path: "fat-1/comprovante.pdf",
    comprovante_pagamento_nome: "comprovante.pdf",
    conferido_em: "2026-11-02",
    conferido_por: "Teste",
    fatura_clinica_path: "fat-1/fatura.pdf",
    fatura_clinica_nome: "fatura.pdf",
    fatura_clinica_tipo: "application/pdf",
    fatura_clinica_tamanho: 1200,
    observacao_conferencia: null,
    conferencia_registrada_em: "2026-11-02",
    fatura_origem_id: null,
    fatura_substituta_id: null,
    created_at: "2026-10-31T00:00:00Z",
    updated_at: "2026-10-31T00:00:00Z",
    ...partial,
  };
}

function resumo(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mes: string,
  clinicas: ClinicaCicloConfig[],
  semVencimento = false
) {
  return buildResumoClinicasMes(agendamentos, faturas, mes, "", {
    porVencimento: true,
    semVencimento,
    anoFechamento: 2026,
    clinicas,
  });
}

const mensal = config("Mensal", 10);
const vistaNome = config("Vista Clin", 10);
const avista = config("Pagto Vista", 10);
const semDia = config("Sem Dia", null);
const mista = config("Mista", 10);

const agMensal = ag("m1", "Mensal", "2026-10-15", 40, "fechamento_mensal");
const agLegado = ag("m2", "Mensal", "2026-10-16", 20, null);
const agNomeVista = ag("v1", "Vista Clin", "2026-10-12", 30, "fechamento_mensal");
const agAvista = ag("a1", "Pagto Vista", "2026-10-18", 70, "a_vista", 90);
const agSemDiaMensal = ag("s1", "Sem Dia", "2026-03-10", 12, null);
const agSemDiaAvista = ag("s2", "Sem Dia", "2026-10-05", 18, "a_vista");

const outubro = resumo(
  [agMensal, agLegado, agNomeVista, agAvista],
  [],
  "10/2026",
  [mensal, vistaNome, avista]
);
assert.ok(outubro);
assert.deepEqual(
  outubro.rows.map((row) => row.referenciaNome).sort(),
  ["Mensal", "Vista Clin"]
);
const linhaMensal = outubro.rows.find((row) => row.referenciaNome === "Mensal");
assert.ok(linhaMensal);
assert.equal(linhaMensal.qtdAgendamentos, 2);
assert.equal(linhaMensal.qtdExames, 2);
assert.equal(linhaMensal.valorTotal, 60);
assert.equal(outubro.resumo.totalReferencias, 2);
assert.equal(outubro.resumo.totalAgendamentos, 3);
assert.equal(outubro.resumo.totalExames, 3);
assert.equal(outubro.resumo.valorPrevisto, 90);
assert.equal(outubro.resumo.valorEmAberto, 90);
assert.equal(
  filtrarAgendamentosFechamentoMensalClinica([agMensal, agAvista]).length,
  1
);

const semVencimento = resumo(
  [agSemDiaMensal, agSemDiaAvista],
  [],
  "11/2026",
  [semDia],
  true
);
assert.ok(semVencimento);
assert.equal(semVencimento.rows.length, 1);
assert.equal(semVencimento.rows[0]?.valorTotal, 12);
assert.equal(semVencimento.rows[0]?.qtdAgendamentos, 1);
assert.equal(semVencimento.resumo.totalAgendamentos, 1);
assert.equal(semVencimento.resumo.totalExames, 1);
assert.equal(semVencimento.resumo.valorPrevisto, 12);
assert.equal(semVencimento.resumo.totalReferencias, 1);

const anterior = ag("ant", "Mista", "2026-10-08", 80, "fechamento_mensal", 100);
const novoAvista = ag("novo", "Mista", "2026-10-20", 50, "a_vista", 75);
const aberta = resumo([anterior, novoAvista], [], "10/2026", [mista]);
assert.ok(aberta);
assert.equal(aberta.rows.length, 1);
assert.equal(aberta.rows[0]?.qtdAgendamentos, 1);
assert.equal(aberta.rows[0]?.qtdExames, 1);
assert.equal(aberta.rows[0]?.valorTotal, 80);
assert.equal(aberta.resumo.valorPrevisto, 80);
assert.equal(aberta.resumo.totalAgendamentos, 1);

const registrada = fatura({});
const comFatura = resumo([anterior, novoAvista], [registrada], "10/2026", [mista]);
assert.ok(comFatura);
assert.equal(comFatura.rows.length, 1);
assert.equal(comFatura.rows[0]?.fatura?.id, "fat-1");
assert.equal(comFatura.rows[0]?.fatura?.valor_total, 80);
assert.equal(comFatura.rows[0]?.fatura?.data_vencimento, "2026-10-10");
assert.equal(comFatura.rows[0]?.fatura?.comprovante_pagamento_path, "fat-1/comprovante.pdf");
assert.equal(comFatura.rows[0]?.fatura?.fatura_clinica_path, "fat-1/fatura.pdf");
assert.equal(comFatura.rows[0]?.valorTotal, 80);
assert.equal(comFatura.resumo.valorPago, 80);

const soNovo = resumo([novoAvista], [], "10/2026", [mista]);
assert.ok(soNovo);
assert.equal(soNovo.rows.length, 0);
assert.equal(soNovo.resumo.totalReferencias, 0);
assert.equal(soNovo.resumo.totalAgendamentos, 0);
assert.equal(soNovo.resumo.totalExames, 0);
assert.equal(soNovo.resumo.valorPrevisto, 0);
assert.equal(soNovo.resumo.valorEmAberto, 0);
assert.equal(soNovo.resumo.valorPago, 0);

const clientes = buildResumoClientesMes([agAvista, novoAvista], [], "10/2026");
assert.ok(clientes);
assert.equal(clientes.rows.length, 1);
assert.equal(clientes.rows[0]?.valorTotal, 165);
assert.equal(clientes.resumo.totalAgendamentos, 2);

console.log("test-clinica-condicao-pagamento: ok");
