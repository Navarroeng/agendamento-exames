/**
 * Testes do Motor de Cálculo COPSOQ II-Br.
 * Fontes: Formulário de Aplicação + Orientações v2 (anexos oficiais).
 * Classificação: metodologia do produto (escalas impressas 0–3 / 0–4).
 */
import assert from "node:assert/strict";
import { getCopsoqEscala } from "../lib/copsoq/escalas";
import { getDimensaoById, getPerguntasOrdenadas } from "../lib/copsoq/instrument";
import { COPSOQ_PERGUNTAS } from "../lib/copsoq/perguntas";
import {
  COPSOQ_ENGINE_DIVERGENCIAS,
  amplitudeEscalaDimensao,
  classificarMediaDimensao,
  dimensoesParaMediaGeral,
  escalaDimensaoProduto,
  interpretarCampanhaCopsoq,
  mediaGeralDimensao,
  mediaIndividualDimensao,
  pontuarAlternativa,
  pontuarRespostaPorId,
  pontuarRespostaPorLabel,
} from "../lib/copsoq-engine";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function pergunta(codigo: string) {
  const p = COPSOQ_PERGUNTAS.find((x) => x.codigo === codigo);
  assert.ok(p, `Pergunta ${codigo} não encontrada`);
  return p!;
}

function alt(escalaId: string, label: string) {
  const escala = getCopsoqEscala(escalaId);
  assert.ok(escala, `Escala ${escalaId}`);
  const a = escala!.alternativas.find((x) => x.label === label);
  assert.ok(a, `Alternativa ${label} em ${escalaId}`);
  return a!;
}

run("escala frequencia permanece 0–4 (Formulário)", () => {
  const freq = getCopsoqEscala("frequencia")!;
  const vals = freq.alternativas.map((a) => a.pontuacao).sort((a, b) => a - b);
  assert.deepEqual(vals, [0, 1, 2, 3, 4]);
});

run("divergências documentadas estão registradas no motor", () => {
  assert.ok(COPSOQ_ENGINE_DIVERGENCIAS.length >= 3);
  assert.ok(
    COPSOQ_ENGINE_DIVERGENCIAS.some(
      (d) =>
        d.includes("METODOLOGIA-PRODUTO") ||
        d.includes("0–3") ||
        d.includes("escala impressa")
    )
  );
});

run("1B usa pontuacaoInvertida e reproduz impressão do Formulário", () => {
  const p1b = pergunta("1B");
  assert.equal(p1b.pontuacaoInvertida, true);
  assert.equal(pontuarAlternativa(p1b, alt("frequencia", "Sempre")), 0);
  assert.equal(pontuarAlternativa(p1b, alt("frequencia", "Frequentemente")), 1);
  assert.equal(pontuarAlternativa(p1b, alt("frequencia", "Às vezes")), 2);
  assert.equal(pontuarAlternativa(p1b, alt("frequencia", "Raramente")), 3);
  assert.equal(pontuarAlternativa(p1b, alt("frequencia", "Nunca")), 4);
});

run("1A não inverte (Sempre = 4)", () => {
  const p1a = pergunta("1A");
  assert.equal(p1a.pontuacaoInvertida, false);
  assert.equal(pontuarAlternativa(p1a, alt("frequencia", "Sempre")), 4);
});

run("exemplo oficial Demandas: média individual 2,5", () => {
  const respostas = {
    "p-1a": "Às vezes",
    "p-1b": "Raramente",
    "p-2a": "Sempre",
    "p-2b": "Frequentemente",
    "p-3a": "Às vezes",
    "p-3b": "Raramente",
  };
  assert.equal(mediaIndividualDimensao("demandas-trabalho", respostas), 2.5);
});

run("exemplo Demandas: média 2,43 / 4 → Situação Moderada", () => {
  const geral = mediaGeralDimensao([2.5, 3.0, 1.8]);
  assert.ok(geral != null);
  assert.ok(Math.abs(geral! - 2.43) < 0.005);
  const dim = getDimensaoById("demandas-trabalho")!;
  const cls = classificarMediaDimensao(dim, geral, 4);
  assert.equal(cls.id, "risco_intermediario");
  assert.equal(cls.label, "Situação Moderada");
});

run("classificação RISCO escala 0–4 (fronteiras obrigatórias)", () => {
  const dim = getDimensaoById("demandas-trabalho")!;
  assert.equal(dim.tipo, "RISCO");
  assert.equal(classificarMediaDimensao(dim, 0, 4).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(dim, 1.59, 4).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(dim, 1.6, 4).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(dim, 2.79, 4).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(dim, 2.8, 4).id, "risco_para_saude");
  assert.equal(classificarMediaDimensao(dim, 4, 4).id, "risco_para_saude");
  assert.equal(classificarMediaDimensao(dim, 4, 4).label, "Situação Desfavorável");
});

run("classificação PROTEÇÃO escala 0–4 (fronteiras obrigatórias)", () => {
  const dim = getDimensaoById("lideranca")!;
  assert.equal(dim.tipo, "PROTECAO");
  assert.equal(classificarMediaDimensao(dim, 4, 4).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(dim, 2.8, 4).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(dim, 2.79, 4).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(dim, 1.6, 4).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(dim, 1.59, 4).id, "risco_para_saude");
  assert.equal(classificarMediaDimensao(dim, 0, 4).id, "risco_para_saude");
});

run("classificação RISCO escala 0–3 (fronteiras obrigatórias)", () => {
  const dim = getDimensaoById("conflitos-familia-trabalho")!;
  assert.equal(dim.tipo, "RISCO");
  assert.equal(classificarMediaDimensao(dim, 0, 3).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(dim, 1.19, 3).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(dim, 1.2, 3).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(dim, 2.09, 3).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(dim, 2.1, 3).id, "risco_para_saude");
  assert.equal(classificarMediaDimensao(dim, 3, 3).id, "risco_para_saude");
});

run("classificação PROTEÇÃO escala 0–3 (fronteiras obrigatórias)", () => {
  const dim = getDimensaoById("interface-trabalho-individuo")!;
  assert.equal(dim.tipo, "PROTECAO");
  assert.equal(classificarMediaDimensao(dim, 3, 3).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(dim, 2.1, 3).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(dim, 2.09, 3).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(dim, 1.2, 3).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(dim, 1.19, 3).id, "risco_para_saude");
  assert.equal(classificarMediaDimensao(dim, 0, 3).id, "risco_para_saude");
});

run("nenhuma dimensão quantitativa mistura escalas 0–3 e 0–4", () => {
  for (const dim of dimensoesParaMediaGeral()) {
    assert.ok([3, 4].includes(escalaDimensaoProduto(dim.id)));
  }
});

run("1B invertida: Sempre → original 4 → efetiva 0; sem dupla inversão", () => {
  const p1b = pergunta("1B");
  const impressa = alt("frequencia", "Sempre").pontuacao;
  assert.equal(impressa, 4);
  const efetiva = pontuarAlternativa(p1b, alt("frequencia", "Sempre"));
  assert.equal(efetiva, 0);
  // Demandas: 1A Sempre=4, 1B Sempre→0, demais Nunca=0 → (4+0+0+0+0+0)/6
  const result = interpretarCampanhaCopsoq({
    respondentes: [
      {
        "p-1a": "freq-sempre",
        "p-1b": "freq-sempre",
        "p-2a": "freq-nunca",
        "p-2b": "freq-nunca",
        "p-3a": "freq-nunca",
        "p-3b": "freq-nunca",
      },
    ],
  });
  const dim = result.dimensoes.find((d) => d.id === "demandas-trabalho")!;
  assert.ok(Math.abs((dim.media ?? -1) - 4 / 6) < 1e-9);
  assert.equal(dim.maxEscalaFinal, 4);
  assert.equal(dim.classificacao.id, "situacao_favoravel");
});

run("Comportamentos ofensivos fora das dimensões calculáveis", () => {
  const ids = dimensoesParaMediaGeral().map((d) => d.id);
  assert.equal(ids.includes("comportamentos-ofensivos"), false);
  assert.equal(ids.length, 10);
  const ofens = getDimensaoById("comportamentos-ofensivos")!;
  assert.equal(ofens.entraNoCalculo, false);
  assert.equal(classificarMediaDimensao(ofens, 4).id, "classificacao_nao_definida");
});

run("interpretarCampanha: ofensivos qualitativos sem média/classificação", () => {
  const result = interpretarCampanhaCopsoq({
    respondentes: [
      {
        "p-20": "exp-nao",
        "p-21": "exp-nao",
        "p-22": "exp-nao",
        "p-23": "exp-nao",
      },
    ],
    baseParticipacao: 10,
  });
  assert.equal(result.comportamentosOfensivos.media, null);
  assert.equal(
    result.comportamentosOfensivos.classificacao.id,
    "classificacao_nao_definida"
  );
  assert.equal(result.riscoGeral, null);
});

run("respostas ausentes: média individual null", () => {
  assert.equal(
    mediaIndividualDimensao("demandas-trabalho", { "p-1a": "Às vezes" }),
    null
  );
});

run("respostas ausentes: dimensão sem classificação inventada", () => {
  const result = interpretarCampanhaCopsoq({
    respondentes: [{ "p-1a": "Às vezes" }],
  });
  const demandas = result.dimensoes.find((d) => d.id === "demandas-trabalho")!;
  assert.equal(demandas.media, null);
  assert.equal(demandas.classificacao.id, "classificacao_nao_definida");
});

run("escore padronizado e risco geral permanecem null", () => {
  const result = interpretarCampanhaCopsoq({
    respondentes: [
      {
        "p-1a": "Às vezes",
        "p-1b": "Raramente",
        "p-2a": "Sempre",
        "p-2b": "Frequentemente",
        "p-3a": "Às vezes",
        "p-3b": "Raramente",
      },
    ],
  });
  assert.equal(result.riscoGeral, null);
  for (const d of result.dimensoes) {
    assert.equal(d.escorePadronizado, null);
  }
});

run("pontuação por id e label são equivalentes", () => {
  const p = pergunta("2A");
  assert.equal(pontuarRespostaPorLabel(p, "Sempre"), 4);
  assert.equal(pontuarRespostaPorId(p, "freq-sempre"), 4);
});

run("cada dimensão calculável possui perguntas entraNoCalculo", () => {
  for (const dim of dimensoesParaMediaGeral()) {
    const qs = getPerguntasOrdenadas().filter(
      (p) => p.dimensaoId === dim.id && p.entraNoCalculo
    );
    assert.ok(qs.length > 0, `Dimensão ${dim.id} sem perguntas`);
  }
});

run("participação operacional", () => {
  const result = interpretarCampanhaCopsoq({
    respondentes: [{}, {}],
    baseParticipacao: 8,
  });
  assert.equal(result.participacao.percentual, 25);
});

run("amplitudes: Interface e Conflitos 0–3; Demandas 0–4", () => {
  assert.deepEqual(amplitudeEscalaDimensao("interface-trabalho-individuo"), {
    min: 0,
    max: 3,
  });
  assert.deepEqual(amplitudeEscalaDimensao("conflitos-familia-trabalho"), {
    min: 0,
    max: 3,
  });
  assert.deepEqual(amplitudeEscalaDimensao("demandas-trabalho"), {
    min: 0,
    max: 4,
  });
});

run("Interface: Muito satisfeito → 3,00 / 3 Favorável", () => {
  const result = interpretarCampanhaCopsoq({
    respondentes: [{ "p-13": "sat-muito-satisfeito" }],
  });
  const dim = result.dimensoes.find(
    (d) => d.id === "interface-trabalho-individuo"
  )!;
  assert.equal(dim.media, 3);
  assert.equal(dim.maxEscalaFinal, 3);
  assert.equal(dim.classificacao.id, "situacao_favoravel");
});

run("Conflitos: pior extremo → 3,00 / 3 Desfavorável", () => {
  const result = interpretarCampanhaCopsoq({
    respondentes: [
      {
        "p-14a": "imp-certeza",
        "p-14b": "imp-certeza",
      },
    ],
  });
  const dim = result.dimensoes.find(
    (d) => d.id === "conflitos-familia-trabalho"
  )!;
  assert.equal(dim.media, 3);
  assert.equal(dim.maxEscalaFinal, 3);
  assert.equal(dim.classificacao.id, "risco_para_saude");
});

run("Demandas: média impressa 2,5 / 4 Moderada (sem conversão)", () => {
  const respostas = {
    "p-1a": "Às vezes",
    "p-1b": "Raramente",
    "p-2a": "Sempre",
    "p-2b": "Frequentemente",
    "p-3a": "Às vezes",
    "p-3b": "Raramente",
  };
  const result = interpretarCampanhaCopsoq({ respondentes: [respostas] });
  const dim = result.dimensoes.find((d) => d.id === "demandas-trabalho")!;
  assert.equal(dim.media, 2.5);
  assert.equal(dim.mediaBruta, 2.5);
  assert.equal(dim.maxEscalaFinal, 4);
  assert.equal(dim.classificacao.id, "risco_intermediario");
});

run("escalas: 5-alts → 0–4; 4-alts → 0–3; sem mistura", () => {
  assert.equal(escalaDimensaoProduto("demandas-trabalho"), 4);
  assert.equal(escalaDimensaoProduto("interface-trabalho-individuo"), 3);
  assert.equal(escalaDimensaoProduto("conflitos-familia-trabalho"), 3);
  for (const dim of dimensoesParaMediaGeral()) {
    const e = escalaDimensaoProduto(dim.id);
    assert.ok(e === 3 || e === 4, dim.id);
  }
});

console.log("test-copsoq-engine: OK");
