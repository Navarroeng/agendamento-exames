/**
 * Relatório final de Riscos Psicossociais (persistido).
 * Cálculos COPSOQ: reutiliza consolidarResultadosCampanha / motor oficial.
 */

import {
  amplitudeEscalaDimensao,
  type CopsoqClassificacaoResultadoId,
} from "@/lib/copsoq-engine";
import type { RiscosResultadosPublicos } from "@/lib/riscos-resultados";

export const RISCOS_RELATORIO_STATUS = ["gerado", "substituido"] as const;
export type RiscosRelatorioStatus = (typeof RISCOS_RELATORIO_STATUS)[number];

/** v2: snapshot inclui mediaBruta + máximos de escala para transparência da classificação. */
export const RISCOS_RELATORIO_JSON_VERSAO = 2 as const;

export type RiscosRelatorioDimensaoSnapshot = {
  id: string;
  nome: string;
  tipo: string;
  entraNoCalculo: boolean;
  /**
   * Média na escala final do produto (0–4 ou 0–5) — classificação e exibição.
   */
  media: number | null;
  /**
   * Média bruta nas pontuações impressas (após inversão, antes da conversão).
   */
  mediaBruta?: number | null;
  /** Máximo da escala impressa desta dimensão (ex.: 3 ou 4). */
  maxEscalaBruta?: number | null;
  /** Máximo da escala final do produto (4 ou 5). */
  maxEscalaPadronizada?: number | null;
  classificacaoId: CopsoqClassificacaoResultadoId;
  classificacaoLabel: string;
  classificacaoInterpretacao: string;
  cor: string;
  respondentesValidos: number;
  descricao: string;
};

export type RiscosRelatorioResultadoJson = {
  versao: typeof RISCOS_RELATORIO_JSON_VERSAO;
  capa: {
    empresaNome: string;
    codigoPublico: string;
    dataInicio: string;
    dataEncerramento: string;
    participantes: number;
    respondentes: number;
    pendentes: number;
    taxaParticipacao: number | null;
  };
  resumoExecutivo: {
    participacaoPercentual: number | null;
    statusGeralMensagem: string;
    quantidadeDimensoes: number;
    dimensoesCriticas: Array<{ id: string; nome: string; classificacaoLabel: string }>;
  };
  dimensoes: RiscosRelatorioDimensaoSnapshot[];
  comportamentosOfensivos: RiscosResultadosPublicos["comportamentosOfensivos"];
  conclusao: string | null;
  recomendacoes: string | null;
};

export type RiscosRelatorioRecord = {
  id: string;
  campanha_id: string;
  cliente_id: string | null;
  codigo_publico: string;
  empresa_nome: string;
  gerado_em: string;
  gerado_por: string | null;
  gerado_por_user_id: string | null;
  participantes: number;
  respondentes: number;
  pendentes: number;
  taxa_participacao: number | null;
  resultado_json: RiscosRelatorioResultadoJson;
  status: RiscosRelatorioStatus;
  pdf_url: string | null;
  created_at?: string;
  updated_at?: string;
};

/** Cor visual por classificação (UI do relatório). Verde / amarelo / vermelho. */
export function corClassificacaoRelatorio(
  id: CopsoqClassificacaoResultadoId | string
): string {
  if (id === "situacao_favoravel") return "#16a34a";
  if (id === "risco_intermediario") return "#ca8a04";
  if (id === "risco_para_saude") return "#dc2626";
  return "#64748b";
}

export const MSG_RELATORIO_PARTICIPANTES_PENDENTES =
  "Ainda existem participantes que não concluíram a pesquisa.";

export const MSG_RELATORIO_JA_EXISTE =
  "Já existe um relatório para esta campanha. Use Visualizar ou Regenerar (admin).";

export const MSG_RELATORIO_SEM_PARTICIPANTES =
  "Cadastre e conclua os participantes antes de gerar o relatório.";

export const MSG_RELATORIO_CAMPANHA_CANCELADA =
  "Não é possível gerar relatório de campanha cancelada.";

/**
 * Pode gerar relatório final quando todos os ativos estão Concluído
 * (`respondido`) e ainda não existe relatório.
 */
export function validatePodeGerarRelatorioFinal(input: {
  campanhaStatus: string | null | undefined;
  participantesAtivos: ReadonlyArray<{ status: string }>;
  jaExisteRelatorio: boolean;
}): string | null {
  const status = String(input.campanhaStatus ?? "");
  if (status === "cancelada") return MSG_RELATORIO_CAMPANHA_CANCELADA;
  if (input.jaExisteRelatorio) return MSG_RELATORIO_JA_EXISTE;

  const ativos = input.participantesAtivos.filter(
    (p) => p.status !== "removido" && p.status !== "invalidado"
  );
  if (ativos.length === 0) return MSG_RELATORIO_SEM_PARTICIPANTES;

  const incompletos = ativos.some(
    (p) => p.status === "pendente" || p.status === "iniciado"
  );
  if (incompletos) return MSG_RELATORIO_PARTICIPANTES_PENDENTES;

  const todosConcluidos = ativos.every((p) => p.status === "respondido");
  if (!todosConcluidos) return MSG_RELATORIO_PARTICIPANTES_PENDENTES;

  return null;
}

export function montarResultadoJsonRelatorio(input: {
  empresaNome: string;
  codigoPublico: string;
  dataInicio: string;
  dataEncerramento: string;
  consolidado: RiscosResultadosPublicos;
}): RiscosRelatorioResultadoJson {
  const c = input.consolidado;
  const dimensoes: RiscosRelatorioDimensaoSnapshot[] = c.dimensoes.map((d) => {
    const amp = amplitudeEscalaDimensao(d.id);
    return {
      id: d.id,
      nome: d.nome,
      tipo: d.tipo,
      entraNoCalculo: d.entraNoCalculo,
      // Média na escala final do produto (0–4 ou 0–5).
      media: d.media,
      mediaBruta: d.mediaBruta,
      maxEscalaBruta: amp.max,
      maxEscalaPadronizada: d.maxEscalaFinal ?? 4,
      classificacaoId: d.classificacao.id,
      classificacaoLabel: d.classificacao.label,
      classificacaoInterpretacao: d.classificacao.interpretacao,
      cor: corClassificacaoRelatorio(d.classificacao.id),
      respondentesValidos: d.respondentesValidos,
      descricao: d.classificacao.interpretacao,
    };
  });

  const criticas = dimensoes
    .filter(
      (d) =>
        d.entraNoCalculo &&
        (d.classificacaoId === "risco_para_saude" ||
          d.classificacaoId === "risco_intermediario")
    )
    .map((d) => ({
      id: d.id,
      nome: d.nome,
      classificacaoLabel: d.classificacaoLabel,
    }));

  return {
    versao: RISCOS_RELATORIO_JSON_VERSAO,
    capa: {
      empresaNome: input.empresaNome,
      codigoPublico: input.codigoPublico,
      dataInicio: input.dataInicio,
      dataEncerramento: input.dataEncerramento,
      participantes: c.previstos,
      respondentes: c.sessoesConcluidas,
      pendentes: c.pendentes,
      taxaParticipacao: c.participacaoPercentual,
    },
    resumoExecutivo: {
      participacaoPercentual: c.participacaoPercentual,
      statusGeralMensagem: c.riscoGeralMensagem,
      quantidadeDimensoes: dimensoes.filter((d) => d.entraNoCalculo).length,
      dimensoesCriticas: criticas,
    },
    dimensoes,
    comportamentosOfensivos: c.comportamentosOfensivos,
    conclusao: null,
    recomendacoes: null,
  };
}

export function formatTaxaParticipacao(
  taxa: number | null | undefined
): string {
  if (taxa == null || Number.isNaN(taxa)) return "—";
  return `${taxa.toFixed(1).replace(".", ",")}%`;
}

export function formatDataHoraRelatorio(iso: string | null | undefined): {
  data: string;
  hora: string;
} {
  if (!iso) return { data: "—", hora: "—" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { data: "—", hora: "—" };
  const data = d.toLocaleDateString("pt-BR");
  const hora = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { data, hora };
}
