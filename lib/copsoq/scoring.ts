/**
 * Compat: reexporta o Motor de Cálculo.
 * Toda regra vive em `lib/copsoq-engine/`.
 */
export type { CopsoqClassificacaoResultado as CopsoqClassificacao } from "@/lib/copsoq-engine/types";

export {
  pontuarAlternativa,
  pontuarRespostaPorId,
  pontuarRespostaPorLabel,
  mediaIndividualDimensao,
  mediaGeralDimensao,
  classificarMediaDimensao,
  dimensoesParaMediaGeral,
} from "@/lib/copsoq-engine";
