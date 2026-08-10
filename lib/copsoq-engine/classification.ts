import type { CopsoqDimensao } from "@/lib/copsoq/types";
import type {
  CopsoqClassificacaoResultado,
} from "@/lib/copsoq-engine/types";

/**
 * Classificações oficiais — Orientações COPSOQ II-Br.
 * Cortes explícitos: 2,33 e 3,66.
 *
 * RISCO: 0–2,33 Favorável | 2,34–3,66 Intermediário | >3,66 Risco para Saúde
 * PROTEÇÃO: >3,66 Favorável | 2,34–3,66 Intermediário | 0–2,33 Risco para Saúde
 *
 * Divergência documentada: tabelas citam “Intervalo (0 a 5)” enquanto o
 * Formulário pontua 0–4. Aplicamos os cortes numéricos oficiais sem
 * renormalizar a escala.
 */
const CLASSIFICACOES = {
  situacao_favoravel: {
    id: "situacao_favoravel" as const,
    label: "Situação Favorável",
    interpretacao: "Baixo/Nenhum risco",
  },
  risco_intermediario: {
    id: "risco_intermediario" as const,
    label: "Risco Intermediário",
    interpretacao: "Médio risco",
  },
  risco_para_saude: {
    id: "risco_para_saude" as const,
    label: "Risco para Saúde",
    interpretacao: "Alto risco",
  },
};

export const CLASSIFICACAO_NAO_DEFINIDA: CopsoqClassificacaoResultado = {
  id: "classificacao_nao_definida",
  label: "Classificação não definida",
  interpretacao: "Regra oficial insuficiente ou média indisponível",
};

/** Limites oficiais documentados nas Orientações. */
export const COPSOQ_FAIXA_BAIXA_MAX = 2.33;
export const COPSOQ_FAIXA_MEDIA_MIN = 2.34;
export const COPSOQ_FAIXA_MEDIA_MAX = 3.66;

/**
 * Classifica a média da dimensão conforme tipo RISCO/PROTEÇÃO.
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

  // PROTEÇÃO — faixas invertidas (Orientações)
  if (media > COPSOQ_FAIXA_MEDIA_MAX) return CLASSIFICACOES.situacao_favoravel;
  if (media >= COPSOQ_FAIXA_MEDIA_MIN) return CLASSIFICACOES.risco_intermediario;
  return CLASSIFICACOES.risco_para_saude;
}
