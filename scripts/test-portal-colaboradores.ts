import assert from "node:assert/strict";
import {
  calcPortalColaboradoresResumo,
  consolidarPortalColaboradores,
  filtrarPortalColaboradores,
  mascararCpfPortal,
} from "../lib/portal-colaboradores";

const CPF_A = "52998224725";
const CPF_B = "39053344705";
const CPF_C = "11144477735";

assert.equal(mascararCpfPortal(CPF_A), "***.***.***-25");

// Lista implantação → Ativo
{
  const linhas = consolidarPortalColaboradores({
    vagas: [
      {
        colaborador: "MARIA SILVA",
        colaborador_cpf: CPF_A,
        cargo_nome: "Auxiliar Administrativo",
      },
    ],
    agendamentos: [],
  });
  assert.equal(linhas[0].situacao, "ativo");
}

// Novo Admissional agendado → Admissional em andamento
{
  const linhas = consolidarPortalColaboradores({
    vagas: [],
    agendamentos: [
      {
        colaborador: "PEDRO LIMA",
        colaborador_cpf: CPF_C,
        cargo_nome: "Analista",
        aso: "Admissional",
        status: "agendado",
        data_agendamento: "2026-03-01",
      },
    ],
  });
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].situacao, "admissional_em_andamento");
  assert.equal(linhas[0].situacaoLabel, "Admissional em andamento");
}

// Admissional aso_retido → Ativo
{
  const linhas = consolidarPortalColaboradores({
    vagas: [],
    agendamentos: [
      {
        colaborador: "PEDRO LIMA",
        colaborador_cpf: CPF_C,
        cargo_nome: "Analista",
        aso: "Admissional",
        status: "aso_retido",
        data_agendamento: "2026-03-01",
        aso_retido_em: "2026-03-02T10:00:00.000Z",
      },
    ],
  });
  assert.equal(linhas[0].situacao, "ativo");
}

// CPF existente não duplica + Periódico não cria sozinho
{
  const linhas = consolidarPortalColaboradores({
    vagas: [
      {
        colaborador: "MARIA",
        colaborador_cpf: CPF_A,
        cargo_nome: "Antigo",
      },
    ],
    agendamentos: [
      {
        colaborador: "MARIA SILVA",
        colaborador_cpf: CPF_A,
        cargo_nome: "Novo Cargo",
        aso: "Periódico",
        status: "aso_retido",
        data_agendamento: "2026-05-01",
        aso_retido_em: "2026-05-02T12:00:00.000Z",
      },
      {
        colaborador: "SO SO PERIODICO",
        colaborador_cpf: CPF_B,
        aso: "Periódico",
        status: "agendado",
        data_agendamento: "2026-04-01",
      },
    ],
  });
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].cargo, "Novo Cargo");
  assert.equal(linhas[0].situacao, "ativo");
}

// Demissional só agendado → Demissional em andamento
{
  const linhas = consolidarPortalColaboradores({
    vagas: [
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        cargo_nome: "Motorista",
      },
    ],
    agendamentos: [
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        aso: "Demissional",
        status: "agendado",
        data_agendamento: "2026-09-05",
      },
    ],
  });
  assert.equal(linhas[0].situacao, "demissional_em_andamento");
  assert.equal(linhas[0].dataDesligamentoIso, null);
}

// Demissional cancelado → continua ativo (cancelado fora da fonte)
{
  const linhas = consolidarPortalColaboradores({
    vagas: [
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        cargo_nome: "Motorista",
      },
    ],
    agendamentos: [
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        aso: "Demissional",
        status: "cancelado",
        data_agendamento: "2026-09-05",
      },
    ],
  });
  assert.equal(linhas[0].situacao, "ativo");
}

// Demissional aso_retido → Demitido
{
  const linhas = consolidarPortalColaboradores({
    vagas: [
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        cargo_nome: "Motorista",
      },
    ],
    agendamentos: [
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        aso: "Demissional",
        status: "aso_retido",
        data_agendamento: "2026-09-05",
        aso_retido_em: "2026-09-06T10:00:00.000Z",
      },
    ],
  });
  assert.equal(linhas[0].situacao, "demitido");
  assert.equal(linhas[0].dataDesligamentoLabel, "05/09/2026");
  const resumo = calcPortalColaboradoresResumo(linhas);
  assert.equal(resumo.totalAtivos, 0);
  assert.equal(resumo.totalDemitidos, 1);
}

// Readmissão: Admissional agendado após demissão → Admissional em andamento
{
  const linhas = consolidarPortalColaboradores({
    vagas: [],
    agendamentos: [
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        aso: "Demissional",
        status: "aso_retido",
        data_agendamento: "2026-01-10",
        aso_retido_em: "2026-01-11T10:00:00.000Z",
      },
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        cargo_nome: "Motorista Senior",
        aso: "Admissional",
        status: "agendado",
        data_agendamento: "2026-08-20",
      },
    ],
  });
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].situacao, "admissional_em_andamento");
}

// Readmissão concluída → Ativo
{
  const linhas = consolidarPortalColaboradores({
    vagas: [],
    agendamentos: [
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        aso: "Demissional",
        status: "aso_retido",
        data_agendamento: "2026-01-10",
        aso_retido_em: "2026-01-11T10:00:00.000Z",
      },
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        cargo_nome: "Motorista Senior",
        aso: "Admissional",
        status: "aso_retido",
        data_agendamento: "2026-08-20",
        aso_retido_em: "2026-08-21T10:00:00.000Z",
      },
    ],
  });
  assert.equal(linhas[0].situacao, "ativo");
  assert.equal(linhas[0].dataDesligamentoIso, null);
}

// Filtros: ativos inclui em andamento
{
  const linhas = consolidarPortalColaboradores({
    vagas: [
      {
        colaborador: "MARIA SILVA",
        colaborador_cpf: CPF_A,
        cargo_nome: "Aux",
      },
    ],
    agendamentos: [
      {
        colaborador: "PEDRO",
        colaborador_cpf: CPF_C,
        aso: "Admissional",
        status: "agendado",
        data_agendamento: "2026-03-01",
      },
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        aso: "Demissional",
        status: "aso_retido",
        data_agendamento: "2026-09-05",
        aso_retido_em: "2026-09-06T10:00:00.000Z",
      },
      {
        colaborador: "JOAO SOUZA",
        colaborador_cpf: CPF_B,
        cargo_nome: "Motorista",
        aso: "Admissional",
        status: "aso_retido",
        data_agendamento: "2025-01-01",
        aso_retido_em: "2025-01-02T10:00:00.000Z",
      },
    ],
  });
  assert.equal(
    filtrarPortalColaboradores(linhas, { filtro: "ativos" }).length,
    2
  );
  assert.equal(
    filtrarPortalColaboradores(linhas, { filtro: "demitidos" }).length,
    1
  );
}

console.log("test-portal-colaboradores: ok");
