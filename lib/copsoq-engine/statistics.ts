import { getPerguntasOrdenadas } from "@/lib/copsoq/instrument";
import { perguntasCalculoDaDimensao } from "@/lib/copsoq-engine/dimensions";
import { converterPontuacaoEfetivaParaEscalaFinal } from "@/lib/copsoq-engine/escala-produto";
import { resolverPontuacaoResposta } from "@/lib/copsoq-engine/normalization";
import type {
  CopsoqParticipacaoOperacional,
  CopsoqRespostasRespondente,
} from "@/lib/copsoq-engine/types";

/** Participação operacional (não é regra COPSOQ). */
export function calcularParticipacaoOperacional(
  respondentes: number,
  base: number
): CopsoqParticipacaoOperacional {
  const b = Math.max(0, base);
  const r = Math.max(0, respondentes);
  return {
    respondentes: r,
    base: b,
    percentual: b > 0 ? Math.round((r / b) * 100) : null,
  };
}

/**
 * Conta respondentes com todas as perguntas de cálculo da dimensão válidas
 * vs. respondentes com alguma ausência nessa dimensão.
 *
 * mediasBrutas: média nas pontuações impressas (pós-inversão).
 * mediasFinais: média após conversão linear para escala final 0–4 ou 0–5.
 */
export function contarCoberturaDimensao(
  dimensaoId: string,
  respondentes: CopsoqRespostasRespondente[]
): {
  respondentesValidos: number;
  respostasAusentes: number;
  perguntasEsperadas: number;
  /** @deprecated Preferir mediasBrutas / mediasFinais. Alias de mediasBrutas. */
  mediasValidas: number[];
  mediasBrutas: number[];
  mediasFinais: number[];
} {
  const perguntas = perguntasCalculoDaDimensao(dimensaoId);
  const perguntasEsperadas = perguntas.length;
  const mediasBrutas: number[] = [];
  const mediasFinais: number[] = [];
  let respondentesValidos = 0;
  let respostasAusentes = 0;

  for (const resp of respondentes) {
    let completo = true;
    let somaBruta = 0;
    let somaFinal = 0;
    for (const p of perguntas) {
      const pts = resolverPontuacaoResposta(p, resp[p.id]);
      if (pts === null) {
        completo = false;
        break;
      }
      somaBruta += pts;
      somaFinal += converterPontuacaoEfetivaParaEscalaFinal(p, pts);
    }
    if (completo && perguntasEsperadas > 0) {
      respondentesValidos += 1;
      mediasBrutas.push(somaBruta / perguntasEsperadas);
      mediasFinais.push(somaFinal / perguntasEsperadas);
    } else if (perguntasEsperadas > 0) {
      respostasAusentes += 1;
    }
  }

  return {
    respondentesValidos,
    respostasAusentes,
    perguntasEsperadas,
    mediasValidas: mediasBrutas,
    mediasBrutas,
    mediasFinais,
  };
}

export function perguntasOfensivas() {
  return getPerguntasOrdenadas().filter(
    (p) => p.dimensaoId === "comportamentos-ofensivos"
  );
}
