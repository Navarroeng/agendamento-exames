import type { CopsoqDimensao } from "@/lib/copsoq/types";
import type { CopsoqClassificacaoResultado } from "@/lib/copsoq-engine/types";
import {
  escalaFinalDimensao,
  type EscalaFinalProduto,
} from "@/lib/copsoq-engine/escala-produto";

/**
 * Classificação — metodologia do produto (escalas finais 0–4 e 0–5).
 * Ver docs/copsoq/METODOLOGIA-PRODUTO.md.
 *
 * IDs internos estáveis:
 *   situacao_favoravel | risco_intermediario (= Moderada) | risco_para_saude (= Desfavorável)
 */

const CLASSIFICACOES = {
  situacao_favoravel: {
    id: "situacao_favoravel" as const,
    label: "Situação Favorável",
    interpretacao:
      "Baixa ou inexistente exposição a fatores de risco.",
  },
  risco_intermediario: {
    id: "risco_intermediario" as const,
    label: "Situação Moderada",
    interpretacao:
      "Exposição a fator(es) de risco com necessidade de monitoramento.",
  },
  risco_para_saude: {
    id: "risco_para_saude" as const,
    label: "Situação Desfavorável",
    interpretacao:
      "Exposição significativa a fator(es) de risco, requerendo intervenção.",
  },
};

export const CLASSIFICACAO_NAO_DEFINIDA: CopsoqClassificacaoResultado = {
  id: "classificacao_nao_definida",
  label: "Classificação não definida",
  interpretacao: "Regra oficial insuficiente ou média indisponível",
};

/** Faixas na escala final 0–5 (perguntas com 5 alternativas). */
export const FAIXA_ESCALA_5 = {
  /** PROTEÇÃO Favorável: ≥ 3,50; RISCO Desfavorável: ≥ 3,50 */
  altoMin: 3.5,
  /** PROTEÇÃO Moderada: ≥ 2,00; RISCO Moderada: ≥ 2,00 */
  medioMin: 2.0,
  /** RISCO Favorável: ≤ 1,99; PROTEÇÃO Desfavorável: ≤ 1,99 */
  baixoMax: 1.99,
} as const;

/** Faixas na escala final 0–4 (perguntas com 4 alternativas). */
export const FAIXA_ESCALA_4 = {
  altoMin: 2.8,
  medioMin: 1.6,
  baixoMax: 1.59,
} as const;

/** @deprecated Use FAIXA_ESCALA_4 / FAIXA_ESCALA_5. Mantido só para imports legados. */
export const COPSOQ_FAIXA_BAIXA_MAX = FAIXA_ESCALA_4.baixoMax;
export const COPSOQ_FAIXA_MEDIA_MIN = FAIXA_ESCALA_4.medioMin;
export const COPSOQ_FAIXA_MEDIA_MAX = FAIXA_ESCALA_4.altoMin;

function classificarNaEscala(
  tipo: CopsoqDimensao["tipo"],
  media: number,
  faixa: { altoMin: number; medioMin: number; baixoMax: number }
): CopsoqClassificacaoResultado {
  if (tipo === "RISCO") {
    if (media <= faixa.baixoMax) return CLASSIFICACOES.situacao_favoravel;
    if (media < faixa.altoMin) return CLASSIFICACOES.risco_intermediario;
    return CLASSIFICACOES.risco_para_saude;
  }
  // PROTEÇÃO
  if (media >= faixa.altoMin) return CLASSIFICACOES.situacao_favoravel;
  if (media >= faixa.medioMin) return CLASSIFICACOES.risco_intermediario;
  return CLASSIFICACOES.risco_para_saude;
}

/**
 * Classifica a média da dimensão na escala final do produto (0–4 ou 0–5).
 */
export function classificarMediaDimensao(
  dimensao: CopsoqDimensao,
  media: number | null,
  escalaFinal?: EscalaFinalProduto
): CopsoqClassificacaoResultado {
  if (!dimensao.entraNoCalculo) {
    return {
      ...CLASSIFICACAO_NAO_DEFINIDA,
      motivo:
        "Dimensão fora do cálculo quantitativo (ex.: Comportamentos ofensivos).",
    };
  }
  if (media == null || Number.isNaN(media)) {
    return {
      ...CLASSIFICACAO_NAO_DEFINIDA,
      motivo: "Média indisponível (respostas ausentes ou incompletas).",
    };
  }

  const escala =
    escalaFinal ??
    (dimensao.id ? escalaFinalDimensao(dimensao.id) : (4 as EscalaFinalProduto));

  const faixa = escala === 5 ? FAIXA_ESCALA_5 : FAIXA_ESCALA_4;
  return classificarNaEscala(dimensao.tipo, media, faixa);
}
