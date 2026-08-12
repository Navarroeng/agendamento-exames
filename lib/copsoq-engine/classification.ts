import type { CopsoqDimensao } from "@/lib/copsoq/types";
import type { CopsoqClassificacaoResultado } from "@/lib/copsoq-engine/types";
import {
  escalaDimensaoProduto,
  type EscalaDimensaoProduto,
} from "@/lib/copsoq-engine/escala-produto";

/**
 * Classificação — metodologia do produto (escalas impressas 0–3 e 0–4).
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

/** Faixas na escala impressa 0–4 (5 alternativas). Cortes 1,60 / 2,80. */
export const FAIXA_ESCALA_4 = {
  altoMin: 2.8,
  medioMin: 1.6,
  baixoMax: 1.59,
} as const;

/** Faixas na escala impressa 0–3 (4 alternativas). Cortes 1,20 / 2,10. */
export const FAIXA_ESCALA_3 = {
  altoMin: 2.1,
  medioMin: 1.2,
  baixoMax: 1.19,
} as const;

/** @deprecated Não há mais escala 0–5 no produto. Alias legado de FAIXA_ESCALA_4. */
export const FAIXA_ESCALA_5 = FAIXA_ESCALA_4;

/** @deprecated Preferir FAIXA_ESCALA_4 / FAIXA_ESCALA_3. */
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
 * Classifica a média da dimensão na escala impressa (0–3 ou 0–4).
 */
export function classificarMediaDimensao(
  dimensao: CopsoqDimensao,
  media: number | null,
  escalaDimensao?: EscalaDimensaoProduto
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
    escalaDimensao ??
    (dimensao.id
      ? escalaDimensaoProduto(dimensao.id)
      : (4 as EscalaDimensaoProduto));

  const faixa = escala === 3 ? FAIXA_ESCALA_3 : FAIXA_ESCALA_4;
  return classificarNaEscala(dimensao.tipo, media, faixa);
}
