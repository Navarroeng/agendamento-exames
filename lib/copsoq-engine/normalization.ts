import { getCopsoqEscala } from "@/lib/copsoq/escalas";
import type { CopsoqPergunta } from "@/lib/copsoq/types";
import {
  pontuarRespostaPorId,
  pontuarRespostaPorLabel,
} from "@/lib/copsoq-engine/score";

/**
 * Resolve a pontuação efetiva a partir de alternativaId ou label.
 * Não inventa valor quando a resposta está ausente ou inválida.
 */
export function resolverPontuacaoResposta(
  pergunta: CopsoqPergunta,
  valor: string | undefined | null
): number | null {
  if (valor == null) return null;
  const raw = String(valor).trim();
  if (!raw) return null;
  return (
    pontuarRespostaPorId(pergunta, raw) ?? pontuarRespostaPorLabel(pergunta, raw)
  );
}

/** Normaliza chave de resposta para contagens qualitativas. */
export function normalizarChaveAlternativa(
  pergunta: CopsoqPergunta,
  valor: string
): string {
  const raw = valor.trim();
  const escala = getCopsoqEscala(pergunta.tipoEscala);
  if (!escala) return raw;
  const byId = escala.alternativas.find((a) => a.id === raw);
  if (byId) return byId.id;
  const byLabel = escala.alternativas.find((a) => a.label === raw);
  if (byLabel) return byLabel.id;
  return raw;
}
