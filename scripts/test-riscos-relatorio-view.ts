/**
 * Helpers de apresentação do relatório executivo (V2) — sem recalcular COPSOQ.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RiscosRelatorioDimensaoSnapshot } from "../lib/riscos-relatorio";
import {
  corCategoriaPorId,
  corPorClassificacaoId,
  dimensoesOrdenadasPorMediaDesc,
  eixoMaxColunas,
  montarDadosBarras,
  montarDadosColunasPorTipo,
  montarDadosRadar,
  montarRankingAtencao,
  rankingAtencao,
  rankingGeralPorFavorabilidade,
  rankingMelhores,
  scoreFavorabilidade,
  contarFaixasClassificacao,
  statusGeralResumo,
  valorVisualBarraDimensao,
} from "../lib/riscos-relatorio-view";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function dim(
  partial: Partial<RiscosRelatorioDimensaoSnapshot> &
    Pick<
      RiscosRelatorioDimensaoSnapshot,
      "id" | "nome" | "tipo" | "media" | "classificacaoId"
    >
): RiscosRelatorioDimensaoSnapshot {
  return {
    entraNoCalculo: true,
    classificacaoLabel: partial.classificacaoId,
    classificacaoInterpretacao: "",
    cor: "#000",
    respondentesValidos: 10,
    descricao: "",
    ...partial,
  };
}

const amostra: RiscosRelatorioDimensaoSnapshot[] = [
  dim({
    id: "a",
    nome: "Demandas de Trabalho",
    tipo: "RISCO",
    media: 3.8,
    classificacaoId: "risco_para_saude",
  }),
  dim({
    id: "b",
    nome: "Liderança",
    tipo: "PROTECAO",
    media: 3.9,
    classificacaoId: "situacao_favoravel",
  }),
  dim({
    id: "c",
    nome: "Burnout e Estresse",
    tipo: "RISCO",
    media: 2.5,
    classificacaoId: "risco_intermediario",
  }),
  dim({
    id: "d",
    nome: "Saúde Geral",
    tipo: "PROTECAO",
    media: 3.5,
    classificacaoId: "situacao_favoravel",
  }),
  dim({
    id: "e",
    nome: "Valores",
    tipo: "PROTECAO",
    media: 2.5,
    classificacaoId: "risco_intermediario",
  }),
  dim({
    id: "f",
    nome: "Ofensivos",
    tipo: "RISCO",
    media: null,
    classificacaoId: "classificacao_nao_definida",
    entraNoCalculo: false,
  }),
];

run("cores padronizadas por classificação oficial", () => {
  assert.equal(corPorClassificacaoId("situacao_favoravel"), "#16a34a");
  assert.equal(corPorClassificacaoId("risco_intermediario"), "#ca8a04");
  assert.equal(corPorClassificacaoId("risco_para_saude"), "#dc2626");
});

run("barras ordenadas da maior média para a menor", () => {
  const ordered = dimensoesOrdenadasPorMediaDesc(amostra);
  assert.equal(ordered[0].id, "b");
  assert.equal(ordered[0].media, 3.9);
  assert.equal(ordered[ordered.length - 1].media, 2.5);
});

run("barras: RISCO inverte comprimento visual; PROTEÇÃO preserva média técnica", () => {
  const perfeitoRisco = dim({
    id: "demandas-trabalho",
    nome: "Demandas de Trabalho",
    tipo: "RISCO",
    media: 0,
    classificacaoId: "situacao_favoravel",
    classificacaoLabel: "Situação Favorável",
  });
  const perfeitoProt = dim({
    id: "interface-trabalho-individuo",
    nome: "Interface trabalho-indivíduo",
    tipo: "PROTECAO",
    media: 4,
    classificacaoId: "situacao_favoravel",
    classificacaoLabel: "Situação Favorável",
  });
  const burnout = dim({
    id: "burnout-estresse",
    nome: "Burnout e Estresse",
    tipo: "RISCO",
    media: 0,
    classificacaoId: "situacao_favoravel",
  });
  const conflitos = dim({
    id: "conflitos-familia-trabalho",
    nome: "Conflitos família-trabalho",
    tipo: "RISCO",
    media: 0,
    classificacaoId: "situacao_favoravel",
  });
  const criticoRisco = dim({
    id: "critico",
    nome: "Risco alto",
    tipo: "RISCO",
    media: 4,
    classificacaoId: "risco_para_saude",
  });

  assert.equal(valorVisualBarraDimensao(perfeitoRisco), 1);
  assert.equal(valorVisualBarraDimensao(burnout), 1);
  assert.equal(valorVisualBarraDimensao(conflitos), 1);
  assert.equal(valorVisualBarraDimensao(perfeitoProt), 1);
  assert.equal(valorVisualBarraDimensao(criticoRisco), 0);
  assert.equal(
    valorVisualBarraDimensao({ media: 1, tipo: "RISCO", maxEscalaPadronizada: 4 }),
    0.75
  );
  assert.equal(
    valorVisualBarraDimensao({ media: 3, tipo: "RISCO", maxEscalaPadronizada: 4 }),
    0.25
  );

  const barras = montarDadosBarras([
    perfeitoRisco,
    perfeitoProt,
    burnout,
    conflitos,
    criticoRisco,
  ]);
  const byId = Object.fromEntries(barras.map((b) => [b.id, b]));
  assert.equal(byId["demandas-trabalho"].media, 0);
  assert.equal(byId["demandas-trabalho"].valorVisual, 1);
  assert.equal(byId["demandas-trabalho"].cor, "#16a34a");
  assert.equal(byId["burnout-estresse"].valorVisual, 1);
  assert.equal(byId["conflitos-familia-trabalho"].valorVisual, 1);
  assert.equal(byId["interface-trabalho-individuo"].media, 4);
  assert.equal(byId["interface-trabalho-individuo"].valorVisual, 1);
  assert.equal(byId["critico"].media, 4);
  assert.equal(byId["critico"].valorVisual, 0);
  assert.equal(byId["critico"].cor, "#dc2626");
  // Ordenação visual: maior favorabilidade primeiro
  assert.equal(barras[0].valorVisual >= barras[barras.length - 1].valorVisual, true);
});

run("radar ignora dimensões fora do cálculo", () => {
  const radar = montarDadosRadar(amostra);
  assert.equal(radar.length, 5);
  assert.equal(
    radar.every((r) => r.fullMark === 1 && typeof r.media === "number"),
    true
  );
});

run("colunas: PROTEÇÃO e RISCO separados; ofensivos fora", () => {
  const prot = montarDadosColunasPorTipo(amostra, "PROTECAO");
  const risco = montarDadosColunasPorTipo(amostra, "RISCO");
  assert.ok(prot.every((d) => String(d.tipo).toUpperCase() === "PROTECAO"));
  assert.ok(risco.every((d) => String(d.tipo).toUpperCase() === "RISCO"));
  assert.equal(
    prot.some((d) => d.id === "comportamentos-ofensivos"),
    false
  );
  assert.equal(
    risco.some((d) => d.id === "comportamentos-ofensivos"),
    false
  );
  // Cores estáveis por id (não classificação)
  for (const d of [...prot, ...risco]) {
    assert.equal(d.cor, corCategoriaPorId(d.id));
  }
  assert.equal(corCategoriaPorId("lideranca"), "#5B6C8F");
  assert.equal(corCategoriaPorId("demandas-trabalho"), "#D97757");
  assert.notEqual(corCategoriaPorId("lideranca"), corPorClassificacaoId("situacao_favoravel"));
  // Eixo respeita maior maxEscala do grupo sem converter médias
  const misto = [
    dim({
      id: "lideranca",
      nome: "Liderança",
      tipo: "PROTECAO",
      media: 3.1,
      maxEscalaPadronizada: 4,
      classificacaoId: "situacao_favoravel",
    }),
    dim({
      id: "interface-trabalho-individuo",
      nome: "Interface",
      tipo: "PROTECAO",
      media: 2.0,
      maxEscalaPadronizada: 3,
      classificacaoId: "situacao_favoravel",
    }),
  ];
  const cols = montarDadosColunasPorTipo(misto, "PROTECAO");
  assert.equal(eixoMaxColunas(cols), 4);
  assert.equal(cols.find((c) => c.id === "interface-trabalho-individuo")?.media, 2);
  assert.equal(cols.find((c) => c.id === "interface-trabalho-individuo")?.maxEscala, 3);
});

run("ranking melhores prioriza situação favorável", () => {
  const top = rankingMelhores(amostra, 2);
  assert.equal(top[0].classificacaoId, "situacao_favoravel");
  assert.equal(top.every((d) => d.entraNoCalculo), true);
  // Entre Favoráveis, maior favorabilidade: Liderança 3.9 > Saúde 3.5
  assert.equal(top[0].id, "b");
});

run("ranking geral ordena pela mesma métrica da barra (favorabilidade relativa)", () => {
  const geral = rankingGeralPorFavorabilidade(amostra);
  assert.ok(geral.length >= 5);
  for (let i = 1; i < geral.length; i++) {
    assert.ok(
      valorVisualBarraDimensao(geral[i - 1]) >=
        valorVisualBarraDimensao(geral[i]),
      `ordem quebrada em ${geral[i - 1].id} → ${geral[i].id}`
    );
  }
  const barras = montarDadosBarras(amostra);
  assert.deepEqual(
    geral.map((d) => d.id),
    barras.map((b) => b.id)
  );
});

run("ranking geral usa a barra, não a nota bruta nem a classificação", () => {
  const protEscala3 = dim({
    id: "interface-trabalho-individuo",
    nome: "Interface trabalho-indivíduo",
    tipo: "PROTECAO",
    media: 2.7,
    maxEscalaPadronizada: 3,
    classificacaoId: "situacao_favoravel",
    classificacaoLabel: "Situação Favorável",
  });
  const riscoEscala4 = dim({
    id: "demandas-trabalho",
    nome: "Demandas de Trabalho",
    tipo: "RISCO",
    media: 0.5,
    maxEscalaPadronizada: 4,
    classificacaoId: "situacao_favoravel",
    classificacaoLabel: "Situação Favorável",
  });
  const protModerada = dim({
    id: "valores-local-trabalho",
    nome: "Valores no local de trabalho",
    tipo: "PROTECAO",
    media: 2.0,
    maxEscalaPadronizada: 4,
    classificacaoId: "risco_intermediario",
    classificacaoLabel: "Situação Moderada",
  });
  const riscoDesfavoravel = dim({
    id: "burnout-estresse",
    nome: "Burnout e Estresse",
    tipo: "RISCO",
    media: 3.5,
    maxEscalaPadronizada: 4,
    classificacaoId: "risco_para_saude",
    classificacaoLabel: "Situação Desfavorável",
  });

  // /3 proteção 2,7 → barra 90%; /4 risco 0,5 → barra 87,5% (score absoluto 3,5)
  assert.ok(valorVisualBarraDimensao(protEscala3) > valorVisualBarraDimensao(riscoEscala4));
  assert.ok(scoreFavorabilidade(riscoEscala4) > scoreFavorabilidade(protEscala3));

  const geral = rankingGeralPorFavorabilidade([
    riscoDesfavoravel,
    protModerada,
    riscoEscala4,
    protEscala3,
  ]);
  assert.deepEqual(
    geral.map((d) => d.id),
    [
      "interface-trabalho-individuo",
      "demandas-trabalho",
      "valores-local-trabalho",
      "burnout-estresse",
    ]
  );
  for (let i = 1; i < geral.length; i++) {
    assert.ok(
      valorVisualBarraDimensao(geral[i - 1]) >= valorVisualBarraDimensao(geral[i])
    );
  }
});

run("ranking atenção prioriza risco para saúde", () => {
  const top = rankingAtencao(amostra, 2);
  assert.equal(top[0].classificacaoId, "risco_para_saude");
  assert.equal(top[0].id, "a");
  // Segunda: intermediário com menor favorabilidade
  // Burnout RISCO 2.5 → fav 1.5; Valores PROTEÇÃO 2.5 → fav 2.5 → burnout pior
  assert.equal(top[1].id, "c");
});

run("ranking: tudo Favorável não espelha Top melhores como problemas", () => {
  const todosFav = [
    dim({
      id: "demandas",
      nome: "Demandas",
      tipo: "RISCO",
      media: 0,
      classificacaoId: "situacao_favoravel",
      classificacaoLabel: "Situação Favorável",
    }),
    dim({
      id: "interface",
      nome: "Interface",
      tipo: "PROTECAO",
      media: 4,
      classificacaoId: "situacao_favoravel",
      classificacaoLabel: "Situação Favorável",
    }),
    dim({
      id: "lideranca",
      nome: "Liderança",
      tipo: "PROTECAO",
      media: 3.5,
      classificacaoId: "situacao_favoravel",
    }),
    dim({
      id: "valores",
      nome: "Valores",
      tipo: "PROTECAO",
      media: 3.2,
      classificacaoId: "situacao_favoravel",
    }),
    dim({
      id: "burnout",
      nome: "Burnout",
      tipo: "RISCO",
      media: 0.5,
      classificacaoId: "situacao_favoravel",
    }),
  ];
  const melhores = rankingMelhores(todosFav, 5);
  const atencao = montarRankingAtencao(todosFav, 5);

  assert.equal(atencao.semRiscosClassificados, true);
  assert.equal(atencao.itens.length, 0);
  assert.equal(atencao.prioritarias.length, 0);
  // Relatório 100% favorável: sem ranking relativo (evita falsa impressão de risco)
  assert.equal(atencao.relativasFavoraveis.length, 0);
  assert.equal(rankingAtencao(todosFav, 5).length, 0);
  // Top melhores continua listando as de maior favorabilidade
  assert.ok(melhores.length > 0);
  assert.ok(scoreFavorabilidade(melhores[0]) >= scoreFavorabilidade(melhores[1]));
});

run("ranking atenção: uma Intermediária fica em 1º; Favoráveis só depois", () => {
  const mixed = [
    dim({
      id: "fav1",
      nome: "Fav1",
      tipo: "PROTECAO",
      media: 4,
      classificacaoId: "situacao_favoravel",
    }),
    dim({
      id: "inter",
      nome: "Inter",
      tipo: "RISCO",
      media: 2.5,
      classificacaoId: "risco_intermediario",
      classificacaoLabel: "Situação Moderada",
    }),
    dim({
      id: "fav2",
      nome: "Fav2",
      tipo: "RISCO",
      media: 0,
      classificacaoId: "situacao_favoravel",
    }),
    dim({
      id: "fav3",
      nome: "Fav3",
      tipo: "PROTECAO",
      media: 3.0,
      classificacaoId: "situacao_favoravel",
    }),
  ];
  const r = montarRankingAtencao(mixed, 5);
  assert.equal(r.semRiscosClassificados, false);
  assert.equal(r.itens[0].id, "inter");
  assert.equal(r.prioritarias.length, 1);
  assert.ok(r.itens.length >= 2);
  assert.ok(
    r.itens.slice(1).every((d) => d.classificacaoId === "situacao_favoravel")
  );
});

run("score favorabilidade respeita tipo RISCO vs PROTEÇÃO", () => {
  assert.ok(
    scoreFavorabilidade({ media: 1, tipo: "RISCO" }) >
      scoreFavorabilidade({ media: 3, tipo: "RISCO" })
  );
  assert.ok(
    scoreFavorabilidade({ media: 3.5, tipo: "PROTECAO" }) >
      scoreFavorabilidade({ media: 2, tipo: "PROTECAO" })
  );
  assert.equal(scoreFavorabilidade({ media: 0, tipo: "RISCO", maxEscalaPadronizada: 4 }), 4);
  assert.equal(scoreFavorabilidade({ media: 4, tipo: "PROTECAO", maxEscalaPadronizada: 4 }), 4);
  assert.equal(scoreFavorabilidade({ media: 0, tipo: "RISCO", maxEscalaPadronizada: 3 }), 3);
});

run("status geral respeita três faixas oficiais", () => {
  assert.equal(statusGeralResumo({ dimensoesCriticasCount: 0 }).tom, "ok");
  assert.equal(statusGeralResumo({ dimensoesCriticasCount: 0 }).label, "Situação Favorável");
  // Agregado legado (intermediário+saúde) → atenção, nunca crítico automático
  assert.equal(statusGeralResumo({ dimensoesCriticasCount: 3 }).tom, "atencao");
  assert.equal(
    statusGeralResumo({ dimensoesCriticasCount: 3 }).label,
    "Atenção / Monitoramento"
  );
  assert.equal(
    statusGeralResumo({
      riscoIntermediarioCount: 2,
      riscoParaSaudeCount: 0,
    }).tom,
    "atencao"
  );
  assert.equal(
    statusGeralResumo({
      riscoIntermediarioCount: 2,
      riscoParaSaudeCount: 0,
    }).label,
    "Atenção / Monitoramento"
  );
  assert.equal(
    statusGeralResumo({
      riscoIntermediarioCount: 1,
      riscoParaSaudeCount: 1,
    }).tom,
    "critico"
  );
  assert.equal(
    statusGeralResumo({
      riscoIntermediarioCount: 0,
      riscoParaSaudeCount: 1,
    }).label,
    "Atenção prioritária"
  );
});

run("contarFaixasClassificacao separa intermediário e saúde", () => {
  const faixas = contarFaixasClassificacao([
    dim({
      id: "a",
      nome: "A",
      tipo: "RISCO",
      media: 1,
      classificacaoId: "situacao_favoravel",
      classificacaoLabel: "Situação Favorável",
    }),
    dim({
      id: "b",
      nome: "B",
      tipo: "RISCO",
      media: 2,
      classificacaoId: "risco_intermediario",
      classificacaoLabel: "Situação Moderada",
    }),
    dim({
      id: "c",
      nome: "C",
      tipo: "RISCO",
      media: 3,
      classificacaoId: "risco_para_saude",
      classificacaoLabel: "Situação Desfavorável",
    }),
  ]);
  assert.equal(faixas.favoravel, 1);
  assert.equal(faixas.intermediario, 1);
  assert.equal(faixas.riscoParaSaude, 1);
  assert.equal(faixas.emAtencao, 2);
});

run("texto do ranking descreve ordenação por favorabilidade da barra", () => {
  const src = readFileSync(
    join(process.cwd(), "components/riscos-psicossociais/relatorio/RelatorioRanking.tsx"),
    "utf8"
  );
  assert.match(
    src,
    /Ordenação das categorias da maior para a menor favorabilidade/
  );
  assert.match(src, /rankingGeralPorFavorabilidade/);
  assert.match(src, /valorVisualBarraDimensao/);
});

run("logo horizontal do relatório é exclusivo da capa e do cabeçalho interno", () => {
  const capa = readFileSync(
    join(
      process.cwd(),
      "components/riscos-psicossociais/relatorio/RelatorioCapa.tsx"
    ),
    "utf8"
  );
  const cabecalho = readFileSync(
    join(
      process.cwd(),
      "components/riscos-psicossociais/relatorio/RelatorioCabecalhoInterno.tsx"
    ),
    "utf8"
  );
  const menu = readFileSync(
    join(process.cwd(), "components/layout/NavarroLogo.tsx"),
    "utf8"
  );
  assert.match(capa, /logoSrc: "\/logo-navarro-relatorio-riscos\.png"/);
  assert.doesNotMatch(capa, /logoSrc: "\/logo-navarro\.png"/);
  assert.match(cabecalho, /\/logo-navarro-relatorio-riscos\.png/);
  assert.doesNotMatch(cabecalho, /\/logo-navarro\.png"/);
  assert.match(menu, /src="\/logo-navarro\.png"/);
  assert.doesNotMatch(menu, /logo-navarro-relatorio-riscos/);
  assert.ok(
    existsSync(join(process.cwd(), "public", "logo-navarro-relatorio-riscos.png"))
  );
  assert.ok(existsSync(join(process.cwd(), "public", "logo-navarro.png")));
});

console.log("\nTodos os testes de view do relatório passaram.");
