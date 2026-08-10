import { getCopsoqEscala } from "@/lib/copsoq/escalas";
import type { CopsoqAlternativa, CopsoqPergunta } from "@/lib/copsoq/types";

/**
 * Maior pontuação impressa na escala da pergunta (Formulário).
 * Usado apenas para inversão configurável (`pontuacaoInvertida`).
 */
export function maxPontuacaoEscala(pergunta: CopsoqPergunta): number {
  const escala = getCopsoqEscala(pergunta.tipoEscala);
  if (!escala || escala.alternativas.length === 0) return 0;
  return Math.max(...escala.alternativas.map((a) => a.pontuacao));
}

/**
 * Pontuação efetiva da alternativa.
 * Se `pergunta.pontuacaoInvertida`, aplica maxEscala - pontuacao
 * (ex.: 1B no Formulário — Sempre=0 … Nunca=4 via inversão da escala 0–4).
 * Sem lógica especial hardcoded por código de pergunta.
 */
export function pontuarAlternativa(
  pergunta: CopsoqPergunta,
  alternativa: CopsoqAlternativa
): number {
  if (!pergunta.pontuacaoInvertida) return alternativa.pontuacao;
  return maxPontuacaoEscala(pergunta) - alternativa.pontuacao;
}

export function pontuarRespostaPorLabel(
  pergunta: CopsoqPergunta,
  labelAlternativa: string
): number | null {
  const escala = getCopsoqEscala(pergunta.tipoEscala);
  const alt = escala?.alternativas.find((a) => a.label === labelAlternativa);
  if (!alt) return null;
  return pontuarAlternativa(pergunta, alt);
}

/** Pontua pela id da alternativa armazenada no portal. */
export function pontuarRespostaPorId(
  pergunta: CopsoqPergunta,
  alternativaId: string
): number | null {
  const escala = getCopsoqEscala(pergunta.tipoEscala);
  const alt = escala?.alternativas.find((a) => a.id === alternativaId);
  if (!alt) return null;
  return pontuarAlternativa(pergunta, alt);
}
