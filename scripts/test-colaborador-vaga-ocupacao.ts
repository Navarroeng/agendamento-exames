import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO,
  MENSAGEM_CADASTRE_COLABORADOR,
  MENSAGEM_CONFLITO_LISTA_VAGAS,
  mensagemAlteracaoDiretaImplantacao,
  mensagemConflitoVinculoLista,
  mensagemOcupacaoForaDaEmpresa,
  planilhaTemPessoaForaDaEmpresa,
  snapshotAoLiberarVagaLegada,
} from "../lib/colaborador-vaga-ocupacao";
import { consolidarPortalColaboradores } from "../lib/portal-colaboradores";

const CPF_BRUNO = "52998224725";
const CPF_CARLA = "39053344705";
const VAGA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CADASTRO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const brunoAtivo = {
  id: CPF_BRUNO,
  cadastroId: CADASTRO,
  cpfDigits: CPF_BRUNO,
  situacao: "ativo" as const,
  nome: "BRUNO",
  cargo: "TECNICO",
};

{
  const soNaVaga = consolidarPortalColaboradores({
    vagas: [
      {
        id: VAGA,
        colaborador: "BRUNO",
        colaborador_cpf: CPF_BRUNO,
        cargo_nome: "TECNICO",
      },
    ],
    agendamentos: [],
    movimentacoes: [],
  });
  assert.equal(soNaVaga.length, 1);
  assert.equal(soNaVaga[0].nome, "BRUNO");
  assert.equal(soNaVaga[0].situacao, "ativo");

  const semVaga = consolidarPortalColaboradores({
    vagas: [{ id: VAGA, colaborador: null, colaborador_cpf: null }],
    agendamentos: [],
    movimentacoes: [],
  });
  assert.equal(semVaga.length, 0);

  const fontes = {
    vagas: [
      {
        id: VAGA,
        colaborador: "BRUNO",
        colaborador_cpf: CPF_BRUNO,
        cargo_nome: "TECNICO",
      },
    ],
    agendamentos: [],
    movimentacoes: [],
  };
  const snapshot = snapshotAoLiberarVagaLegada({ vagaId: VAGA, fontes });
  assert.ok(snapshot);
  assert.equal(snapshot?.nome, "BRUNO");
  assert.equal(snapshot?.cpf, CPF_BRUNO);
  assert.equal(snapshot?.cargo, "TECNICO");
  assert.equal(snapshot?.vagaId, VAGA);
  assert.equal(snapshot?.agendamentoId, null);

  const preservado = consolidarPortalColaboradores({
    vagas: [{ id: VAGA, colaborador: null, colaborador_cpf: null }],
    agendamentos: [],
    movimentacoes: [
      {
        id: CADASTRO,
        tipo: "cadastro",
        cpf_digits: CPF_BRUNO,
        colaborador_nome: snapshot?.nome,
        cargo_nome: snapshot?.cargo,
        vinculo_vaga_id: VAGA,
        data_evento: null,
      },
    ],
  });
  assert.equal(preservado.length, 1);
  assert.equal(preservado[0].nome, "BRUNO");
  assert.equal(preservado[0].situacao, "ativo");
  assert.equal(preservado[0].cpfDigits, CPF_BRUNO);
  assert.equal(preservado[0].cadastroId, CADASTRO);
  assert.equal(preservado[0].dataAdmissaoIso, null);
  assert.equal(
    snapshotAoLiberarVagaLegada({
      vagaId: VAGA,
      fontes: {
        vagas: fontes.vagas,
        agendamentos: [],
        movimentacoes: preservado.length
          ? [
              {
                id: CADASTRO,
                tipo: "cadastro",
                cpf_digits: CPF_BRUNO,
                colaborador_nome: "BRUNO",
                cargo_nome: "TECNICO",
                vinculo_vaga_id: VAGA,
              },
            ]
          : [],
      },
    }),
    null
  );
}

{
  const vagaSemCpf = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const fontes = {
    vagas: [
      {
        id: vagaSemCpf,
        colaborador: "BRUNO",
        colaborador_cpf: null,
        cargo_nome: "AUXILIAR",
      },
    ],
    agendamentos: [],
    movimentacoes: [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        tipo: "desligamento_admin",
        cpf_digits: "",
        colaborador_nome: "BRUNO",
        data_evento: "2026-08-01",
        vinculo_vaga_id: vagaSemCpf,
      },
    ],
  };
  const antes = consolidarPortalColaboradores(fontes);
  assert.equal(antes.length, 1);
  assert.equal(antes[0].situacao, "demitido");
  const snapshot = snapshotAoLiberarVagaLegada({ vagaId: vagaSemCpf, fontes });
  assert.equal(snapshot?.nome, "BRUNO");
  assert.equal(snapshot?.cpf, null);
  const depois = consolidarPortalColaboradores({
    vagas: [{ id: vagaSemCpf, colaborador: null }],
    agendamentos: [],
    movimentacoes: [
      ...fontes.movimentacoes,
      {
        id: CADASTRO,
        tipo: "cadastro",
        cpf_digits: "",
        colaborador_nome: "BRUNO",
        cargo_nome: "AUXILIAR",
        vinculo_vaga_id: vagaSemCpf,
        data_evento: null,
      },
    ],
  });
  assert.equal(depois.length, 1);
  assert.equal(depois[0].situacao, "demitido");
  assert.equal(depois[0].id, `semcpf:vaga:${vagaSemCpf}`);
  assert.equal(depois[0].dataAdmissaoIso, null);
}

{
  assert.equal(
    mensagemOcupacaoForaDaEmpresa({
      atuais: [
        {
          indice: 1,
          colaborador: null,
          colaboradorCpf: null,
          colaboradorOrigemId: null,
        },
      ],
      propostas: [
        {
          indice: 1,
          colaborador: "CARLA",
          colaboradorCpf: CPF_CARLA,
          colaboradorOrigemId: null,
        },
      ],
      ativos: [brunoAtivo],
    }),
    MENSAGEM_CADASTRE_COLABORADOR
  );
  assert.equal(
    mensagemOcupacaoForaDaEmpresa({
      atuais: [
        {
          indice: 1,
          colaborador: null,
          colaboradorCpf: null,
          colaboradorOrigemId: null,
        },
      ],
      propostas: [
        {
          indice: 1,
          colaborador: "BRUNO",
          colaboradorCpf: CPF_BRUNO,
          colaboradorOrigemId: CADASTRO,
        },
      ],
      ativos: [brunoAtivo],
    }),
    null
  );
  assert.equal(
    mensagemOcupacaoForaDaEmpresa({
      atuais: [
        {
          indice: 1,
          colaborador: "BRUNO",
          colaboradorCpf: CPF_BRUNO,
          colaboradorOrigemId: CADASTRO,
        },
      ],
      propostas: [
        {
          indice: 1,
          colaborador: "BRUNO LIMA",
          colaboradorCpf: CPF_BRUNO,
          colaboradorOrigemId: CADASTRO,
        },
      ],
      ativos: [brunoAtivo],
    }),
    null
  );
  assert.equal(
    mensagemOcupacaoForaDaEmpresa({
      atuais: [
        {
          indice: 1,
          colaborador: "BRUNO",
          colaboradorCpf: CPF_BRUNO,
          colaboradorOrigemId: CADASTRO,
        },
      ],
      propostas: [
        {
          indice: 1,
          colaborador: null,
          colaboradorCpf: null,
          colaboradorOrigemId: null,
        },
      ],
      ativos: [brunoAtivo],
    }),
    null
  );
  const vagaVazia = {
    indice: 1,
    colaborador: null,
    colaboradorCpf: null,
    colaboradorOrigemId: null,
    cargoNome: null,
  };
  const brunoNaVaga = {
    indice: 1,
    colaborador: "BRUNO",
    colaboradorCpf: CPF_BRUNO,
    colaboradorOrigemId: CADASTRO,
    cargoNome: "TECNICO",
  };
  assert.equal(
    mensagemAlteracaoDiretaImplantacao({
      atuais: [vagaVazia],
      propostas: [vagaVazia],
      ativos: [brunoAtivo],
    }),
    null
  );
  assert.equal(
    mensagemAlteracaoDiretaImplantacao({
      atuais: [vagaVazia],
      propostas: [
        {
          ...brunoNaVaga,
          colaboradorOrigemId: CADASTRO,
        },
      ],
      ativos: [brunoAtivo],
    }),
    null
  );
  assert.equal(
    mensagemAlteracaoDiretaImplantacao({
      atuais: [brunoNaVaga],
      propostas: [{ ...brunoNaVaga, colaborador: "BRUNO LIMA" }],
      ativos: [brunoAtivo],
    }),
    MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO
  );
  assert.equal(
    mensagemAlteracaoDiretaImplantacao({
      atuais: [brunoNaVaga],
      propostas: [{ ...brunoNaVaga, cargoNome: "ANALISTA" }],
      ativos: [brunoAtivo],
    }),
    MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO
  );
  assert.equal(
    mensagemAlteracaoDiretaImplantacao({
      atuais: [brunoNaVaga],
      propostas: [{ ...brunoNaVaga, colaboradorCpf: CPF_CARLA }],
      ativos: [brunoAtivo],
    }),
    MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO
  );
  assert.equal(
    mensagemAlteracaoDiretaImplantacao({
      atuais: [vagaVazia],
      propostas: [{ ...brunoNaVaga, cargoNome: "ANALISTA" }],
      ativos: [brunoAtivo],
    }),
    MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO
  );
  assert.equal(
    mensagemAlteracaoDiretaImplantacao({
      atuais: [vagaVazia],
      propostas: [
        {
          indice: 1,
          colaborador: "CARLA",
          colaboradorCpf: CPF_CARLA,
          colaboradorOrigemId: null,
          cargoNome: "AUXILIAR",
        },
      ],
      ativos: [brunoAtivo],
    }),
    MENSAGEM_CADASTRE_COLABORADOR
  );
  assert.equal(
    mensagemAlteracaoDiretaImplantacao({
      atuais: [brunoNaVaga],
      propostas: [
        {
          indice: 1,
          colaborador: null,
          colaboradorCpf: null,
          colaboradorOrigemId: null,
          cargoNome: "",
        },
      ],
      ativos: [brunoAtivo],
    }),
    null
  );
  assert.equal(
    mensagemAlteracaoDiretaImplantacao({
      atuais: [brunoNaVaga],
      propostas: [{ ...brunoNaVaga, manterAsoAberto: true, colaborador: null }],
      ativos: [brunoAtivo],
    }),
    null
  );
  assert.equal(
    planilhaTemPessoaForaDaEmpresa(
      [{ cpfDigits: CPF_CARLA }],
      [brunoAtivo]
    ),
    true
  );
  assert.equal(
    planilhaTemPessoaForaDaEmpresa([{ cpfDigits: CPF_BRUNO }], [brunoAtivo]),
    false
  );
}

const servico = readFileSync(
  join(process.cwd(), "services/contrato-vagas.service.ts"),
  "utf8"
);
assert.match(servico, /confirmarOcupacaoNoServidor/);
assert.match(servico, /ocupacao-vaga/);
const ocupacao = readFileSync(
  join(process.cwd(), "services/colaborador-vaga-ocupacao.server.ts"),
  "utf8"
);
assert.match(ocupacao, /mensagemAlteracaoDiretaImplantacao/);
assert.match(ocupacao, /mensagemConflitoVinculoLista/);
assert.match(ocupacao, /tipo: "cadastro"/);
assert.match(ocupacao, /data_evento: null/);
assert.doesNotMatch(ocupacao, /tipo: "admissao"/);
const aba = readFileSync(
  join(process.cwd(), "components/orcamentos/OrcamentoAbaFuncionarios.tsx"),
  "utf8"
);
assert.match(aba, /MENSAGEM_CADASTRE_COLABORADOR/);
assert.match(aba, /MENSAGEM_ALTERACAO_DIRETA_IMPLANTACAO/);
assert.match(aba, /Definir colaborador/);
assert.match(aba, /data-vaga-texto="nome"/);
assert.doesNotMatch(aba, /data-vaga-cell=/);
assert.match(aba, /Usar lista de colaboradores do cliente/);
assert.doesNotMatch(aba, /Baixar modelo Excel/);
assert.doesNotMatch(aba, /Importar lista/);
assert.doesNotMatch(aba, /Exportar lista/);
assert.match(aba, /Abrir Cliente/);
assert.match(aba, /textoConfirmacaoLiberarVaga/);
assert.match(aba, /vagaComprometidaResidual/);
const regras = readFileSync(join(process.cwd(), "lib/contrato-vagas.ts"), "utf8");
assert.match(regras, /Desvincular da vaga/);
assert.match(regras, /Liberar vaga/);
assert.match(
  regras,
  /A vaga ficará em aberto\. O colaborador continuará cadastrado em Clientes → Colaboradores\./
);

{
  const livre = {
    indice: 22,
    id: "vaga-22",
    colaborador: null,
    colaboradorCpf: null,
    colaboradorOrigemId: null,
    cargoNome: null,
    status: "aberta",
  };
  const ocupada = {
    indice: 1,
    id: "vaga-1",
    colaborador: "BRUNO",
    colaboradorCpf: CPF_BRUNO,
    colaboradorOrigemId: CADASTRO,
    cargoNome: "TECNICO",
    status: "comprometida",
  };
  const gabriel = {
    indice: 22,
    vagaId: "vaga-22",
    colaborador: "GABRIEL FERNANDES FERREIRA",
    colaboradorCpf: CPF_CARLA,
    colaboradorOrigemId: "cadastro-gabriel",
    cargoNome: "ANALISTA",
  };
  const gabrielAtivo = {
    id: "cadastro-gabriel",
    cadastroId: "cadastro-gabriel",
    cpfDigits: CPF_CARLA,
    situacao: "ativo" as const,
    nome: "GABRIEL FERNANDES FERREIRA",
    cargo: "ANALISTA",
  };
  assert.equal(
    mensagemConflitoVinculoLista({
      atuais: [ocupada, livre],
      propostas: [ocupada, gabriel],
      pessoas: [brunoAtivo, gabrielAtivo],
    }),
    null
  );
  assert.equal(ocupada.colaborador, "BRUNO");
  assert.equal(
    mensagemConflitoVinculoLista({
      atuais: [
        ocupada,
        {
          ...livre,
          colaborador: "OUTRA PESSOA",
          colaboradorCpf: CPF_BRUNO,
          colaboradorOrigemId: "outra",
          status: "comprometida",
        },
      ],
      propostas: [gabriel],
      pessoas: [brunoAtivo, gabrielAtivo],
    }),
    MENSAGEM_CONFLITO_LISTA_VAGAS
  );
  assert.equal(
    mensagemConflitoVinculoLista({
      atuais: [
        {
          ...ocupada,
          colaborador: "GABRIEL FERNANDES FERREIRA",
          colaboradorCpf: CPF_CARLA,
          colaboradorOrigemId: "cadastro-gabriel",
          cargoNome: "ANALISTA",
        },
        livre,
      ],
      propostas: [gabriel],
      pessoas: [gabrielAtivo],
    }),
    MENSAGEM_CONFLITO_LISTA_VAGAS
  );
  assert.equal(
    mensagemConflitoVinculoLista({
      atuais: [livre],
      propostas: [gabriel],
      pessoas: [{ ...gabrielAtivo, situacao: "demitido" }],
    }),
    MENSAGEM_CONFLITO_LISTA_VAGAS
  );
  assert.equal(
    mensagemConflitoVinculoLista({
      atuais: [livre],
      propostas: [{ ...gabriel, cargoNome: "AUXILIAR" }],
      pessoas: [gabrielAtivo],
    }),
    MENSAGEM_CONFLITO_LISTA_VAGAS
  );
  assert.equal(
    mensagemConflitoVinculoLista({
      atuais: [livre],
      propostas: [{ ...gabriel, manterAsoAberto: true, colaborador: null }],
      pessoas: [gabrielAtivo],
    }),
    null
  );
}

console.log("test-colaborador-vaga-ocupacao: ok");
