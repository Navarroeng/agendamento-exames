/**
 * Testes do Motor de Cálculo COPSOQ II-Br.
 * Fontes: Formulário de Aplicação + Orientações v2 (anexos oficiais).
 */
import assert from "node:assert/strict";
import { getCopsoqEscala } from "../lib/copsoq/escalas";
import { getDimensaoById, getPerguntasOrdenadas } from "../lib/copsoq/instrument";
import { COPSOQ_PERGUNTAS } from "../lib/copsoq/perguntas";
import {
  COPSOQ_ENGINE_DIVERGENCIAS,
  COPSOQ_ESCALA_COMUM_MAX,
  COPSOQ_ESCALA_COMUM_MIN,
  COPSOQ_FAIXA_BAIXA_MAX,
  COPSOQ_FAIXA_MEDIA_MAX,
  COPSOQ_FAIXA_MEDIA_MIN,
  amplitudeEscalaDimensao,
  classificarMediaDimensao,
  dimensoesParaMediaGeral,
  interpretarCampanhaCopsoq,
  mediaGeralDimensao,
  mediaIndividualDimensao,
  normalizarPontuacao,
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

// ---------------------------------------------------------------------------
// Escala 0–4 preservada (sem conversão 1–5)
// ---------------------------------------------------------------------------
run("escala frequencia permanece 0–4 (Formulário)", () => {
  const freq = getCopsoqEscala("frequencia")!;
  const vals = freq.alternativas.map((a) => a.pontuacao).sort((a, b) => a - b);
  assert.deepEqual(vals, [0, 1, 2, 3, 4]);
  assert.equal(alt("frequencia", "Sempre").pontuacao, 4);
  assert.equal(alt("frequencia", "Nunca").pontuacao, 0);
});

run("divergências documentadas estão registradas no motor", () => {
  assert.ok(COPSOQ_ENGINE_DIVERGENCIAS.length >= 3);
  assert.ok(
    COPSOQ_ENGINE_DIVERGENCIAS.some(
      (d) =>
        d.includes("normalizada") ||
        d.includes("escala comum") ||
        d.includes("0–4") ||
        d.includes("0-4")
    )
  );
});

// ---------------------------------------------------------------------------
// Inversão 1B via configuração (não hardcoded)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Exemplo oficial Orientações — Demandas de Trabalho
// ---------------------------------------------------------------------------
run("exemplo oficial Demandas: média individual 2,5", () => {
  // 1A Às vezes=2; 1B Raramente invertido=3; 2A Sempre=4; 2B Frequentemente=3;
  // 3A Às vezes=2; 3B Raramente=1 → soma 15 / 6 = 2,5
  const respostas = {
    "p-1a": "Às vezes",
    "p-1b": "Raramente",
    "p-2a": "Sempre",
    "p-2b": "Frequentemente",
    "p-3a": "Às vezes",
    "p-3b": "Raramente",
  };
  const media = mediaIndividualDimensao("demandas-trabalho", respostas);
  assert.equal(media, 2.5);
});

run("exemplo Demandas: média geral 2,43 → Situação Moderada (produto)", () => {
  const geral = mediaGeralDimensao([2.5, 3.0, 1.8]);
  assert.ok(geral != null);
  assert.ok(Math.abs(geral! - 2.43) < 0.005);
  const dim = getDimensaoById("demandas-trabalho")!;
  const cls = classificarMediaDimensao(dim, geral);
  assert.equal(cls.id, "risco_intermediario");
  assert.equal(cls.label, "Situação Moderada");
});

// ---------------------------------------------------------------------------
// RISCO × PROTEÇÃO + limites de faixa (metodologia do produto 1,33 / 2,66)
// ---------------------------------------------------------------------------
run("classificação RISCO nos limites do produto", () => {
  const dim = getDimensaoById("demandas-trabalho")!;
  assert.equal(dim.tipo, "RISCO");
  assert.equal(classificarMediaDimensao(dim, 0).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(dim, 1.0).id, "situacao_favoravel");
  assert.equal(
    classificarMediaDimensao(dim, COPSOQ_FAIXA_BAIXA_MAX).id,
    "situacao_favoravel"
  );
  assert.equal(
    classificarMediaDimensao(dim, COPSOQ_FAIXA_MEDIA_MIN).id,
    "risco_intermediario"
  );
  assert.equal(classificarMediaDimensao(dim, 2.0).id, "risco_intermediario");
  assert.equal(
    classificarMediaDimensao(dim, COPSOQ_FAIXA_MEDIA_MAX).id,
    "risco_intermediario"
  );
  assert.equal(classificarMediaDimensao(dim, 2.67).id, "risco_para_saude");
  assert.equal(classificarMediaDimensao(dim, 4).id, "risco_para_saude");
  assert.equal(
    classificarMediaDimensao(dim, 4).label,
    "Situação Desfavorável"
  );
});

run("classificação PROTEÇÃO nos limites do produto (faixas invertidas)", () => {
  const dim = getDimensaoById("lideranca")!;
  assert.equal(dim.tipo, "PROTECAO");
  assert.equal(classificarMediaDimensao(dim, 4).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(dim, 3.0).id, "situacao_favoravel");
  assert.equal(
    classificarMediaDimensao(dim, COPSOQ_FAIXA_MEDIA_MAX).id,
    "risco_intermediario"
  );
  assert.equal(classificarMediaDimensao(dim, 2.0).id, "risco_intermediario");
  assert.equal(
    classificarMediaDimensao(dim, COPSOQ_FAIXA_MEDIA_MIN).id,
    "risco_intermediario"
  );
  assert.equal(
    classificarMediaDimensao(dim, COPSOQ_FAIXA_BAIXA_MAX).id,
    "risco_para_saude"
  );
  assert.equal(classificarMediaDimensao(dim, 0).id, "risco_para_saude");
  assert.equal(
    classificarMediaDimensao(dim, 0).label,
    "Situação Desfavorável"
  );
});

run("fronteiras obrigatórias 1,33 / 1,34 / 2,66 / 2,67 (RISCO e PROTEÇÃO)", () => {
  const risco = getDimensaoById("demandas-trabalho")!;
  const prot = getDimensaoById("lideranca")!;
  assert.equal(classificarMediaDimensao(risco, 1.33).id, "situacao_favoravel");
  assert.equal(classificarMediaDimensao(risco, 1.34).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(risco, 2.66).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(risco, 2.67).id, "risco_para_saude");
  assert.equal(classificarMediaDimensao(prot, 1.33).id, "risco_para_saude");
  assert.equal(classificarMediaDimensao(prot, 1.34).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(prot, 2.66).id, "risco_intermediario");
  assert.equal(classificarMediaDimensao(prot, 2.67).id, "situacao_favoravel");
});

// ---------------------------------------------------------------------------
// Comportamentos ofensivos fora da média geral
// ---------------------------------------------------------------------------
run("Comportamentos ofensivos fora das dimensões calculáveis", () => {
  const ids = dimensoesParaMediaGeral().map((d) => d.id);
  assert.equal(ids.includes("comportamentos-ofensivos"), false);
  assert.equal(ids.length, 10);

  const ofens = getDimensaoById("comportamentos-ofensivos")!;
  assert.equal(ofens.entraNoCalculo, false);
  const cls = classificarMediaDimensao(ofens, 4);
  assert.equal(cls.id, "classificacao_nao_definida");
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
  assert.equal(result.comportamentosOfensivos.escorePadronizado, null);
  assert.equal(
    result.comportamentosOfensivos.classificacao.id,
    "classificacao_nao_definida"
  );
  assert.equal(
    result.dimensoes.some((d) => d.id === "comportamentos-ofensivos"),
    false
  );
  assert.equal(result.riscoGeral, null);
});

// ---------------------------------------------------------------------------
// Respostas ausentes — não inventar
// ---------------------------------------------------------------------------
run("respostas ausentes: média individual null", () => {
  const media = mediaIndividualDimensao("demandas-trabalho", {
    "p-1a": "Às vezes",
    // faltam demais
  });
  assert.equal(media, null);
});

run("respostas ausentes: dimensão sem classificação inventada", () => {
  const result = interpretarCampanhaCopsoq({
    respondentes: [{ "p-1a": "Às vezes" }],
  });
  const demandas = result.dimensoes.find((d) => d.id === "demandas-trabalho")!;
  assert.equal(demandas.media, null);
  assert.equal(demandas.classificacao.id, "classificacao_nao_definida");
  assert.equal(demandas.respondentesValidos, 0);
  assert.equal(demandas.respostasAusentes, 1);
});

// ---------------------------------------------------------------------------
// Regras bloqueadas: escore padronizado / risco geral
// ---------------------------------------------------------------------------
run("escore padronizado e risco geral permanecem null (sem fórmula oficial)", () => {
  const respostasCompletasDemandas = {
    "p-1a": "Às vezes",
    "p-1b": "Raramente",
    "p-2a": "Sempre",
    "p-2b": "Frequentemente",
    "p-3a": "Às vezes",
    "p-3b": "Raramente",
  };
  const result = interpretarCampanhaCopsoq({
    respondentes: [respostasCompletasDemandas],
  });
  assert.equal(result.riscoGeral, null);
  for (const d of result.dimensoes) {
    assert.equal(d.escorePadronizado, null);
  }
});

// ---------------------------------------------------------------------------
// Pontuação por id (portal) e label
// ---------------------------------------------------------------------------
run("pontuação por id e label são equivalentes", () => {
  const p = pergunta("2A");
  const porLabel = pontuarRespostaPorLabel(p, "Sempre");
  const porId = pontuarRespostaPorId(p, "freq-sempre");
  assert.equal(porLabel, 4);
  assert.equal(porId, 4);
});

// ---------------------------------------------------------------------------
// Cobertura: cada dimensão calculável tem perguntas
// ---------------------------------------------------------------------------
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
  assert.equal(result.participacao.respondentes, 2);
  assert.equal(result.participacao.base, 8);
  assert.equal(result.participacao.percentual, 25);
});

// ---------------------------------------------------------------------------
// Normalização de amplitude (escala comum 0–4)
// ---------------------------------------------------------------------------
run("normalizarPontuacao: identidade em 0–4 e extremo 0–3 → 4", () => {
  assert.equal(normalizarPontuacao(2.5, 0, 4), 2.5);
  assert.equal(normalizarPontuacao(0, 0, 4), COPSOQ_ESCALA_COMUM_MIN);
  assert.equal(normalizarPontuacao(4, 0, 4), COPSOQ_ESCALA_COMUM_MAX);
  assert.equal(normalizarPontuacao(3, 0, 3), 4);
  assert.equal(normalizarPontuacao(0, 0, 3), 0);
  assert.equal(normalizarPontuacao(1.5, 0, 3), 2);
  // genérico 0–2 e 0–6
  assert.equal(normalizarPontuacao(2, 0, 2), 4);
  assert.equal(normalizarPontuacao(3, 0, 6), 2);
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

run("Interface: Muito satisfeito → melhor resultado possível (Favorável)", () => {
  const result = interpretarCampanhaCopsoq({
    respondentes: [{ "p-13": "sat-muito-satisfeito" }],
  });
  const dim = result.dimensoes.find(
    (d) => d.id === "interface-trabalho-individuo"
  )!;
  assert.equal(dim.mediaBruta, 3);
  assert.equal(dim.media, 4);
  assert.equal(dim.classificacao.id, "situacao_favoravel");
});

run("Conflitos: pior extremo → Situação Desfavorável (não preso em Moderada)", () => {
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
  assert.equal(dim.mediaBruta, 3);
  assert.equal(dim.media, 4);
  assert.equal(dim.classificacao.id, "risco_para_saude");
});

run("Demandas homogênea 0–4: média e classificação idênticas à bruta", () => {
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
  assert.equal(dim.mediaBruta, 2.5);
  assert.equal(dim.media, 2.5);
  assert.equal(dim.classificacao.id, "risco_intermediario");
});

run("todas as dimensões calculáveis: media == mediaBruta quando amplitude 0–4", () => {
  // preenchimento mínimo só para dimensões 0–4 com um respondente vazio → medias null
  // Verifica identidade da função de normalização por amplitude detectada
  for (const dim of dimensoesParaMediaGeral()) {
    const amp = amplitudeEscalaDimensao(dim.id);
    if (amp.min === 0 && amp.max === 4) {
      for (const v of [0, 1.2, 2.33, 2.5, 3.66, 4]) {
        assert.equal(
          normalizarPontuacao(v, amp.min, amp.max),
          v,
          `${dim.id} deveria ser identidade em ${v}`
        );
      }
    }
  }
});

console.log("test-copsoq-engine: OK");
