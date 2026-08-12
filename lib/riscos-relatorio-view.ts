/**
 * Helpers de apresentação do Relatório Executivo (V2).
 * Somente UI — não altera cálculos, geração ou persistência.
 */

import type { CopsoqClassificacaoResultadoId } from "@/lib/copsoq-engine";
import { COPSOQ_DIMENSOES } from "@/lib/copsoq/dimensoes";
import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";

/** Cores padronizadas das 3 faixas oficiais (apresentação). */
export const RELATORIO_CORES = {
  /** Situação Favorável */
  situacao_favoravel: "#16a34a",
  /** Faixa intermediária oficial — amarelo (não laranja). */
  risco_intermediario: "#ca8a04",
  /** Risco para a Saúde / faixa crítica */
  risco_para_saude: "#dc2626",
  classificacao_nao_definida: "#64748b",
  /** Destaques de UI (cards de atenção); alinhado ao amarelo da faixa média. */
  atencao: "#ca8a04",
} as const;

export const RELATORIO_LEGENDA = [
  {
    id: "situacao_favoravel" as const,
    label: "Situação Favorável",
    cor: RELATORIO_CORES.situacao_favoravel,
  },
  {
    id: "risco_intermediario" as const,
    label: "Risco Intermediário",
    cor: RELATORIO_CORES.risco_intermediario,
  },
  {
    id: "risco_para_saude" as const,
    label: "Risco para a Saúde",
    cor: RELATORIO_CORES.risco_para_saude,
  },
] as const;

export function corPorClassificacaoId(
  id: CopsoqClassificacaoResultadoId | string | null | undefined
): string {
  if (id === "situacao_favoravel") return RELATORIO_CORES.situacao_favoravel;
  if (id === "risco_intermediario") return RELATORIO_CORES.risco_intermediario;
  if (id === "risco_para_saude") return RELATORIO_CORES.risco_para_saude;
  return RELATORIO_CORES.classificacao_nao_definida;
}

export function bgSuavePorClassificacaoId(
  id: CopsoqClassificacaoResultadoId | string | null | undefined
): string {
  if (id === "situacao_favoravel") return "#ecfdf5";
  /** Amarelo suave — sem tom laranja. */
  if (id === "risco_intermediario") return "#fefce8";
  if (id === "risco_para_saude") return "#fef2f2";
  return "#f8fafc";
}

/** Severidade 0 (melhor) → 2 (pior). */
export function severidadeClassificacao(
  id: CopsoqClassificacaoResultadoId | string
): number {
  if (id === "situacao_favoravel") return 0;
  if (id === "risco_intermediario") return 1;
  if (id === "risco_para_saude") return 2;
  return 3;
}

/**
 * Favorabilidade (maior = melhor) — só para ordenação/ranking/visual.
 * PROTEÇÃO: média; RISCO: 4 − média. Não altera classificação do motor.
 */
export function scoreFavorabilidade(
  d: Pick<RiscosRelatorioDimensaoSnapshot, "media" | "tipo">
): number {
  if (d.media == null || Number.isNaN(d.media)) return Number.NEGATIVE_INFINITY;
  const tipo = String(d.tipo).toUpperCase();
  if (tipo === "RISCO") return 4 - d.media;
  return d.media;
}

export function dimensoesParaCalculo(
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[]
): RiscosRelatorioDimensaoSnapshot[] {
  return dimensoes.filter((d) => d.entraNoCalculo && d.media != null);
}

export function dimensoesOrdenadasPorMediaDesc(
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[]
): RiscosRelatorioDimensaoSnapshot[] {
  return [...dimensoesParaCalculo(dimensoes)].sort(
    (a, b) => (b.media ?? 0) - (a.media ?? 0)
  );
}

function compararFavorabilidadeDesc(
  a: RiscosRelatorioDimensaoSnapshot,
  b: RiscosRelatorioDimensaoSnapshot
): number {
  return scoreFavorabilidade(b) - scoreFavorabilidade(a);
}

function compararAtencao(
  a: RiscosRelatorioDimensaoSnapshot,
  b: RiscosRelatorioDimensaoSnapshot
): number {
  const sev =
    severidadeClassificacao(b.classificacaoId) -
    severidadeClassificacao(a.classificacaoId);
  if (sev !== 0) return sev;
  return scoreFavorabilidade(a) - scoreFavorabilidade(b);
}

/**
 * Top melhores: classificação mais favorável primeiro, depois maior favorabilidade
 * (RISCO baixo / PROTEÇÃO alta).
 */
export function rankingMelhores(
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[],
  limite = 5
): RiscosRelatorioDimensaoSnapshot[] {
  return [...dimensoesParaCalculo(dimensoes)]
    .sort((a, b) => {
      const sev =
        severidadeClassificacao(a.classificacaoId) -
        severidadeClassificacao(b.classificacaoId);
      if (sev !== 0) return sev;
      return compararFavorabilidadeDesc(a, b);
    })
    .slice(0, limite);
}

export type RankingAtencaoResultado = {
  /**
   * Dimensões em Risco para a Saúde ou Intermediário (pior primeiro),
   * completadas com Favoráveis de menor favorabilidade se faltar vaga.
   * Vazio quando todas as dimensões são Favoráveis (sem ranking relativo).
   */
  itens: RiscosRelatorioDimensaoSnapshot[];
  /** Só intermediário/crítico (sem preenchimento Favorável). */
  prioritarias: RiscosRelatorioDimensaoSnapshot[];
  /**
   * Favoráveis usadas só para completar o Top quando já há
   * intermediário/crítico. Vazio se o relatório estiver todo favorável.
   */
  relativasFavoraveis: RiscosRelatorioDimensaoSnapshot[];
  /** True se nenhuma dimensão está em intermediário ou crítico. */
  semRiscosClassificados: boolean;
};

/**
 * Ranking de atenção: prioriza classificação oficial (crítico → intermediário),
 * depois menor favorabilidade. Se tudo for Favorável, não monta ranking
 * relativo — evita sugerir “problemas” em relatório saudável.
 */
export function montarRankingAtencao(
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[],
  limite = 5
): RankingAtencaoResultado {
  const calc = dimensoesParaCalculo(dimensoes);

  const prioritarias = calc
    .filter((d) => severidadeClassificacao(d.classificacaoId) >= 1)
    .sort(compararAtencao)
    .slice(0, limite);

  const semRiscosClassificados = prioritarias.length === 0;

  if (semRiscosClassificados) {
    return {
      itens: [],
      prioritarias: [],
      relativasFavoraveis: [],
      semRiscosClassificados: true,
    };
  }

  const relativasFavoraveis = calc
    .filter((d) => d.classificacaoId === "situacao_favoravel")
    .sort((a, b) => scoreFavorabilidade(a) - scoreFavorabilidade(b));

  const faltam = Math.max(0, limite - prioritarias.length);
  const preenchimento = relativasFavoraveis.slice(0, faltam);

  return {
    itens: [...prioritarias, ...preenchimento],
    prioritarias,
    relativasFavoraveis: preenchimento,
    semRiscosClassificados: false,
  };
}

/**
 * Lista plana do ranking de atenção (compatível com conteúdo narrativo).
 * Quando tudo é Favorável, retorna lista vazia.
 */
export function rankingAtencao(
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[],
  limite = 5
): RiscosRelatorioDimensaoSnapshot[] {
  const r = montarRankingAtencao(dimensoes, limite);
  if (r.semRiscosClassificados) return [];
  return r.itens;
}

export function nomeCurtoDimensao(nome: string, max = 22): string {
  const n = nome.trim();
  if (n.length <= max) return n;
  return `${n.slice(0, max - 1)}…`;
}

export function descricaoOficialDimensao(dimensaoId: string): string {
  const found = COPSOQ_DIMENSOES.find((d) => d.id === dimensaoId);
  return (
    found?.descricao ??
    "Descrição oficial da dimensão disponível no instrumento COPSOQ II-Br."
  );
}

export function iniciaisEmpresa(nome: string): string {
  const parts = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 1 && !/^(de|da|do|das|dos|e|a|o)$/i.test(p));
  if (parts.length === 0) return "RP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function formatMediaRelatorio(media: number | null | undefined): string {
  if (media == null || Number.isNaN(media)) return "—";
  return media.toFixed(2).replace(".", ",");
}

/** Snapshot gerado após a normalização de amplitude (possui mediaBruta). */
export function snapshotTemNormalizacao(
  d: Pick<RiscosRelatorioDimensaoSnapshot, "mediaBruta">
): boolean {
  return d.mediaBruta != null && !Number.isNaN(d.mediaBruta);
}

export function relatorioTemNormalizacao(
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[]
): boolean {
  const calc = dimensoes.filter((d) => d.entraNoCalculo && d.media != null);
  if (calc.length === 0) return false;
  return calc.every((d) => snapshotTemNormalizacao(d));
}

/** Ex.: "3,00 / 3" */
export function formatPontuacaoComMaximo(
  valor: number | null | undefined,
  maximo: number | null | undefined
): string {
  const v = formatMediaRelatorio(valor);
  if (v === "—") return "—";
  if (maximo == null || Number.isNaN(maximo)) return v;
  return `${v} / ${maximo}`;
}

export type RadarChartDatum = {
  dimensao: string;
  nomeCompleto: string;
  media: number;
  fullMark: number;
};

export function montarDadosRadar(
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[]
): RadarChartDatum[] {
  return dimensoesParaCalculo(dimensoes).map((d) => ({
    dimensao: nomeCurtoDimensao(d.nome, 18),
    nomeCompleto: d.nome,
    media: Number(d.media ?? 0),
    fullMark: 4,
  }));
}

export type BarraChartDatum = {
  id: string;
  nome: string;
  tipo: string;
  /** Pontuação padronizada técnica (0–4) — nunca inventar a partir do visual. */
  media: number;
  /**
   * Comprimento visual da barra (0–4).
   * PROTEÇÃO: igual à media; RISCO: 4 − media (maior barra = melhor resultado).
   */
  valorVisual: number;
  cor: string;
  classificacaoLabel: string;
};

/** Comprimento visual da barra (somente UI). Mesma métrica de favorabilidade. */
export function valorVisualBarraDimensao(
  d: Pick<RiscosRelatorioDimensaoSnapshot, "media" | "tipo">
): number {
  const score = scoreFavorabilidade(d);
  if (!Number.isFinite(score) || score === Number.NEGATIVE_INFINITY) return 0;
  return score;
}

export function montarDadosBarras(
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[]
): BarraChartDatum[] {
  return [...dimensoesParaCalculo(dimensoes)]
    .map((d) => ({
      id: d.id,
      nome: d.nome,
      tipo: d.tipo,
      media: Number(d.media ?? 0),
      valorVisual: valorVisualBarraDimensao(d),
      cor: corPorClassificacaoId(d.classificacaoId),
      classificacaoLabel: d.classificacaoLabel,
    }))
    .sort((a, b) => b.valorVisual - a.valorVisual);
}

/**
 * Status geral do resumo executivo (somente apresentação).
 * - Favorável: nenhuma intermediária nem em Risco para a Saúde
 * - Atenção / Monitoramento: há Risco Intermediário, sem Risco para a Saúde
 * - Atenção Prioritária: há ao menos uma em Risco para a Saúde
 */
export function statusGeralResumo(input: {
  /** @deprecated Preferir contagens separadas. Mantido para compatibilidade. */
  dimensoesCriticasCount?: number;
  riscoIntermediarioCount?: number;
  riscoParaSaudeCount?: number;
  statusGeralMensagem?: string | null;
}): {
  label: string;
  tom: "ok" | "atencao" | "critico" | "neutro";
  mensagem: string;
} {
  const nSaude = input.riscoParaSaudeCount ?? 0;
  // Compat: se só veio o agregado antigo (intermediário + saúde juntos),
  // trata como "atenção/monitoramento" — nunca como crítico automático.
  const nInter =
    input.riscoIntermediarioCount ??
    (input.riscoParaSaudeCount == null
      ? input.dimensoesCriticasCount ?? 0
      : 0);

  if (nSaude > 0) {
    return {
      label: "Atenção prioritária",
      tom: "critico",
      mensagem:
        input.statusGeralMensagem?.trim() ||
        "Há dimensão(ões) em Risco para a Saúde — intervenção prioritária.",
    };
  }
  if (nInter > 0) {
    return {
      label: "Atenção / Monitoramento",
      tom: "atencao",
      mensagem:
        input.statusGeralMensagem?.trim() ||
        "Há dimensão(ões) em Risco Intermediário — monitorar e reforçar suporte.",
    };
  }
  return {
    label: "Situação Favorável",
    tom: "ok",
    mensagem:
      input.statusGeralMensagem?.trim() ||
      "Nenhuma dimensão em Risco Intermediário ou Risco para a Saúde.",
  };
}

/** Contagens oficiais por faixa a partir do snapshot (UI). */
export function contarFaixasClassificacao(
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[]
): {
  favoravel: number;
  intermediario: number;
  riscoParaSaude: number;
  emAtencao: number;
} {
  let favoravel = 0;
  let intermediario = 0;
  let riscoParaSaude = 0;
  for (const d of dimensoesParaCalculo(dimensoes)) {
    if (d.classificacaoId === "situacao_favoravel") favoravel += 1;
    else if (d.classificacaoId === "risco_intermediario") intermediario += 1;
    else if (d.classificacaoId === "risco_para_saude") riscoParaSaude += 1;
  }
  return {
    favoravel,
    intermediario,
    riscoParaSaude,
    emAtencao: intermediario + riscoParaSaude,
  };
}
