import { getCopsoqEscala } from "@/lib/copsoq/escalas";
import { getCopsoqInstrumento, getPerguntasOrdenadas } from "@/lib/copsoq/instrument";
import type {
  CopsoqAlternativa,
  CopsoqClassificacaoId,
  CopsoqDimensao,
  CopsoqPergunta,
} from "@/lib/copsoq/types";

export type CopsoqClassificacao = {
  id: CopsoqClassificacaoId;
  label: string;
  interpretacao: string;
};

const CLASSIFICACOES: Record<CopsoqClassificacaoId, CopsoqClassificacao> = {
  situacao_favoravel: {
    id: "situacao_favoravel",
    label: "Situação Favorável",
    interpretacao: "Baixo/Nenhum risco",
  },
  risco_intermediario: {
    id: "risco_intermediario",
    label: "Risco Intermediário",
    interpretacao: "Médio risco",
  },
  risco_para_saude: {
    id: "risco_para_saude",
    label: "Risco para Saúde",
    interpretacao: "Alto risco",
  },
};

function maxPontuacaoEscala(pergunta: CopsoqPergunta): number {
  const escala = getCopsoqEscala(pergunta.tipoEscala);
  if (!escala || escala.alternativas.length === 0) return 0;
  return Math.max(...escala.alternativas.map((a) => a.pontuacao));
}

/**
 * Pontuação efetiva da alternativa escolhida.
 * Se pontuacaoInvertida, usa max - pontuacao (ex.: 1B).
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

/**
 * Média individual da dimensão = soma das pontuações / nº de perguntas da dimensão
 * (apenas perguntas com entraNoCalculo).
 * `respostas` deve mapear perguntaId → alternativaId (ou label, por compatibilidade).
 */
export function mediaIndividualDimensao(
  dimensaoId: string,
  respostas: Record<string, string>
): number | null {
  const perguntas = getPerguntasOrdenadas().filter(
    (p) => p.dimensaoId === dimensaoId && p.entraNoCalculo
  );
  if (perguntas.length === 0) return null;

  let soma = 0;
  for (const p of perguntas) {
    const valor = respostas[p.id];
    if (!valor) return null;
    const pts =
      pontuarRespostaPorId(p, valor) ?? pontuarRespostaPorLabel(p, valor);
    if (pts === null) return null;
    soma += pts;
  }
  return soma / perguntas.length;
}

/**
 * Média geral da dimensão na empresa = média das médias individuais.
 */
export function mediaGeralDimensao(
  mediasIndividuais: number[]
): number | null {
  if (mediasIndividuais.length === 0) return null;
  const soma = mediasIndividuais.reduce((a, b) => a + b, 0);
  return soma / mediasIndividuais.length;
}

/**
 * Classificação conforme PDF de Orientações.
 * RISCO: alto valor = pior. PROTEÇÃO: alto valor = melhor (faixas invertidas).
 */
export function classificarMediaDimensao(
  dimensao: CopsoqDimensao,
  media: number
): CopsoqClassificacao {
  if (dimensao.tipo === "RISCO") {
    if (media <= 2.33) return CLASSIFICACOES.situacao_favoravel;
    if (media <= 3.66) return CLASSIFICACOES.risco_intermediario;
    return CLASSIFICACOES.risco_para_saude;
  }
  // PROTEÇÃO
  if (media > 3.66) return CLASSIFICACOES.situacao_favoravel;
  if (media >= 2.34) return CLASSIFICACOES.risco_intermediario;
  return CLASSIFICACOES.risco_para_saude;
}

/** Dimensões que entram na média geral da pesquisa. */
export function dimensoesParaMediaGeral(): CopsoqDimensao[] {
  return getCopsoqInstrumento().dimensoes.filter((d) => d.entraNoCalculo);
}
