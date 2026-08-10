import { COPSOQ_DIMENSOES } from "@/lib/copsoq/dimensoes";
import { COPSOQ_ESCALAS, getCopsoqEscala } from "@/lib/copsoq/escalas";
import { COPSOQ_INTERSTICIAIS_OFICIAIS } from "@/lib/copsoq/intersticiais";
import { COPSOQ_PERGUNTAS } from "@/lib/copsoq/perguntas";
import type {
  CopsoqAlternativa,
  CopsoqFlowItem,
  CopsoqInstrumento,
  CopsoqPergunta,
} from "@/lib/copsoq/types";

export const COPSOQ_INSTRUMENTO: CopsoqInstrumento = {
  id: "copsoq-ii-br",
  nome: "Copenhagen Psychosocial Questionnaire - COPSOQ II (BR)",
  versao: "oficial-formulario",
  totalQuestoesPrincipais: 23,
  totalPerguntasAvaliativas: 40,
  dimensoes: COPSOQ_DIMENSOES,
  escalas: COPSOQ_ESCALAS,
  perguntas: COPSOQ_PERGUNTAS,
};

export function getCopsoqInstrumento(): CopsoqInstrumento {
  return COPSOQ_INSTRUMENTO;
}

export function getPerguntasOrdenadas(): CopsoqPergunta[] {
  return [...COPSOQ_PERGUNTAS].sort((a, b) => a.ordem - b.ordem);
}

export function getDimensaoById(id: string) {
  return COPSOQ_DIMENSOES.find((d) => d.id === id);
}

export function getAlternativasDaPergunta(
  pergunta: CopsoqPergunta
): readonly CopsoqAlternativa[] {
  const escala = getCopsoqEscala(pergunta.tipoEscala);
  if (!escala) {
    throw new Error(`Escala não encontrada: ${pergunta.tipoEscala}`);
  }
  return escala.alternativas;
}

/**
 * Fluxo do portal: perguntas + somente interstícios oficiais do Formulário.
 * Dimensões internas NÃO geram telas intermediárias automaticamente.
 */
export function buildCopsoqFlow(): {
  items: CopsoqFlowItem[];
  totalPerguntas: number;
} {
  const perguntas = getPerguntasOrdenadas();
  const interPorCodigo = new Map(
    COPSOQ_INTERSTICIAIS_OFICIAIS.map((i) => [i.antesDeCodigo, i])
  );
  const items: CopsoqFlowItem[] = [];
  let perguntaIndex = 0;

  for (const pergunta of perguntas) {
    const dimensao = getDimensaoById(pergunta.dimensaoId);
    if (!dimensao) {
      throw new Error(
        `Dimensão não encontrada para ${pergunta.codigo}: ${pergunta.dimensaoId}`
      );
    }

    const inter = interPorCodigo.get(pergunta.codigo);
    if (inter) {
      items.push({
        type: "transicao",
        key: `t-${inter.id}`,
        titulo: inter.titulo,
        texto: inter.texto,
        antesDeCodigo: inter.antesDeCodigo,
        dimensao,
        primeiraPerguntaOrdem: pergunta.ordem,
      });
    }

    items.push({
      type: "pergunta",
      key: pergunta.id,
      pergunta,
      dimensao,
      perguntaIndex,
      numero: perguntaIndex + 1,
    });
    perguntaIndex += 1;
  }

  return {
    items,
    totalPerguntas: perguntas.length,
  };
}
