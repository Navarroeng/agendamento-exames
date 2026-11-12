import assert from "node:assert/strict";
import { emptyVagaDraft } from "../lib/contrato-vagas";
import { aplicarImportacaoNasVagas } from "../lib/contrato-vagas-import";
import {
  MENSAGEM_LISTA_JA_VINCULADA,
  MENSAGEM_LISTA_NAO_APLICADA,
  MENSAGEM_LISTA_SEM_CPF,
  avaliarUsoListaColaboradoresCliente,
  mensagemQuantidadeListaCliente,
  type ColaboradorListaCliente,
  type VagaListaCliente,
} from "../lib/lista-colaboradores-contrato";
import { consolidarPortalColaboradores } from "../lib/portal-colaboradores";

const CPF_A = "52998224725";
const CPF_B = "39053344705";
const CPF_C = "11144477735";
const CADASTRO = "11111111-1111-4111-8111-111111111111";
const CADASTRO_SEM = "22222222-2222-4222-8222-222222222222";
const AGENDAMENTO = "33333333-3333-4333-8333-333333333333";
const VAGA = "44444444-4444-4444-8444-444444444444";

function pessoa(
  id: string,
  nome: string,
  cpf: string,
  cadastroId?: string
): ColaboradorListaCliente {
  return {
    id,
    cadastroId: cadastroId ?? null,
    nome,
    cpfDigits: cpf,
    cargo: "ANALISTA",
    situacao: "ativo",
  };
}

function vagaLivre(indice: number): VagaListaCliente {
  return {
    indice,
    status: "aberta",
    colaborador: null,
    colaboradorCpf: null,
    colaboradorOrigemId: null,
  };
}

assert.equal(
  mensagemQuantidadeListaCliente(5, 3),
  "A lista do cliente tem 5 colaboradores ativos e este contrato prevê 3. Revise a lista em Clientes → Colaboradores e tente novamente."
);
assert.equal(
  mensagemQuantidadeListaCliente(1, 3),
  "A lista do cliente tem 1 colaborador ativo e este contrato prevê 3. Revise a lista em Clientes → Colaboradores e tente novamente."
);

{
  const resultado = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 2,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A, CADASTRO),
      pessoa(CPF_B, "JOAO", CPF_B),
    ],
    vagas: [vagaLivre(1), vagaLivre(2)],
  });
  assert.equal(resultado.ok, true);
  if (!resultado.ok) throw new Error("lista igual");
  assert.equal(resultado.atribuicoes.length, 2);
  assert.equal(resultado.atribuicoes[0].origemId, CADASTRO);
  assert.equal(resultado.atribuicoes[1].cpfDigits, CPF_B);
  assert.deepEqual(
    resultado.atribuicoes.map((item) => item.indice),
    [1, 2]
  );
}

{
  const maior = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 2,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A),
      pessoa(CPF_B, "JOAO", CPF_B),
      pessoa(CPF_C, "ANA", CPF_C),
    ],
    vagas: [vagaLivre(1), vagaLivre(2)],
  });
  assert.equal(maior.ok, false);
  if (maior.ok) throw new Error("maior");
  assert.equal(maior.mensagem, mensagemQuantidadeListaCliente(3, 2));
}

{
  const menor = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 3,
    colaboradores: [pessoa(CPF_A, "MARIA", CPF_A)],
    vagas: [vagaLivre(1), vagaLivre(2), vagaLivre(3)],
  });
  assert.equal(menor.ok, false);
  if (menor.ok) throw new Error("menor");
  assert.equal(menor.mensagem, mensagemQuantidadeListaCliente(1, 3));
}

{
  const semCpf = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 1,
    colaboradores: [pessoa(CADASTRO_SEM, "SEM DOCUMENTO", "", CADASTRO_SEM)],
    vagas: [vagaLivre(1)],
  });
  assert.equal(semCpf.ok, false);
  if (semCpf.ok) throw new Error("sem cpf");
  assert.equal(semCpf.mensagem, MENSAGEM_LISTA_SEM_CPF);
}

{
  const programadas: VagaListaCliente[] = [
    {
      indice: 1,
      status: "programada",
      colaborador: "MARIA",
      colaboradorCpf: CPF_A,
      colaboradorOrigemId: CADASTRO,
    },
    {
      indice: 2,
      status: "agendada",
      colaborador: "JOAO",
      colaboradorCpf: CPF_B,
      colaboradorOrigemId: CPF_B,
    },
  ];
  const repetido = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 2,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A, CADASTRO),
      pessoa(CPF_B, "JOAO", CPF_B),
    ],
    vagas: programadas,
  });
  assert.equal(repetido.ok, true);
  if (!repetido.ok) throw new Error("repetido");
  assert.equal(repetido.atribuicoes.length, 0);
  assert.equal(repetido.mensagem, MENSAGEM_LISTA_JA_VINCULADA);
  assert.equal(programadas[0].colaborador, "MARIA");
  assert.equal(programadas[1].status, "agendada");
}

{
  const ocupada: VagaListaCliente = {
    indice: 1,
    status: "programada",
    colaborador: "OUTRA PESSOA",
    colaboradorCpf: CPF_C,
    colaboradorOrigemId: CPF_C,
  };
  const bloqueado = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 1,
    colaboradores: [pessoa(CPF_A, "MARIA", CPF_A, CADASTRO)],
    vagas: [ocupada],
  });
  assert.equal(bloqueado.ok, false);
  if (bloqueado.ok) throw new Error("ocupada");
  assert.equal(bloqueado.mensagem, MENSAGEM_LISTA_NAO_APLICADA);
  assert.equal(ocupada.colaborador, "OUTRA PESSOA");
}

{
  const parcial = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 2,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A, CADASTRO),
      pessoa(CPF_B, "JOAO", CPF_B),
    ],
    vagas: [
      {
        indice: 1,
        status: "agendada",
        colaborador: "MARIA",
        colaboradorCpf: CPF_A,
        colaboradorOrigemId: CADASTRO,
      },
      vagaLivre(2),
    ],
  });
  assert.equal(parcial.ok, true);
  if (!parcial.ok) throw new Error("parcial");
  assert.equal(parcial.atribuicoes.length, 1);
  assert.equal(parcial.atribuicoes[0].indice, 2);
  assert.equal(parcial.atribuicoes[0].cpfDigits, CPF_B);
}

{
  const linhas = consolidarPortalColaboradores({
    vagas: [],
    agendamentos: [],
    movimentacoes: [
      {
        id: CADASTRO_SEM,
        tipo: "cadastro",
        cpf_digits: "",
        colaborador_nome: "SEM DOCUMENTO",
        cargo_nome: "AUXILIAR",
        data_evento: "2024-03-01",
      },
    ],
  });
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].situacao, "ativo");
  assert.equal(linhas[0].cadastroId, CADASTRO_SEM);
  assert.equal(linhas[0].cpfDigits, "");
  assert.equal(linhas[0].dataAdmissaoIso, "2024-03-01");
  assert.equal(linhas[0].id, `semcpf:cadastro:${CADASTRO_SEM}`);
}

{
  const soCadastro = consolidarPortalColaboradores({
    vagas: [],
    agendamentos: [],
    movimentacoes: [
      {
        id: CADASTRO,
        tipo: "cadastro",
        cpf_digits: CPF_A,
        colaborador_nome: "MARIA SILVA",
        cargo_nome: "ANALISTA",
        data_evento: "2024-01-10",
      },
    ],
  });
  const depoisDoExame = consolidarPortalColaboradores({
    vagas: [],
    agendamentos: [
      {
        id: AGENDAMENTO,
        colaborador: "MARIA SILVA",
        colaborador_cpf: CPF_A,
        cargo_nome: "ANALISTA",
        aso: "Periodico",
        status: "agendado",
        data_agendamento: "2026-05-01",
      },
    ],
    movimentacoes: [
      {
        id: CADASTRO,
        tipo: "cadastro",
        cpf_digits: CPF_A,
        colaborador_nome: "MARIA SILVA",
        cargo_nome: "ANALISTA",
        data_evento: "2024-01-10",
      },
    ],
  });
  assert.equal(soCadastro.length, 1);
  assert.equal(depoisDoExame.length, 1);
  assert.equal(depoisDoExame[0].id, CPF_A);
  assert.equal(depoisDoExame[0].cadastroId, CADASTRO);
}

{
  const linhas = consolidarPortalColaboradores({
    vagas: [],
    agendamentos: [
      {
        id: AGENDAMENTO,
        colaborador: "SEM DOCUMENTO",
        colaborador_cpf: null,
        cargo_nome: "AUXILIAR",
        aso: "Admissional",
        status: "agendado",
        data_agendamento: "2026-05-01",
      },
    ],
    movimentacoes: [
      {
        id: CADASTRO_SEM,
        tipo: "cadastro",
        cpf_digits: "",
        colaborador_nome: "SEM DOCUMENTO",
        cargo_nome: "AUXILIAR",
      },
    ],
  });
  assert.equal(linhas.length, 2);
}

{
  const vaga = {
    id: VAGA,
    colaborador: "SEM DOCUMENTO",
    colaborador_cpf: null,
    cargo_nome: "AUXILIAR",
    agendamento_id: AGENDAMENTO,
    colaborador_origem: CADASTRO_SEM,
  };
  const linhas = consolidarPortalColaboradores({
    vagas: [vaga],
    agendamentos: [
      {
        id: AGENDAMENTO,
        colaborador: "SEM DOCUMENTO",
        colaborador_cpf: null,
        cargo_nome: "AUXILIAR",
        aso: "Admissional",
        status: "agendado",
        data_agendamento: "2026-05-01",
      },
    ],
    movimentacoes: [
      {
        id: CADASTRO_SEM,
        tipo: "cadastro",
        cpf_digits: "",
        colaborador_nome: "SEM DOCUMENTO",
        cargo_nome: "AUXILIAR",
      },
    ],
  });
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].cadastroId, CADASTRO_SEM);
  assert.equal(vaga.colaborador, "SEM DOCUMENTO");
}

{
  const vagasAntigas = [
    {
      id: VAGA,
      colaborador: "MARIA SILVA",
      colaborador_cpf: CPF_A,
      cargo_nome: "ANALISTA",
    },
  ];
  const linhas = consolidarPortalColaboradores({
    vagas: vagasAntigas,
    agendamentos: [],
    movimentacoes: [
      {
        id: CADASTRO,
        tipo: "cadastro",
        cpf_digits: CPF_A,
        colaborador_nome: "MARIA SILVA",
        cargo_nome: "ANALISTA",
        data_evento: "2024-01-10",
      },
      {
        id: CADASTRO_SEM,
        tipo: "cadastro",
        cpf_digits: CPF_B,
        colaborador_nome: "JOAO NOVO",
        cargo_nome: "TECNICO",
        data_evento: "2026-02-01",
      },
    ],
  });
  assert.equal(linhas.length, 2);
  assert.equal(vagasAntigas[0].colaborador, "MARIA SILVA");
  const uso = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 1,
    colaboradores: linhas,
    vagas: [
      {
        indice: 1,
        status: "programada",
        colaborador: "MARIA SILVA",
        colaboradorCpf: CPF_A,
        colaboradorOrigemId: CADASTRO,
      },
    ],
  });
  assert.equal(uso.ok, false);
  if (uso.ok) throw new Error("renovacao");
  assert.equal(uso.mensagem, mensagemQuantidadeListaCliente(2, 1));
}

{
  const importado = aplicarImportacaoNasVagas({
    atuais: [emptyVagaDraft(1)],
    importados: [
      {
        linha: 2,
        nome: "MARIA SILVA",
        cpf: CPF_A,
        cpfDigits: CPF_A,
        cargo: "ANALISTA",
      },
    ],
    quantidadePrevista: 1,
    sobrescreverPreenchidas: false,
  });
  assert.equal(importado.aplicados, 1);
  assert.equal(importado.drafts[0].colaborador, "MARIA SILVA");
  assert.equal(importado.drafts[0].colaboradorOrigemId ?? null, null);
}

{
  const manual = emptyVagaDraft(1);
  manual.colaborador = "JOAO MANUAL";
  manual.colaboradorCpf = CPF_B;
  manual.cargoNome = "TECNICO";
  assert.equal(manual.colaboradorOrigemId, null);
  assert.equal(manual.indice, 1);
}

console.log("test-lista-colaboradores-contrato: ok");
