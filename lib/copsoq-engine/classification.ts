import type { CopsoqDimensao } from "@/lib/copsoq/types";
import type { CopsoqClassificacaoResultado } from "@/lib/copsoq-engine/types";

/**
 * Classificação do produto (Riscos Psicossociais) — escala comum 0–4.
 *
 * Cortes oficiais do instrumento COPSOQ II-Br (Orientações: 2,33 / 3,66) foram
 * substituídos, por decisão de produto, pelos cortes 1,33 / 2,66 e pela
 * nomenclatura Situação Favorável / Moderada / Desfavorável.
 *
 * Ver docs/copsoq/METODOLOGIA-PRODUTO.md e REGRAS-DE-CALCULO.md.
 *
 * PROTEÇÃO (maior = melhor):
 *   > 2,66 Favorável | 1,34–2,66 Moderada | 0–1,33 Desfavorável
 *
 * RISCO (maior = pior):
 *   0–1,33 Favorável | 1,34–2,66 Moderada | > 2,66 Desfavorável
 *
 * IDs internos estáveis (compatibilidade de snapshot / filtros):
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

/** Limites da metodologia do produto (escala comum 0–4). */
export const COPSOQ_FAIXA_BAIXA_MAX = 1.33;
export const COPSOQ_FAIXA_MEDIA_MIN = 1.34;
export const COPSOQ_FAIXA_MEDIA_MAX = 2.66;

/**
 * Classifica a média da dimensão (já normalizada 0–4) conforme tipo RISCO/PROTEÇÃO.
 * Se a dimensão não entra no cálculo quantitativo, não classifica.
 */
export function classificarMediaDimensao(
  dimensao: CopsoqDimensao,
  media: number | null
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

  if (dimensao.tipo === "RISCO") {
    if (media <= COPSOQ_FAIXA_BAIXA_MAX) return CLASSIFICACOES.situacao_favoravel;
    if (media <= COPSOQ_FAIXA_MEDIA_MAX) return CLASSIFICACOES.risco_intermediario;
    return CLASSIFICACOES.risco_para_saude;
  }

  // PROTEÇÃO — faixas invertidas (maior pontuação = melhor)
  if (media > COPSOQ_FAIXA_MEDIA_MAX) return CLASSIFICACOES.situacao_favoravel;
  if (media >= COPSOQ_FAIXA_MEDIA_MIN) return CLASSIFICACOES.risco_intermediario;
  return CLASSIFICACOES.risco_para_saude;
}
