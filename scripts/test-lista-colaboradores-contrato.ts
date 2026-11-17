import assert from "node:assert/strict";
import {
  CONTRATO_VAGA_STATUS_LABELS,
  emptyVagaDraft,
  resolveStatusVagaRascunho,
  textoConfirmacaoLiberarVaga,
  textoVinculoOuReservaVaga,
  vagaComprometidaResidual,
} from "../lib/contrato-vagas";
import { aplicarImportacaoNasVagas } from "../lib/contrato-vagas-import";
import {
  labelStatusListaFuncionario,
  resolveStatusListaFuncionarioPreview,
} from "../lib/contrato-vagas-lista";
import { isValidCPF } from "../lib/cpf";
import {
  MENSAGEM_LISTA_JA_VINCULADA,
  MENSAGEM_LISTA_SEM_CPF,
  avaliarUsoListaColaboradoresCliente,
  colaboradoresParaDefinirVaga,
  mensagemBloqueioSalvarListaCliente,
  mensagemCandidatosAcimaDasVagasLivres,
  mensagemListaIncompleta,
  mensagemPreviaPreenchimentoLista,
  mensagemQuantidadeListaCliente,
  type ColaboradorListaCliente,
  type VagaListaCliente,
} from "../lib/lista-colaboradores-contrato";
import { consolidarPortalColaboradores } from "../lib/portal-colaboradores";

const CPF_A = "52998224725";
const CPF_B = "39053344705";
const CPF_C = "11144477735";
function cpfDeNove(nove: string): string {
  const nums = nove.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += nums[i] * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  sum = 0;
  for (let i = 0; i < 9; i += 1) sum += nums[i] * (11 - i);
  sum += d1 * 2;
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return `${nove}${d1}${d2}`;
}

const CPF_D = cpfDeNove("453178287");
assert.equal(isValidCPF(CPF_D), true);
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
  assert.equal(maior.ok, true);
  if (!maior.ok) throw new Error("maior");
  assert.equal(maior.atribuicoes.length, 0);
  assert.equal(maior.mensagem, mensagemCandidatosAcimaDasVagasLivres(3, 2));
}

{
  const menor = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 3,
    colaboradores: [pessoa(CPF_A, "MARIA", CPF_A, CADASTRO)],
    vagas: [vagaLivre(1), vagaLivre(2), vagaLivre(3)],
  });
  assert.equal(menor.ok, true);
  if (!menor.ok) throw new Error("menor");
  assert.equal(menor.omitidos, 0);
  assert.equal(menor.atribuicoes.length, 1);
  assert.equal(menor.atribuicoes[0].indice, 1);
  assert.equal(menor.atribuicoes[0].origemId, CADASTRO);
  assert.equal(mensagemBloqueioSalvarListaCliente(1, 3), null);
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
  assert.equal(bloqueado.ok, true);
  if (!bloqueado.ok) throw new Error("ocupada");
  assert.equal(bloqueado.atribuicoes.length, 0);
  assert.equal(bloqueado.mensagem, mensagemCandidatosAcimaDasVagasLivres(1, 0));
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
  const by = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 5,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A, CADASTRO),
      pessoa(CPF_B, "JOAO", CPF_B),
      pessoa(CPF_C, "ANA", CPF_C),
      pessoa(CPF_D, "RITA", CPF_D),
    ],
    vagas: [vagaLivre(1), vagaLivre(2), vagaLivre(3), vagaLivre(4), vagaLivre(5)],
  });
  assert.equal(by.ok, true);
  if (!by.ok) throw new Error("by");
  assert.equal(by.omitidos, 0);
  assert.deepEqual(
    by.atribuicoes.map((item) => item.indice),
    [1, 2, 3, 4]
  );
  assert.equal(by.atribuicoes[0].origemId, CADASTRO);
  const sobra = resolveStatusVagaRascunho({
    colaborador: "",
    colaboradorCpf: "",
    manterAsoAberto: false,
  });
  assert.equal(sobra, "aberta");
  assert.equal(CONTRATO_VAGA_STATUS_LABELS[sobra], "Em aberto");
  assert.equal(mensagemBloqueioSalvarListaCliente(4, 5), null);
  const quinta = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 5,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A, CADASTRO),
      pessoa(CPF_B, "JOAO", CPF_B),
      pessoa(CPF_C, "ANA", CPF_C),
      pessoa(CPF_D, "RITA", CPF_D),
      pessoa("QUINTA", "CARLA", cpfDeNove("286255878")),
    ],
    vagas: [
      ...by.atribuicoes.map((item) => ({
        indice: item.indice,
        status: "comprometida",
        colaborador: item.nome,
        colaboradorCpf: item.cpfDigits,
        colaboradorOrigemId: item.origemId,
      })),
      vagaLivre(5),
    ],
  });
  assert.equal(quinta.ok, true);
  if (!quinta.ok) throw new Error("quinta");
  assert.equal(quinta.omitidos, 0);
  assert.equal(quinta.atribuicoes.length, 1);
  assert.equal(quinta.atribuicoes[0].indice, 5);
  assert.equal(quinta.atribuicoes[0].nome, "CARLA");
}

{
  const cincoParaTres = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 3,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A),
      pessoa(CPF_B, "JOAO", CPF_B),
      pessoa(CPF_C, "ANA", CPF_C),
      pessoa(CPF_D, "RITA", CPF_D),
      pessoa("EXTRA", "LIA", cpfDeNove("286255878")),
    ],
    vagas: [vagaLivre(1), vagaLivre(2), vagaLivre(3)],
  });
  assert.equal(cincoParaTres.ok, true);
  if (!cincoParaTres.ok) throw new Error("cinco");
  assert.equal(cincoParaTres.atribuicoes.length, 0);
  assert.equal(
    cincoParaTres.mensagem,
    mensagemCandidatosAcimaDasVagasLivres(5, 3)
  );
}

{
  const residual: VagaListaCliente = {
    indice: 1,
    status: "comprometida",
    colaborador: null,
    colaboradorCpf: null,
    colaboradorOrigemId: null,
  };
  const comResidual = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 3,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A, CADASTRO),
      pessoa(CPF_B, "JOAO", CPF_B),
    ],
    vagas: [residual, vagaLivre(2), vagaLivre(3)],
  });
  assert.equal(comResidual.ok, true);
  if (!comResidual.ok) throw new Error("residual");
  assert.deepEqual(
    comResidual.atribuicoes.map((item) => item.indice),
    [1, 2]
  );
  assert.equal(residual.colaborador, null);
  assert.equal(comResidual.omitidos, 0);
}

{
  const quatroLivres = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 4,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A, CADASTRO),
      pessoa(CPF_B, "JOAO", CPF_B),
      pessoa(CPF_C, "ANA", CPF_C),
      pessoa(CPF_D, "RITA", CPF_D),
    ],
    vagas: [
      {
        indice: 1,
        status: "comprometida",
        colaborador: null,
        colaboradorCpf: null,
        colaboradorOrigemId: null,
      },
      vagaLivre(2),
      vagaLivre(3),
      vagaLivre(4),
    ],
  });
  assert.equal(quatroLivres.ok, true);
  if (!quatroLivres.ok) throw new Error("quatro");
  assert.equal(quatroLivres.omitidos, 0);
  assert.deepEqual(
    quatroLivres.atribuicoes.map((item) => item.indice),
    [1, 2, 3, 4]
  );
}

{
  const reservaValida: VagaListaCliente = {
    indice: 1,
    status: "comprometida",
    colaborador: null,
    colaboradorCpf: null,
    colaboradorOrigemId: null,
    periodicoFuturoId: "periodico-reserva",
  };
  const comReserva = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 4,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A, CADASTRO),
      pessoa(CPF_B, "JOAO", CPF_B),
      pessoa(CPF_C, "ANA", CPF_C),
      pessoa(CPF_D, "RITA", CPF_D),
    ],
    vagas: [reservaValida, vagaLivre(2), vagaLivre(3), vagaLivre(4)],
  });
  assert.equal(comReserva.ok, true);
  if (!comReserva.ok) throw new Error("reserva");
  assert.equal(comReserva.atribuicoes.length, 0);
  assert.equal(comReserva.mensagem, mensagemCandidatosAcimaDasVagasLivres(4, 3));
  assert.equal(reservaValida.periodicoFuturoId, "periodico-reserva");
  assert.equal(reservaValida.colaborador, null);
}

{
  const protegida1: VagaListaCliente = {
    indice: 1,
    status: "programada",
    colaborador: "OUTRA",
    colaboradorCpf: cpfDeNove("286255878"),
    colaboradorOrigemId: null,
  };
  const protegida2: VagaListaCliente = {
    indice: 2,
    status: "comprometida",
    colaborador: "",
    colaboradorCpf: "",
    colaboradorOrigemId: null,
    creditoAsoId: "credito-reserva",
  };
  const incompleta = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 3,
    colaboradores: [
      pessoa(CPF_A, "MARIA", CPF_A, CADASTRO),
      pessoa(CPF_B, "JOAO", CPF_B),
      pessoa(CPF_C, "ANA", CPF_C),
    ],
    vagas: [protegida1, protegida2, vagaLivre(3)],
  });
  assert.equal(incompleta.ok, true);
  if (!incompleta.ok) throw new Error("incompleta");
  assert.equal(incompleta.atribuicoes.length, 0);
  assert.equal(incompleta.mensagem, mensagemCandidatosAcimaDasVagasLivres(3, 1));
  assert.equal(protegida1.colaborador, "OUTRA");
  assert.equal(protegida2.status, "comprometida");
  assert.equal(protegida2.creditoAsoId, "credito-reserva");
}

{
  const persistida = {
    status: "comprometida" as const,
    colaborador: null,
    colaborador_cpf: null,
    colaborador_origem: null,
    agendamento_id: null,
    periodico_futuro_id: null,
    credito_aso_id: null,
  };
  const draft = emptyVagaDraft(1);
  assert.equal(vagaComprometidaResidual({ status: persistida.status }), true);
  assert.equal(
    resolveStatusListaFuncionarioPreview({ persistida, draft }),
    "aberta"
  );
  assert.equal(
    labelStatusListaFuncionario({ persistida, draft }),
    "Em aberto"
  );
  assert.equal(
    resolveStatusVagaRascunho({
      statusAtual: "comprometida",
      colaborador: "",
      colaboradorCpf: "",
      manterAsoAberto: false,
    }),
    "aberta"
  );
  assert.equal(textoVinculoOuReservaVaga({ status: "comprometida" }), null);

  const comExame = {
    ...persistida,
    periodico_futuro_id: "periodico-reserva",
  };
  assert.equal(
    vagaComprometidaResidual({
      status: comExame.status,
      periodicoFuturoId: comExame.periodico_futuro_id,
    }),
    false
  );
  assert.equal(
    resolveStatusListaFuncionarioPreview({ persistida: comExame, draft }),
    "comprometida"
  );
  assert.equal(
    textoVinculoOuReservaVaga({
      status: "comprometida",
      periodicoFuturoId: "periodico-reserva",
    }),
    "Exame futuro programado"
  );
  assert.equal(
    textoVinculoOuReservaVaga({
      status: "comprometida",
      colaboradorOrigemId: CADASTRO,
    }),
    "Cadastro da empresa vinculado"
  );

  const desvincular = textoConfirmacaoLiberarVaga({
    temColaborador: true,
    nome: "MARIA",
  });
  assert.equal(desvincular.botao, "Desvincular da vaga");
  assert.equal(desvincular.titulo, "Desvincular da vaga");
  assert.equal(
    desvincular.mensagem,
    "A vaga ficará em aberto. O colaborador continuará cadastrado em Clientes → Colaboradores."
  );
  const liberar = textoConfirmacaoLiberarVaga({ temColaborador: false });
  assert.equal(liberar.botao, "Liberar vaga");
  assert.equal(liberar.titulo, "Liberar vaga");
  assert.match(liberar.mensagem, /libera a reserva da vaga/);
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
  assert.equal(uso.ok, true);
  if (!uso.ok) throw new Error("renovacao");
  assert.equal(uso.atribuicoes.length, 0);
  assert.equal(uso.mensagem, mensagemCandidatosAcimaDasVagasLivres(1, 0));
  assert.equal(vagasAntigas[0].colaborador, "MARIA SILVA");
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
assert.match(mensagemListaIncompleta(1, 2), /1 colaborador da lista pôde ser incluído/);

{
  const pessoas = Array.from({ length: 21 }, (_, index) =>
    pessoa(
      `pessoa-${index + 1}`,
      `COLABORADOR ${String(index + 1).padStart(2, "0")}`,
      cpfDeNove(String(200000000 + index)),
      `cadastro-${index + 1}`
    )
  );
  const gabriel = pessoa(
    "gabriel",
    "GABRIEL FERNANDES FERREIRA",
    cpfDeNove("153509460"),
    "cadastro-gabriel"
  );
  const bruno = pessoa(
    "bruno",
    "BRUNO LIMA",
    cpfDeNove("286255870"),
    "cadastro-bruno"
  );
  const vagasOcupadas: VagaListaCliente[] = pessoas.map((item, index) => ({
    indice: index + 1,
    vagaId: `vaga-${index + 1}`,
    status: "comprometida",
    colaborador: item.nome,
    colaboradorCpf: item.cpfDigits,
    colaboradorOrigemId: item.cadastroId ?? null,
  }));
  const vaga22: VagaListaCliente = {
    ...vagaLivre(22),
    vagaId: "vaga-22",
  };
  const excedente = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 22,
    colaboradores: [bruno, gabriel, ...pessoas.slice().reverse()],
    vagas: [...vagasOcupadas, vaga22],
  });
  assert.equal(excedente.ok, true);
  if (!excedente.ok) throw new Error("excedente");
  assert.equal(excedente.atribuicoes.length, 0);
  assert.equal(excedente.mensagem, mensagemCandidatosAcimaDasVagasLivres(2, 1));
  assert.equal(vagasOcupadas[0].colaborador, pessoas[0].nome);
  assert.equal(vagasOcupadas[0].vagaId, "vaga-1");

  const soGabriel = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 22,
    colaboradores: [gabriel, ...pessoas.slice().reverse()],
    vagas: [...vagasOcupadas, vaga22],
  });
  assert.equal(soGabriel.ok, true);
  if (!soGabriel.ok) throw new Error("gabriel");
  assert.equal(soGabriel.atribuicoes.length, 1);
  assert.equal(soGabriel.atribuicoes[0].indice, 22);
  assert.equal(soGabriel.atribuicoes[0].vagaId, "vaga-22");
  assert.equal(soGabriel.atribuicoes[0].nome, "GABRIEL FERNANDES FERREIRA");
  assert.equal(soGabriel.atribuicoes[0].origemId, "cadastro-gabriel");
  assert.equal(
    soGabriel.mensagem,
    mensagemPreviaPreenchimentoLista(soGabriel.atribuicoes)
  );
  assert.equal(vagasOcupadas[0].colaboradorOrigemId, "cadastro-1");

  const repetidoGabriel = avaliarUsoListaColaboradoresCliente({
    quantidadeContratada: 22,
    colaboradores: [...pessoas.slice().reverse(), gabriel],
    vagas: [
      ...vagasOcupadas,
      {
        ...vaga22,
        status: "comprometida",
        colaborador: gabriel.nome,
        colaboradorCpf: gabriel.cpfDigits,
        colaboradorOrigemId: gabriel.cadastroId ?? null,
      },
    ],
  });
  assert.equal(repetidoGabriel.ok, true);
  if (!repetidoGabriel.ok) throw new Error("repetido gabriel");
  assert.equal(repetidoGabriel.atribuicoes.length, 0);
  assert.equal(repetidoGabriel.mensagem, MENSAGEM_LISTA_JA_VINCULADA);

  const opcoes = colaboradoresParaDefinirVaga({
    colaboradores: [bruno, gabriel, ...pessoas],
    vagas: [...vagasOcupadas, vaga22],
    indice: 22,
  });
  assert.deepEqual(
    opcoes.map((item) => item.nome),
    ["BRUNO LIMA", "GABRIEL FERNANDES FERREIRA"]
  );
  const escolhido = opcoes.find(
    (item) => item.nome === "GABRIEL FERNANDES FERREIRA"
  );
  assert.ok(escolhido);
  const depoisDaEscolha = colaboradoresParaDefinirVaga({
    colaboradores: [bruno, gabriel, ...pessoas],
    vagas: [
      ...vagasOcupadas,
      {
        ...vaga22,
        status: "comprometida",
        colaborador: escolhido.nome,
        colaboradorCpf: escolhido.cpfDigits,
        colaboradorOrigemId: escolhido.cadastroId ?? null,
      },
    ],
    indice: 3,
  });
  assert.equal(
    depoisDaEscolha.some((item) => item.nome === "GABRIEL FERNANDES FERREIRA"),
    false
  );
  assert.equal(vagasOcupadas[2].colaborador, pessoas[2].nome);
}

console.log("test-lista-colaboradores-contrato: ok");
