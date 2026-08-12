import { getCopsoqInstrumento } from "@/lib/copsoq/instrument";
import {
  CLASSIFICACAO_NAO_DEFINIDA,
  classificarMediaDimensao,
} from "@/lib/copsoq-engine/classification";
import { mediaGeralDimensao } from "@/lib/copsoq-engine/dimensions";
import { normalizarChaveAlternativa } from "@/lib/copsoq-engine/normalization";
import { normalizarMediaDimensao } from "@/lib/copsoq-engine/scale-normalize";
import {
  calcularParticipacaoOperacional,
  contarCoberturaDimensao,
  perguntasOfensivas,
} from "@/lib/copsoq-engine/statistics";
import {
  COPSOQ_ENGINE_DIVERGENCIAS,
  type CopsoqComportamentosOfensivosQualitativo,
  type CopsoqDimensaoCalculoResultado,
  type CopsoqEngineInput,
  type CopsoqEngineResult,
} from "@/lib/copsoq-engine/types";

function analisarComportamentosOfensivos(
  respondentes: CopsoqEngineInput["respondentes"]
): CopsoqComportamentosOfensivosQualitativo {
  const perguntas = perguntasOfensivas();
  const frequenciasPorPergunta: Record<string, Record<string, number>> = {};
  let respondentesComAlgumaResposta = 0;

  for (const p of perguntas) {
    frequenciasPorPergunta[p.id] = {};
  }

  for (const resp of respondentes) {
    let algum = false;
    for (const p of perguntas) {
      const raw = resp[p.id];
      if (raw == null || !String(raw).trim()) continue;
      algum = true;
      const key = normalizarChaveAlternativa(p, String(raw));
      const bag = frequenciasPorPergunta[p.id]!;
      bag[key] = (bag[key] ?? 0) + 1;
    }
    if (algum) respondentesComAlgumaResposta += 1;
  }

  return {
    dimensaoId: "comportamentos-ofensivos",
    nome: "Comportamentos ofensivos",
    media: null,
    escorePadronizado: null,
    classificacao: {
      ...CLASSIFICACAO_NAO_DEFINIDA,
      motivo:
        "Orientações: dimensão opcional, fora do cálculo final; apenas análise qualitativa.",
    },
    respondentesComAlgumaResposta,
    frequenciasPorPergunta,
  };
}

/**
 * Interpreta um conjunto de respostas da campanha.
 * Toda regra quantitativa oficial fica aqui (não no frontend).
 */
export function interpretarCampanhaCopsoq(
  input: CopsoqEngineInput
): CopsoqEngineResult {
  const respondentes = input.respondentes ?? [];
  const base = input.baseParticipacao ?? respondentes.length;
  const instrumento = getCopsoqInstrumento();

  const dimensoes: CopsoqDimensaoCalculoResultado[] = [];

  for (const dim of instrumento.dimensoes) {
    if (!dim.entraNoCalculo) continue;

    const cobertura = contarCoberturaDimensao(dim.id, respondentes);
    // 1) média bruta (pontuações impressas do Formulário)
    const mediaBruta = mediaGeralDimensao(cobertura.mediasValidas);
    // 2–3) normalizar amplitude → escala comum 0–4; 4) classificar
    const media = normalizarMediaDimensao(dim.id, mediaBruta);

    dimensoes.push({
      id: dim.id,
      nome: dim.nome,
      tipo: dim.tipo,
      entraNoCalculo: true,
      media,
      mediaBruta,
      escorePadronizado: null,
      classificacao: classificarMediaDimensao(dim, media),
      respondentesValidos: cobertura.respondentesValidos,
      respostasAusentes: cobertura.respostasAusentes,
      perguntasEsperadas: cobertura.perguntasEsperadas,
    });
  }

  return {
    participacao: calcularParticipacaoOperacional(respondentes.length, base),
    riscoGeral: null,
    dimensoes,
    comportamentosOfensivos: analisarComportamentosOfensivos(respondentes),
    limitacoes: [...COPSOQ_ENGINE_DIVERGENCIAS],
  };
}

/** Dimensões que entram no cálculo quantitativo (média/classificação). */
export function dimensoesParaMediaGeral() {
  return getCopsoqInstrumento().dimensoes.filter((d) => d.entraNoCalculo);
}
