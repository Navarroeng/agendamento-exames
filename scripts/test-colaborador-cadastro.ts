import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MENSAGEM_CPF_DUPLICADO,
  mensagemCpfDuplicadoNaEmpresa,
  registrosDoMesmoColaborador,
  type VinculoColaborador,
} from "../lib/colaborador-cadastro";
import { consolidarPortalColaboradores } from "../lib/portal-colaboradores";

const CPF_A = "52998224725";
const CPF_B = "39053344705";

const registros: VinculoColaborador[] = [
  {
    id: "vaga-antiga",
    origem: "vaga",
    cpf: CPF_A,
    nome: "ANA",
    cargo: "AUXILIAR",
    agendamentoId: "exame-antigo",
    vagaId: null,
  },
  {
    id: "vaga-nova",
    origem: "vaga",
    cpf: CPF_A,
    nome: "ANA COSTA",
    cargo: "ANALISTA",
    agendamentoId: null,
    vagaId: null,
  },
  {
    id: "exame-antigo",
    origem: "agendamento",
    cpf: CPF_A,
    nome: "ANA COSTA",
    cargo: "ANALISTA",
    agendamentoId: null,
    vagaId: null,
  },
  {
    id: "vaga-outra",
    origem: "vaga",
    cpf: CPF_B,
    nome: "ANA COSTA",
    cargo: "ANALISTA",
    agendamentoId: null,
    vagaId: null,
  },
  {
    id: "vaga-sem",
    origem: "vaga",
    cpf: null,
    nome: "MESMO NOME",
    cargo: "AJUDANTE",
    agendamentoId: null,
    vagaId: null,
  },
  {
    id: "vaga-sem-2",
    origem: "vaga",
    cpf: null,
    nome: "MESMO NOME",
    cargo: "SOLDADOR",
    agendamentoId: null,
    vagaId: null,
  },
];

{
  const mesmos = registrosDoMesmoColaborador(registros, {
    cpf: "529.982.247-25",
    agendamentoId: null,
    vagaId: null,
  });
  assert.deepEqual(
    mesmos.map((registro) => registro.id).sort(),
    ["exame-antigo", "vaga-antiga", "vaga-nova"]
  );
  assert.equal(
    mensagemCpfDuplicadoNaEmpresa(registros, { cpf: CPF_A, agendamentoId: null, vagaId: null }, CPF_B),
    MENSAGEM_CPF_DUPLICADO
  );
  assert.equal(
    mensagemCpfDuplicadoNaEmpresa(registros, { cpf: CPF_A, agendamentoId: null, vagaId: null }, CPF_A),
    null
  );
}

{
  const mesmos = registrosDoMesmoColaborador(registros, {
    cpf: null,
    agendamentoId: null,
    vagaId: "vaga-sem",
  });
  assert.deepEqual(
    mesmos.map((registro) => registro.id),
    ["vaga-sem"]
  );
}

{
  const CPF_NOVO = "11144477735";
  const alterados = registros.map((registro) =>
    registro.id === "vaga-nova" ? { ...registro, cpf: CPF_NOVO } : registro
  );
  const mesmos = registrosDoMesmoColaborador(alterados, {
    cpf: CPF_A,
    agendamentoId: null,
    vagaId: "vaga-nova",
  });
  assert.deepEqual(
    mesmos.map((registro) => registro.id).sort(),
    ["exame-antigo", "vaga-antiga", "vaga-nova"]
  );
}

{
  const linhas = consolidarPortalColaboradores({
    vagas: [
      { id: "vaga-1", colaborador: "MESMO NOME", cargo_nome: "Ajudante" },
      { id: "vaga-2", colaborador: "OUTRA PESSOA", cargo_nome: "Soldador" },
    ],
    agendamentos: [],
    movimentacoes: [
      {
        id: "mov-1",
        tipo: "desligamento_admin",
        data_evento: "2026-09-10",
        vinculo_vaga_id: "vaga-1",
        colaborador_nome: "MESMO NOME",
      },
    ],
  });
  const desligado = linhas.find((linha) => linha.vinculoVagaId === "vaga-1");
  const ativo = linhas.find((linha) => linha.vinculoVagaId === "vaga-2");
  assert.equal(desligado?.situacao, "demitido");
  assert.equal(desligado?.desligamentoOrigem, "admin");
  assert.equal(ativo?.situacao, "ativo");
}

{
  const root = process.cwd();
  const ui = readFileSync(
    join(root, "components/clientes/ClienteColaboradoresSection.tsx"),
    "utf8"
  );
  const gravacao = readFileSync(
    join(root, "lib/colaborador-cadastro-gravacao.ts"),
    "utf8"
  );
  const lista = readFileSync(
    join(root, "services/contrato-vagas.service.ts"),
    "utf8"
  );
  assert.match(ui, /formatCPF\(row\.cpfDigits\)/);
  assert.match(ui, />Ações</);
  assert.match(ui, />\s*Editar\s*</);
  assert.match(ui, /Cadastrar/);
  assert.match(ui, /setEditarAlvo\(null\)/);
  assert.doesNotMatch(ui, /setBusca\(""\)/);
  assert.doesNotMatch(ui, /setFiltro\("ativos"\)/);
  assert.match(lista, /propagarCadastroColaborador/);
  assert.doesNotMatch(gravacao, /\.insert\(/);
  assert.match(gravacao, /MENSAGEM_CPF_DUPLICADO|mensagemCpfDuplicadoNaEmpresa/);
}

console.log("test-colaborador-cadastro: ok");
