/**
 * Consolidação anônima de resultados COPSOQ por campanha.
 * Não usa nome/CPF/participante_id — apenas sessões concluídas válidas + respostas.
 */

import { getPerguntasOrdenadas } from "@/lib/copsoq/instrument";
import { getCopsoqEscala } from "@/lib/copsoq/escalas";
import {
  interpretarCampanhaCopsoq,
  type CopsoqEngineResult,
  type CopsoqRespostasRespondente,
} from "@/lib/copsoq-engine";
import { sessaoContaNosResultados } from "@/lib/riscos-invalidacao";

export type SessaoAvaliacaoConsolidacao = {
  id: string;
  campanha_id: string;
  status: string;
  /** false = invalidada administrativamente; ausente/true = válida. */
  valida?: boolean | null;
};

export type RespostaAvaliacaoConsolidacao = {
  sessao_id: string;
  campanha_id: string;
  pergunta_id: string;
  alternativa_id: string;
};

export type RiscosResultadosPublicos = {
  campanhaId: string;
  sessoesConcluidas: number;
  previstos: number;
  pendentes: number;
  participacaoPercentual: number | null;
  statusCampanha: string;
  riscoGeral: null;
  riscoGeralMensagem: string;
  dimensoes: CopsoqEngineResult["dimensoes"];
  comportamentosOfensivos: {
    titulo: string;
    respondentesComAlgumaResposta: number;
    media: null;
    classificacao: null;
    itens: Array<{
      perguntaCodigo: string;
      perguntaTexto: string;
      totais: Array<{ alternativaId: string; label: string; quantidade: number }>;
    }>;
  };
  engine: CopsoqEngineResult;
};

export const RISCO_GERAL_NAO_DEFINIDO =
  "Risco geral: não definido pelo instrumento/documentação utilizada.";

/**
 * Filtra sessões concluídas e válidas da campanha informada.
 * Em andamento, inválidas e de outras campanhas são ignoradas.
 */
export function filtrarSessoesConcluidasCampanha(
  sessoes: SessaoAvaliacaoConsolidacao[],
  campanhaId: string
): SessaoAvaliacaoConsolidacao[] {
  return sessoes.filter(
    (s) => s.campanha_id === campanhaId && sessaoContaNosResultados(s)
  );
}

/**
 * Monta um respondente do engine por sessão concluída.
 * Ignora respostas de outras campanhas ou sessões não concluídas.
 */
export function montarRespondentesEngine(input: {
  campanhaId: string;
  sessoes: SessaoAvaliacaoConsolidacao[];
  respostas: RespostaAvaliacaoConsolidacao[];
}): CopsoqRespostasRespondente[] {
  const concluidas = filtrarSessoesConcluidasCampanha(
    input.sessoes,
    input.campanhaId
  );
  const ids = new Set(concluidas.map((s) => s.id));

  const porSessao = new Map<string, CopsoqRespostasRespondente>();
  for (const s of concluidas) {
    porSessao.set(s.id, {});
  }

  for (const r of input.respostas) {
    if (r.campanha_id !== input.campanhaId) continue;
    if (!ids.has(r.sessao_id)) continue;
    const bag = porSessao.get(r.sessao_id);
    if (!bag) continue;
    bag[r.pergunta_id] = r.alternativa_id;
  }

  return concluidas.map((s) => porSessao.get(s.id) ?? {});
}

function labelAlternativa(perguntaId: string, alternativaId: string): string {
  const pergunta = getPerguntasOrdenadas().find((p) => p.id === perguntaId);
  if (!pergunta) return alternativaId;
  const escala = getCopsoqEscala(pergunta.tipoEscala);
  const alt = escala?.alternativas.find((a) => a.id === alternativaId);
  return alt?.label ?? alternativaId;
}

/**
 * Executa o motor e monta payload público (sem PII, sem respostas nominais).
 */
export function consolidarResultadosCampanha(input: {
  campanhaId: string;
  statusCampanha: string;
  /** Total de participantes cadastrados ativos (quantidade oficial). */
  quantidadeCadastrados: number;
  sessoes: SessaoAvaliacaoConsolidacao[];
  respostas: RespostaAvaliacaoConsolidacao[];
}): RiscosResultadosPublicos {
  const respondentes = montarRespondentesEngine(input);
  const cadastrados = Math.max(0, input.quantidadeCadastrados);
  const engine = interpretarCampanhaCopsoq({
    respondentes,
    baseParticipacao: cadastrados > 0 ? cadastrados : respondentes.length,
  });

  const sessoesConcluidas = respondentes.length;
  const pendentes = Math.max(0, cadastrados - sessoesConcluidas);

  const ofens = engine.comportamentosOfensivos;
  const perguntasOfensivas = getPerguntasOrdenadas().filter(
    (p) => p.dimensaoId === "comportamentos-ofensivos"
  );

  const itens = perguntasOfensivas.map((p) => {
    const freq = ofens.frequenciasPorPergunta[p.id] ?? {};
    const totais = Object.entries(freq)
      .map(([alternativaId, quantidade]) => ({
        alternativaId,
        label: labelAlternativa(p.id, alternativaId),
        quantidade,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
    return {
      perguntaCodigo: p.codigo,
      perguntaTexto: p.texto,
      totais,
    };
  });

  return {
    campanhaId: input.campanhaId,
    sessoesConcluidas,
    previstos: cadastrados,
    pendentes,
    participacaoPercentual: engine.participacao.percentual,
    statusCampanha: input.statusCampanha,
    riscoGeral: null,
    riscoGeralMensagem: RISCO_GERAL_NAO_DEFINIDO,
    dimensoes: engine.dimensoes,
    comportamentosOfensivos: {
      titulo: "Comportamentos Ofensivos",
      respondentesComAlgumaResposta: ofens.respondentesComAlgumaResposta,
      media: null,
      classificacao: null,
      itens,
    },
    engine,
  };
}

/** True se há pelo menos uma sessão concluída consolidável. */
export function temResultadosConcluidos(
  resultado: Pick<RiscosResultadosPublicos, "sessoesConcluidas">
): boolean {
  return resultado.sessoesConcluidas > 0;
}

/** Há detalhes úteis para expandir o bloco qualitativo no modal. */
export function comportamentosOfensivosPermiteExpansao(
  respondentesComAlgumaResposta: number
): boolean {
  return respondentesComAlgumaResposta > 0;
}

/** Resumo compacto do cabeçalho (não altera o cálculo qualitativo). */
export function labelResumoComportamentosOfensivos(
  respondentesComAlgumaResposta: number
): string {
  const n = Math.max(0, Math.floor(respondentesComAlgumaResposta));
  if (n <= 0) return "Nenhuma ocorrência registrada";
  if (n === 1) return "1 sessão com alguma resposta";
  return `${n} sessões com alguma resposta`;
}
