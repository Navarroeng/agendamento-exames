import { COPSOQ_DIMENSOES } from "@/lib/copsoq/dimensoes";
import { COPSOQ_ESCALAS } from "@/lib/copsoq/escalas";
import {
  COPSOQ_INSTRUMENTO,
  getPerguntasOrdenadas,
} from "@/lib/copsoq/instrument";
import { COPSOQ_PERGUNTAS } from "@/lib/copsoq/perguntas";

export type CopsoqValidationReport = {
  ok: boolean;
  erros: string[];
  avisos: string[];
  totais: {
    questoesPrincipais: number;
    perguntasAvaliativas: number;
    dimensoes: number;
    escalas: number;
  };
};

export function validarInstrumentoCopsoq(): CopsoqValidationReport {
  const erros: string[] = [];
  const avisos: string[] = [];
  const perguntas = getPerguntasOrdenadas();

  if (perguntas.length !== 40) {
    erros.push(`Esperado 40 perguntas avaliativas, encontrado ${perguntas.length}.`);
  }
  if (COPSOQ_INSTRUMENTO.totalPerguntasAvaliativas !== 40) {
    erros.push("totalPerguntasAvaliativas deve ser 40.");
  }

  const questoes = new Set(perguntas.map((p) => p.questaoPrincipal));
  if (questoes.size !== 23) {
    erros.push(
      `Esperado 23 questões principais, encontrado ${questoes.size}.`
    );
  }
  if (COPSOQ_INSTRUMENTO.totalQuestoesPrincipais !== 23) {
    erros.push("totalQuestoesPrincipais deve ser 23.");
  }

  const codigos = perguntas.map((p) => p.codigo);
  if (new Set(codigos).size !== codigos.length) {
    erros.push("Há códigos de pergunta duplicados.");
  }

  const textos = perguntas.map((p) => p.texto);
  if (new Set(textos).size !== textos.length) {
    avisos.push("Há textos de pergunta duplicados.");
  }

  for (let i = 0; i < perguntas.length; i += 1) {
    if (perguntas[i]!.ordem !== i + 1) {
      erros.push(`Ordem inválida em ${perguntas[i]!.codigo}.`);
      break;
    }
  }

  const dimIds = new Set(COPSOQ_DIMENSOES.map((d) => d.id));
  for (const p of perguntas) {
    if (!dimIds.has(p.dimensaoId)) {
      erros.push(`Pergunta ${p.codigo} com dimensão inválida.`);
    }
    const escala = COPSOQ_ESCALAS.find((e) => e.id === p.tipoEscala);
    if (!escala) {
      erros.push(`Pergunta ${p.codigo} com escala inválida.`);
    }
  }

  const ofensivos = COPSOQ_DIMENSOES.find(
    (d) => d.id === "comportamentos-ofensivos"
  );
  if (!ofensivos) {
    erros.push("Dimensão Comportamentos ofensivos ausente.");
  } else if (ofensivos.entraNoCalculo) {
    erros.push("Comportamentos ofensivos não deve entrar no cálculo.");
  }

  const invertidas = perguntas.filter((p) => p.pontuacaoInvertida);
  if (!invertidas.some((p) => p.codigo === "1B")) {
    erros.push("1B deve estar marcada com pontuacaoInvertida.");
  }

  const p1 = perguntas[0];
  const p40 = perguntas[39];
  if (p1?.codigo !== "1A" || !p1.texto.includes("atrasa a entrega")) {
    erros.push("Primeira pergunta deve ser 1A oficial.");
  }
  if (p40?.codigo !== "23" || !p40.texto.toLowerCase().includes("bullying")) {
    erros.push("Última pergunta deve ser 23 (bullying) oficial.");
  }

  if (COPSOQ_DIMENSOES.length !== 11) {
    erros.push(`Esperado 11 dimensões, encontrado ${COPSOQ_DIMENSOES.length}.`);
  }

  return {
    ok: erros.length === 0,
    erros,
    avisos,
    totais: {
      questoesPrincipais: questoes.size,
      perguntasAvaliativas: perguntas.length,
      dimensoes: COPSOQ_DIMENSOES.length,
      escalas: COPSOQ_ESCALAS.length,
    },
  };
}

/** Garante que não há lista paralela antiga divergente. */
export function assertSemPerguntasLegadas(): void {
  if (COPSOQ_PERGUNTAS.length !== 40) {
    throw new Error("Instrumento COPSOQ inválido.");
  }
}
