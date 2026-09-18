/**
 * Portal — histórico de avaliações de Riscos Psicossociais.
 * Executar: npx tsx scripts/test-portal-riscos-avaliacoes.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  escolherCampanhaPortalDaEmpresa,
  extrairCategoriasDoSnapshot,
  historicoResultadosComparaveis,
  labelStatusClientePortal,
  labelTotalParticipantesPortal,
  montarHistoricoRiscosPortal,
  montarListaCampanhasPortal,
  montarPortalResumo,
  montarPrincipaisResultadosPortal,
  pathPortalRelatorioPdf,
  portalResumoVazio,
  type PortalCampanhaFonte,
  type PortalParticipanteFonte,
  type PortalSnapshotFonte,
} from "../lib/portal-cliente";
import { autorizarDownloadRelatorioPortal } from "../lib/portal-riscos-relatorio";
import type { RiscosRelatorioResultadoJson } from "../lib/riscos-relatorio";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function campanha(
  partial: Partial<PortalCampanhaFonte> & Pick<PortalCampanhaFonte, "id" | "status">
): PortalCampanhaFonte {
  return {
    empresa_nome: "ACS - ASSOCIACAO DE CAPELANIA NA SAUDE",
    data_inicio: "2026-08-20",
    data_encerramento: "2026-08-30",
    created_at: "2026-08-01T12:00:00.000Z",
    ...partial,
  };
}

function jsonSnapshot(over?: Partial<RiscosRelatorioResultadoJson>): RiscosRelatorioResultadoJson {
  return {
    versao: 2,
    capa: {
      empresaNome: "ACS",
      codigoPublico: "XYZ999",
      dataInicio: "2026-08-20",
      dataEncerramento: "2026-08-30",
      participantes: 3,
      respondentes: 3,
      pendentes: 0,
      taxaParticipacao: 100,
    },
    resumoExecutivo: {
      participacaoPercentual: 100,
      statusGeralMensagem: "ok",
      quantidadeDimensoes: 3,
      dimensoesCriticas: [],
    },
    dimensoes: [
      {
        id: "demandas-trabalho",
        nome: "Demandas de Trabalho",
        tipo: "RISCO",
        entraNoCalculo: true,
        media: 0.4,
        classificacaoId: "situacao_favoravel",
        classificacaoLabel: "Situação Favorável",
        classificacaoInterpretacao: "",
        cor: "#16a34a",
        respondentesValidos: 3,
        descricao: "",
      },
      {
        id: "significado-trabalho",
        nome: "Significado do trabalho e comprometimento",
        tipo: "PROTECAO",
        entraNoCalculo: true,
        media: 3.5,
        classificacaoId: "situacao_favoravel",
        classificacaoLabel: "Situação Favorável",
        classificacaoInterpretacao: "",
        cor: "#16a34a",
        respondentesValidos: 3,
        descricao: "",
      },
      {
        id: "relacoes-interpessoais",
        nome: "Relações interpessoais",
        tipo: "PROTECAO",
        entraNoCalculo: true,
        media: 3.1,
        classificacaoId: "situacao_favoravel",
        classificacaoLabel: "Situação Favorável",
        classificacaoInterpretacao: "",
        cor: "#16a34a",
        respondentesValidos: 3,
        descricao: "",
      },
      {
        id: "influencia-desenvolvimento",
        nome: "Influência e possibilidade de desenvolvimento",
        tipo: "PROTECAO",
        entraNoCalculo: true,
        media: 2.0,
        classificacaoId: "risco_intermediario",
        classificacaoLabel: "Situação Moderada",
        classificacaoInterpretacao: "",
        cor: "#ca8a04",
        respondentesValidos: 3,
        descricao: "",
      },
      {
        id: "interface-trabalho-individuo",
        nome: "Interface trabalho-indivíduo",
        tipo: "PROTECAO",
        entraNoCalculo: true,
        media: 1.9,
        classificacaoId: "risco_intermediario",
        classificacaoLabel: "Situação Moderada",
        classificacaoInterpretacao: "",
        cor: "#ca8a04",
        respondentesValidos: 3,
        descricao: "",
      },
      {
        id: "saude-geral",
        nome: "Saúde Geral",
        tipo: "SAUDE",
        entraNoCalculo: true,
        media: 1.8,
        classificacaoId: "risco_intermediario",
        classificacaoLabel: "Situação Moderada",
        classificacaoInterpretacao: "",
        cor: "#ca8a04",
        respondentesValidos: 3,
        descricao: "",
      },
    ],
    comportamentosOfensivos: {
      titulo: "Comportamentos Ofensivos",
      respondentesComAlgumaResposta: 0,
      media: null,
      classificacao: null,
      itens: [],
    },
    conclusao: null,
    recomendacoes: null,
    ...over,
  };
}

function snapshotLiberado(): PortalSnapshotFonte {
  return {
    gerado_em: "2026-08-31T14:00:00.000Z",
    relatorio_enviado_em: "2026-08-31T15:00:00.000Z",
    resultado_json: jsonSnapshot(),
  };
}

function tresConcluidos(): PortalParticipanteFonte[] {
  return [
    { nome_completo: "Claudia Kiyomi Sumi", status: "respondido" },
    { nome_completo: "Denis de Paula Cavalcanti", status: "respondido" },
    { nome_completo: "Elenilza Ribeiro da Silva", status: "respondido" },
  ];
}

const CLIENTE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLIENTE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CAMP_2026 = "11111111-1111-4111-8111-111111111111";
const CAMP_2027 = "22222222-2222-4222-8222-222222222222";
const CAMP_2028 = "33333333-3333-4333-8333-333333333333";
const CAMP_2026_B = "44444444-4444-4444-8444-444444444444";
const REL_2026 = "55555555-5555-4555-8555-555555555555";

run("1. lista uma campanha", () => {
  const lista = montarListaCampanhasPortal({
    campanhas: [campanha({ id: CAMP_2026, status: "encerrada" })],
    participantesPorCampanha: new Map([[CAMP_2026, tresConcluidos()]]),
    snapshots: [
      {
        campanha_id: CAMP_2026,
        cliente_id: CLIENTE_A,
        gerado_em: "2026-08-31T14:00:00.000Z",
        relatorio_enviado_em: "2026-08-31T15:00:00.000Z",
        resultado_json: jsonSnapshot(),
      },
    ],
  });
  assert.equal(lista.length, 1);
  assert.equal(lista[0]?.label, "Ciclo 2026");
  assert.equal(lista[0]?.respondidos, 3);
  assert.equal(lista[0]?.cadastrados, 3);
});

run("2. lista múltiplas campanhas", () => {
  const lista = montarListaCampanhasPortal({
    campanhas: [
      campanha({ id: CAMP_2026, status: "encerrada", data_inicio: "2026-08-20" }),
      campanha({
        id: CAMP_2027,
        status: "aberta",
        data_inicio: "2027-08-15",
        data_encerramento: "2027-08-25",
        created_at: "2027-08-01T00:00:00.000Z",
      }),
    ],
    participantesPorCampanha: new Map([
      [CAMP_2026, tresConcluidos()],
      [
        CAMP_2027,
        [
          ...tresConcluidos(),
          { nome_completo: "Pendente Um", status: "pendente" },
        ],
      ],
    ]),
    snapshots: [],
  });
  assert.equal(lista.length, 2);
});

run("3. mais recente primeiro", () => {
  const lista = montarListaCampanhasPortal({
    campanhas: [
      campanha({
        id: CAMP_2026,
        status: "encerrada",
        data_inicio: "2026-08-20",
        created_at: "2026-08-01T00:00:00.000Z",
      }),
      campanha({
        id: CAMP_2027,
        status: "encerrada",
        data_inicio: "2027-08-15",
        created_at: "2027-08-01T00:00:00.000Z",
      }),
      campanha({
        id: CAMP_2028,
        status: "aberta",
        data_inicio: "2028-08-10",
        created_at: "2028-08-01T00:00:00.000Z",
      }),
    ],
    participantesPorCampanha: new Map(),
    snapshots: [],
  });
  assert.deepEqual(
    lista.map((c) => c.campanhaId),
    [CAMP_2028, CAMP_2027, CAMP_2026]
  );
});

run("4. duas campanhas no mesmo ano", () => {
  const lista = montarListaCampanhasPortal({
    campanhas: [
      campanha({
        id: CAMP_2026,
        status: "encerrada",
        data_inicio: "2026-02-01",
        data_encerramento: "2026-02-10",
      }),
      campanha({
        id: CAMP_2026_B,
        status: "encerrada",
        data_inicio: "2026-08-20",
        data_encerramento: "2026-08-30",
        created_at: "2026-08-02T00:00:00.000Z",
      }),
    ],
    participantesPorCampanha: new Map(),
    snapshots: [],
  });
  assert.equal(lista.length, 2);
  assert.notEqual(lista[0]?.label, lista[1]?.label);
  assert.match(lista[0]?.label ?? "", /Ciclo 2026/);
  assert.match(lista[1]?.label ?? "", /Ciclo 2026/);
  assert.equal(lista[0]?.campanhaId, CAMP_2026_B);
});

run("5. campanha em andamento", () => {
  const lista = montarListaCampanhasPortal({
    campanhas: [campanha({ id: CAMP_2027, status: "aberta", data_inicio: "2027-08-15" })],
    participantesPorCampanha: new Map([
      [
        CAMP_2027,
        [
          { nome_completo: "A", status: "respondido" },
          { nome_completo: "B", status: "pendente" },
        ],
      ],
    ]),
    snapshots: [],
  });
  assert.equal(lista[0]?.statusLabel, "Em andamento");
  assert.equal(lista[0]?.relatorioDisponivel, false);
});

run("6. campanha concluída", () => {
  const lista = montarListaCampanhasPortal({
    campanhas: [campanha({ id: CAMP_2026, status: "encerrada" })],
    participantesPorCampanha: new Map([[CAMP_2026, tresConcluidos()]]),
    snapshots: [],
  });
  assert.equal(lista[0]?.statusLabel, "Concluída");
  assert.equal(lista[0]?.relatorioDisponivel, false);
});

run("7. participação parcial", () => {
  const lista = montarListaCampanhasPortal({
    campanhas: [campanha({ id: CAMP_2027, status: "aberta" })],
    participantesPorCampanha: new Map([
      [
        CAMP_2027,
        [
          ...Array.from({ length: 8 }, (_, i) => ({
            nome_completo: `P${i}`,
            status: "respondido" as const,
          })),
          { nome_completo: "Pend1", status: "pendente" },
          { nome_completo: "Pend2", status: "pendente" },
        ],
      ],
    ]),
    snapshots: [],
  });
  assert.equal(lista[0]?.respondidos, 8);
  assert.equal(lista[0]?.cadastrados, 10);
  assert.equal(lista[0]?.participacaoPercentual, 80);
});

run("8. participação 100%", () => {
  const lista = montarListaCampanhasPortal({
    campanhas: [campanha({ id: CAMP_2026, status: "aberta" })],
    participantesPorCampanha: new Map([[CAMP_2026, tresConcluidos()]]),
    snapshots: [],
  });
  assert.equal(lista[0]?.participacaoPercentual, 100);
  assert.equal(lista[0]?.pendentes, 0);
});

run("9. 100% não significa automaticamente concluída", () => {
  const lista = montarListaCampanhasPortal({
    campanhas: [campanha({ id: CAMP_2026, status: "aberta" })],
    participantesPorCampanha: new Map([[CAMP_2026, tresConcluidos()]]),
    snapshots: [],
  });
  assert.equal(lista[0]?.statusPortal, "concluida");
  assert.equal(lista[0]?.statusLabel, "Em andamento");
  assert.equal(
    labelStatusClientePortal({
      statusPortal: "concluida",
      statusCampanha: "aberta",
    }),
    "Em andamento"
  );
});

run("10. campanha sem relatório não mostra download", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: CAMP_2026, status: "encerrada" }),
    participantes: tresConcluidos(),
    snapshot: null,
  });
  assert.equal(resumo.relatorioDisponivel, false);
  const detalhe = readFileSync(
    join(process.cwd(), "components/portal-cliente/PortalCampanhaDetalhe.tsx"),
    "utf8"
  );
  assert.match(detalhe, /temResultados \?/);
  assert.match(detalhe, /Baixar relatório em PDF/);
});

run("11. campanha com relatório mostra download", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: CAMP_2026, status: "encerrada" }),
    participantes: tresConcluidos(),
    snapshot: snapshotLiberado(),
  });
  assert.equal(resumo.relatorioDisponivel, true);
  assert.ok(pathPortalRelatorioPdf(CAMP_2026, CLIENTE_A).includes(CAMP_2026));
});

run("12. PDF corresponde ao campanhaId", () => {
  const pathA = pathPortalRelatorioPdf(CAMP_2026, CLIENTE_A);
  const pathB = pathPortalRelatorioPdf(CAMP_2027, CLIENTE_A);
  assert.match(pathA, new RegExp(CAMP_2026));
  assert.doesNotMatch(pathA, new RegExp(CAMP_2027));
  assert.notEqual(pathA, pathB);
});

run("13. campanha de outro cliente não é escolhida", () => {
  const daEmpresa = [
    campanha({ id: CAMP_2026, status: "encerrada" }),
  ];
  assert.equal(
    escolherCampanhaPortalDaEmpresa(daEmpresa, CAMP_2027),
    null
  );
  assert.equal(
    escolherCampanhaPortalDaEmpresa(daEmpresa, CAMP_2026)?.id,
    CAMP_2026
  );
});

run("14. PDF de outro cliente não pode ser baixado", () => {
  const outro = autorizarDownloadRelatorioPortal({
    campanhaId: CAMP_2026,
    clienteId: CLIENTE_B,
    campanha: {
      id: CAMP_2026,
      cliente_id: CLIENTE_A,
      empresa_nome: "ACS",
      status: "encerrada",
    },
    relatorio: {
      id: REL_2026,
      campanha_id: CAMP_2026,
      cliente_id: CLIENTE_A,
      gerado_em: "2026-08-31T14:00:00.000Z",
      relatorio_enviado_em: "2026-08-31T15:00:00.000Z",
      resultado_json: jsonSnapshot(),
    },
  });
  assert.equal(outro.ok, false);
  if (!outro.ok) assert.equal(outro.status, 404);

  const ok = autorizarDownloadRelatorioPortal({
    campanhaId: CAMP_2026,
    clienteId: CLIENTE_A,
    campanha: {
      id: CAMP_2026,
      cliente_id: CLIENTE_A,
      empresa_nome: "ACS",
      status: "encerrada",
    },
    relatorio: {
      id: REL_2026,
      campanha_id: CAMP_2026,
      cliente_id: CLIENTE_A,
      gerado_em: "2026-08-31T14:00:00.000Z",
      relatorio_enviado_em: "2026-08-31T15:00:00.000Z",
      resultado_json: jsonSnapshot(),
    },
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.campanhaId, CAMP_2026);
    assert.equal(ok.relatorioId, REL_2026);
  }
});

run("15. resultados vêm do snapshot", () => {
  const extraido = extrairCategoriasDoSnapshot(jsonSnapshot());
  assert.equal(extraido.favoraveis.length, 3);
  assert.equal(extraido.atencao.length, 3);
  assert.equal(extraido.desfavoraveis.length, 0);
  const resumo = montarPortalResumo({
    campanha: campanha({ id: CAMP_2026, status: "encerrada" }),
    participantes: tresConcluidos(),
    snapshot: snapshotLiberado(),
  });
  assert.deepEqual(
    resumo.categoriasFavoraveis.map((c) => c.nome),
    extraido.favoraveis.map((c) => c.nome)
  );
});

run("16. Portal não recalcula COPSOQ", () => {
  const json = jsonSnapshot({
    dimensoes: [
      {
        id: "saude-geral",
        nome: "Saúde Geral",
        tipo: "SAUDE",
        entraNoCalculo: true,
        media: 0.1,
        classificacaoId: "risco_para_saude",
        classificacaoLabel: "Situação Desfavorável",
        classificacaoInterpretacao: "",
        cor: "#dc2626",
        respondentesValidos: 3,
        descricao: "",
      },
    ],
  });
  const extraido = extrairCategoriasDoSnapshot(json);
  assert.equal(extraido.desfavoraveis.length, 1);
  assert.equal(extraido.favoraveis.length, 0);
  const lib = readFileSync(
    join(process.cwd(), "lib/portal-cliente.ts"),
    "utf8"
  );
  assert.match(lib, /extrairCategoriasDoSnapshot/);
  assert.match(lib, /classificacaoId/);
  assert.doesNotMatch(lib, /classificarDimensaoCopsoq/);
  const svc = readFileSync(
    join(process.cwd(), "services/portal-home.server.ts"),
    "utf8"
  );
  assert.doesNotMatch(svc, /classificarDimensao/);
});

run("17. primeiro ciclo mostra mensagem de histórico", () => {
  const hist = montarHistoricoRiscosPortal({
    clienteId: CLIENTE_A,
    campanhas: [campanha({ id: CAMP_2026, status: "encerrada" })],
    snapshots: [
      {
        campanha_id: CAMP_2026,
        cliente_id: CLIENTE_A,
        gerado_em: "2026-08-31T14:00:00.000Z",
        relatorio_enviado_em: "2026-08-31T15:00:00.000Z",
        resultado_json: jsonSnapshot(),
      },
    ],
  });
  assert.equal(hist.length, 1);
  assert.equal(historicoResultadosComparaveis(hist), false);
  const evolucao = readFileSync(
    join(process.cwd(), "components/portal-cliente/PortalEvolucaoRiscos.tsx"),
    "utf8"
  );
  assert.match(evolucao, /Este é o primeiro ciclo registrado/);
  assert.match(evolucao, /PORTAL_HISTORICO_UM_CICLO_MSG/);
  assert.match(evolucao, /historicoResultadosComparaveis/);
});

run("18. dois ciclos mostram comparação quando comparáveis", () => {
  const hist = montarHistoricoRiscosPortal({
    clienteId: CLIENTE_A,
    campanhas: [
      campanha({ id: CAMP_2026, status: "encerrada", data_inicio: "2026-08-20" }),
      campanha({
        id: CAMP_2027,
        status: "encerrada",
        data_inicio: "2027-08-15",
        created_at: "2027-08-01T00:00:00.000Z",
      }),
    ],
    snapshots: [
      {
        campanha_id: CAMP_2026,
        cliente_id: CLIENTE_A,
        gerado_em: "2026-08-31T14:00:00.000Z",
        relatorio_enviado_em: "2026-08-31T15:00:00.000Z",
        resultado_json: jsonSnapshot(),
      },
      {
        campanha_id: CAMP_2027,
        cliente_id: CLIENTE_A,
        gerado_em: "2027-08-31T14:00:00.000Z",
        relatorio_enviado_em: "2027-08-31T15:00:00.000Z",
        resultado_json: jsonSnapshot(),
      },
    ],
  });
  assert.equal(hist.length, 2);
  assert.equal(historicoResultadosComparaveis(hist), true);
});

run("19. participante concluído", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: CAMP_2026, status: "aberta" }),
    participantes: [{ nome_completo: "Claudia Kiyomi Sumi", status: "respondido" }],
    snapshot: null,
  });
  assert.equal(resumo.participantes[0]?.participacao, "concluida");
});

run("20. participante pendente", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: CAMP_2026, status: "aberta" }),
    participantes: [{ nome_completo: "Pendente Um", status: "pendente" }],
    snapshot: null,
  });
  assert.equal(resumo.participantes[0]?.participacao, "pendente");
});

run("20b. card Participantes usa o total cadastrado", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: CAMP_2026, status: "aberta" }),
    participantes: [
      ...Array.from({ length: 19 }, (_, i) => ({
        nome_completo: `Concluido ${i}`,
        status: "respondido" as const,
      })),
      ...Array.from({ length: 9 }, (_, i) => ({
        nome_completo: `Pendente ${i}`,
        status: "pendente" as const,
      })),
    ],
    snapshot: null,
  });
  assert.equal(resumo.cadastrados, 28);
  assert.equal(resumo.respondidos, 19);
  assert.equal(resumo.pendentes, 9);
  assert.equal(resumo.participacaoPercentual, 68);
  assert.equal(
    labelTotalParticipantesPortal(resumo.cadastrados),
    "28 colaboradores participam desta avaliação"
  );
  assert.notEqual(
    labelTotalParticipantesPortal(resumo.cadastrados),
    labelTotalParticipantesPortal(resumo.respondidos)
  );
  assert.equal(
    labelTotalParticipantesPortal(1),
    "1 colaborador participa desta avaliação"
  );
  const detalhe = readFileSync(
    join(process.cwd(), "components/portal-cliente/PortalCampanhaDetalhe.tsx"),
    "utf8"
  );
  assert.match(detalhe, /labelTotalParticipantesPortal\(resumo\.cadastrados\)/);
  assert.doesNotMatch(
    detalhe,
    /labelTotalParticipantesPortal\(resumo\.respondidos\)/
  );
});

run("21. respostas individuais não são expostas", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: CAMP_2026, status: "encerrada" }),
    participantes: tresConcluidos(),
    snapshot: snapshotLiberado(),
    campanhasLista: montarListaCampanhasPortal({
      campanhas: [campanha({ id: CAMP_2026, status: "encerrada" })],
      participantesPorCampanha: new Map([[CAMP_2026, tresConcluidos()]]),
      snapshots: [
        {
          campanha_id: CAMP_2026,
          cliente_id: CLIENTE_A,
          ...snapshotLiberado(),
        },
      ],
    }),
  });
  const json = JSON.stringify(resumo);
  assert.doesNotMatch(json, /XYZ999/);
  assert.doesNotMatch(json, /alternativa_id/);
  assert.doesNotMatch(json, /resultado_json/);
  for (const p of resumo.participantes) {
    assert.deepEqual(Object.keys(p).sort(), ["nome", "participacao"]);
  }
});

run("22. troca de empresa limpa campanha anterior", () => {
  const a = montarPortalResumo({
    campanha: campanha({
      id: CAMP_2026,
      status: "encerrada",
      empresa_nome: "EMPRESA A",
    }),
    participantes: tresConcluidos(),
    snapshot: snapshotLiberado(),
  });
  const b = montarPortalResumo({
    campanha: campanha({
      id: CAMP_2027,
      status: "aberta",
      empresa_nome: "EMPRESA B",
      data_inicio: "2027-08-15",
    }),
    participantes: [{ nome_completo: "Outro", status: "pendente" }],
    snapshot: null,
  });
  assert.notEqual(a.campanhaId, b.campanhaId);
  assert.equal(a.empresaNome, "EMPRESA A");
  assert.equal(b.empresaNome, "EMPRESA B");
  assert.equal(b.relatorioDisponivel, false);
  assert.equal(b.categoriasFavoraveis.length, 0);
  const home = readFileSync(
    join(process.cwd(), "components/portal-cliente/PortalHome.tsx"),
    "utf8"
  );
  assert.match(home, /selecionarEmpresa/);
  assert.match(home, /view: null/);
  assert.match(home, /campanha: null/);
  assert.match(home, /setResumo\(portalResumoVazio\(\)\)/);
});

run("23. campanha sem desfavoráveis", () => {
  const principais = montarPrincipaisResultadosPortal({
    categoriasFavoraveis: [
      { id: "a", nome: "Demandas de Trabalho", classificacao: "favoravel", label: "Situação Favorável" },
    ],
    categoriasAtencao: [
      { id: "b", nome: "Saúde Geral", classificacao: "atencao", label: "Situação Moderada" },
    ],
    categoriasDesfavoraveis: [],
  });
  assert.equal(principais.semDesfavoraveis, true);
  const detalhe = readFileSync(
    join(process.cwd(), "components/portal-cliente/PortalCampanhaDetalhe.tsx"),
    "utf8"
  );
  assert.match(
    detalhe,
    /Nenhuma categoria em situação desfavorável neste ciclo/
  );
});

run("24. indicadores complementares continuam separados", () => {
  const resumo = montarPortalResumo({
    campanha: campanha({ id: CAMP_2026, status: "encerrada" }),
    participantes: tresConcluidos(),
    snapshot: snapshotLiberado(),
  });
  const totalCategorias =
    resumo.categoriasFavoraveis.length +
    resumo.categoriasAtencao.length +
    resumo.categoriasDesfavoraveis.length;
  assert.equal(totalCategorias, 6);
  assert.equal(resumo.indicadoresComplementaresDisponivel, true);
  const principais = montarPrincipaisResultadosPortal(resumo);
  assert.equal(principais.indicadorComplementarAtencao, false);
  const detalhe = readFileSync(
    join(process.cwd(), "components/portal-cliente/PortalCampanhaDetalhe.tsx"),
    "utf8"
  );
  assert.match(detalhe, /Indicadores complementares/);
  assert.match(detalhe, /Comportamentos ofensivos/);
  assert.doesNotMatch(detalhe, /categoriasFavoraveis\.length \+ .*ofensiv/);
});

run("25. estado vazio sem campanhas", () => {
  const lista = montarListaCampanhasPortal({
    campanhas: [],
    participantesPorCampanha: new Map(),
    snapshots: [],
  });
  assert.deepEqual(lista, []);
  const vazio = portalResumoVazio();
  assert.deepEqual(vazio.campanhasLista, []);
  const ui = readFileSync(
    join(process.cwd(), "components/portal-cliente/PortalHistoricoAvaliacoes.tsx"),
    "utf8"
  );
  assert.match(ui, /PORTAL_SEM_CAMPANHAS_MSG/);
});

run("PDF reutiliza o mesmo gerador e template", () => {
  const svc = readFileSync(
    join(process.cwd(), "services/portal-riscos-relatorio.server.ts"),
    "utf8"
  );
  const route = readFileSync(
    join(
      process.cwd(),
      "app/api/portal/riscos/relatorio/[campanhaId]/pdf/route.ts"
    ),
    "utf8"
  );
  assert.match(svc, /gerarPdfRelatorioRiscosBuffer/);
  assert.match(svc, /criarRelatorioPrintToken/);
  assert.match(svc, /buscarRelatorioPorCampanhaId/);
  assert.match(route, /requirePortalStaffUser/);
  assert.match(route, /cliente_id/);
});

console.log("test-portal-riscos-avaliacoes: OK");
