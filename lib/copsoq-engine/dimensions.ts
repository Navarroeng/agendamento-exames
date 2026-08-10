import { getPerguntasOrdenadas } from "@/lib/copsoq/instrument";
import { resolverPontuacaoResposta } from "@/lib/copsoq-engine/normalization";
import type { CopsoqRespostasRespondente } from "@/lib/copsoq-engine/types";

/**
 * Média individual da dimensão (Orientações):
 * soma das pontuações / nº de perguntas da dimensão (entraNoCalculo).
 *
 * Se qualquer pergunta obrigatória ao cálculo estiver ausente/inválida:
 * retorna null (não imputa valor).
 */
export function mediaIndividualDimensao(
  dimensaoId: string,
  respostas: CopsoqRespostasRespondente
): number | null {
  const perguntas = getPerguntasOrdenadas().filter(
    (p) => p.dimensaoId === dimensaoId && p.entraNoCalculo
  );
  if (perguntas.length === 0) return null;

  let soma = 0;
  for (const p of perguntas) {
    const pts = resolverPontuacaoResposta(p, respostas[p.id]);
    if (pts === null) return null;
    soma += pts;
  }
  return soma / perguntas.length;
}

/**
 * Média geral da dimensão na empresa (Orientações):
 * média das médias individuais dos trabalhadores que responderam.
 */
export function mediaGeralDimensao(
  mediasIndividuais: number[]
): number | null {
  if (mediasIndividuais.length === 0) return null;
  const soma = mediasIndividuais.reduce((a, b) => a + b, 0);
  return soma / mediasIndividuais.length;
}

export function perguntasCalculoDaDimensao(dimensaoId: string) {
  return getPerguntasOrdenadas().filter(
    (p) => p.dimensaoId === dimensaoId && p.entraNoCalculo
  );
}
