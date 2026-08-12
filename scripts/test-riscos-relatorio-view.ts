/**
 * Helpers de apresentação do relatório executivo (V2) — sem recalcular COPSOQ.
 */
import assert from "node:assert/strict";
import type { RiscosRelatorioDimensaoSnapshot } from "../lib/riscos-relatorio";
import {
  corPorClassificacaoId,
  dimensoesOrdenadasPorMediaDesc,
  montarDadosBarras,
  montarDadosRadar,
  montarRankingAtencao,
  rankingAtencao,
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

  assert.equal(valorVisualBarraDimensao(perfeitoRisco), 4);
  assert.equal(valorVisualBarraDimensao(burnout), 4);
  assert.equal(valorVisualBarraDimensao(conflitos), 4);
  assert.equal(valorVisualBarraDimensao(perfeitoProt), 4);
  assert.equal(valorVisualBarraDimensao(criticoRisco), 0);
  assert.equal(valorVisualBarraDimensao({ media: 1, tipo: "RISCO" }), 3);
  assert.equal(valorVisualBarraDimensao({ media: 3, tipo: "RISCO" }), 1);

  const barras = montarDadosBarras([
    perfeitoRisco,
    perfeitoProt,
    burnout,
    conflitos,
    criticoRisco,
  ]);
  const byId = Object.fromEntries(barras.map((b) => [b.id, b]));
  assert.equal(byId["demandas-trabalho"].media, 0);
  assert.equal(byId["demandas-trabalho"].valorVisual, 4);
  assert.equal(byId["demandas-trabalho"].cor, "#16a34a");
  assert.equal(byId["burnout-estresse"].valorVisual, 4);
  assert.equal(byId["conflitos-familia-trabalho"].valorVisual, 4);
  assert.equal(byId["interface-trabalho-individuo"].media, 4);
  assert.equal(byId["interface-trabalho-individuo"].valorVisual, 4);
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
    radar.every((r) => r.fullMark === 4 && typeof r.media === "number"),
    true
  );
});

run("ranking melhores prioriza situação favorável", () => {
  const top = rankingMelhores(amostra, 2);
  assert.equal(top[0].classificacaoId, "situacao_favoravel");
  assert.equal(top.every((d) => d.entraNoCalculo), true);
  // Entre Favoráveis, maior favorabilidade: Liderança 3.9 > Saúde 3.5
  assert.equal(top[0].id, "b");
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
      classificacaoLabel: "Risco Intermediário",
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
  assert.equal(scoreFavorabilidade({ media: 0, tipo: "RISCO" }), 4);
  assert.equal(scoreFavorabilidade({ media: 4, tipo: "PROTECAO" }), 4);
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
      classificacaoLabel: "Risco Intermediário",
    }),
    dim({
      id: "c",
      nome: "C",
      tipo: "RISCO",
      media: 3,
      classificacaoId: "risco_para_saude",
      classificacaoLabel: "Risco para a Saúde",
    }),
  ]);
  assert.equal(faixas.favoravel, 1);
  assert.equal(faixas.intermediario, 1);
  assert.equal(faixas.riscoParaSaude, 1);
  assert.equal(faixas.emAtencao, 2);
});

console.log("\nTodos os testes de view do relatório passaram.");
