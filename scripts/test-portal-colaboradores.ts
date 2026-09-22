import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  apresentarCargoColaboradorPortal,
  apresentarNomeColaboradorPortal,
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

  const todos = filtrarPortalColaboradores(linhas, { filtro: "todos" });
  assert.deepEqual(
    todos.map((l) => l.nome),
    ["JOAO SOUZA", "MARIA SILVA", "PEDRO"]
  );
  const ativos = filtrarPortalColaboradores(linhas, { filtro: "ativos" });
  assert.deepEqual(
    ativos.map((l) => l.nome),
    ["MARIA SILVA", "PEDRO"]
  );
  const demitidos = filtrarPortalColaboradores(linhas, { filtro: "demitidos" });
  assert.deepEqual(
    demitidos.map((l) => l.nome),
    ["JOAO SOUZA"]
  );
  const busca = filtrarPortalColaboradores(linhas, {
    filtro: "todos",
    buscaNome: "souza",
  });
  assert.deepEqual(
    busca.map((l) => l.nome),
    ["JOAO SOUZA"]
  );
}

{
  assert.equal(
    apresentarNomeColaboradorPortal("Boanergis Alves Viana"),
    "BOANERGIS ALVES VIANA"
  );
  assert.equal(
    apresentarNomeColaboradorPortal("Dani Quele dos Santos Alves"),
    "DANI QUELE DOS SANTOS ALVES"
  );
  assert.equal(apresentarNomeColaboradorPortal("joão"), "JOÃO");
  assert.equal(
    apresentarCargoColaboradorPortal("Auxiliar Administrativo"),
    "AUXILIAR ADMINISTRATIVO"
  );
}

{
  const linhas = consolidarPortalColaboradores({
    vagas: [
      {
        colaborador: "dani quele dos santos alves",
        colaborador_cpf: CPF_A,
        cargo_nome: "Auxiliar Administrativo",
      },
      {
        colaborador: "BOANERGIS ALVES VIANA",
        colaborador_cpf: CPF_B,
        cargo_nome: "motorista",
      },
      {
        colaborador: "Álvaro Costa",
        colaborador_cpf: CPF_C,
        cargo_nome: "Analista",
      },
    ],
    agendamentos: [],
  });
  assert.deepEqual(
    linhas.map((l) => l.nome),
    ["Álvaro Costa", "BOANERGIS ALVES VIANA", "dani quele dos santos alves"]
  );
  assert.equal(linhas[1].nome, "BOANERGIS ALVES VIANA");
  assert.equal(
    apresentarNomeColaboradorPortal(linhas[2].nome),
    "DANI QUELE DOS SANTOS ALVES"
  );
  assert.deepEqual(
    linhas.map((l) => apresentarNomeColaboradorPortal(l.nome)),
    ["ÁLVARO COSTA", "BOANERGIS ALVES VIANA", "DANI QUELE DOS SANTOS ALVES"]
  );
  assert.deepEqual(
    linhas.map((l) => apresentarCargoColaboradorPortal(l.cargo)),
    ["ANALISTA", "MOTORISTA", "AUXILIAR ADMINISTRATIVO"]
  );
}

{
  const ui = readFileSync(
    join(process.cwd(), "components/portal-cliente/PortalColaboradores.tsx"),
    "utf8"
  );
  const lib = readFileSync(
    join(process.cwd(), "lib/portal-colaboradores.ts"),
    "utf8"
  );
  const svc = readFileSync(
    join(process.cwd(), "services/portal-colaboradores.server.ts"),
    "utf8"
  );
  assert.match(ui, /apresentarNomeColaboradorPortal\(row\.nome\)/);
  assert.match(ui, /apresentarCargoColaboradorPortal\(row\.cargo\)/);
  assert.doesNotMatch(ui, /cargoApresentacao/);
  assert.match(lib, /toLocaleUpperCase\("pt-BR"\)/);
  assert.match(lib, /compareByLabel\(a\.nome, b\.nome\)/);
  assert.doesNotMatch(svc, /toLocaleUpperCase/);
  assert.doesNotMatch(ui, />Situação</);
  assert.doesNotMatch(ui, /situacaoLabel/);
  assert.match(ui, /Equipe atual/);
  assert.match(ui, /Admissional/);
  assert.match(ui, /Demissional/);
}

console.log("test-portal-colaboradores: ok");
