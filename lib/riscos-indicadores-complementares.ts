/**
 * Indicadores complementares — Comportamentos Ofensivos (37–40).
 * Deriva status na renderização a partir do snapshot agregado existente.
 * Não expõe quantidades — uso em relatório, PDF e portal do cliente.
 */

import { COPSOQ_PERGUNTAS } from "@/lib/copsoq/perguntas";
import type { RiscosResultadosPublicos } from "@/lib/riscos-resultados";
import type { RiscosRelatorioResultadoJson } from "@/lib/riscos-relatorio";

export type StatusIndicadorComplementar =
  | "sem_indicacao"
  | "requer_atencao"
  | "sem_dados";

export type StatusGeralIndicadoresComplementares =
  | "sem_indicacao"
  | "requer_atencao"
  | "sem_dados"
  | "indisponivel";

export type IndicadorComplementarApresentacao = {
  id: string;
  codigo: string;
  tema: string;
  /** Texto curto para conclusão (ex.: bullying). */
  temaConclusao: string;
  status: StatusIndicadorComplementar;
  labelStatus: string;
};

export type IndicadoresComplementaresApresentacao = {
  disponivel: boolean;
  indicadores: IndicadorComplementarApresentacao[];
  statusGeral: StatusGeralIndicadoresComplementares;
  labelStatusGeral: string;
  algumRequerAtencao: boolean;
  temasRequerAtencao: string[];
  todosSemDados: boolean;
  todosSemIndicacao: boolean;
  textoOrientacaoSecao: string | null;
};

const EXP_NAO = "exp-nao";

const METADADOS_INDICADOR = [
  {
    perguntaId: "p-20",
    codigo: "20",
    tema: "Atenção sexual indesejada",
    temaConclusao: "atenção sexual indesejada",
  },
  {
    perguntaId: "p-21",
    codigo: "21",
    tema: "Ameaças de violência",
    temaConclusao: "ameaças de violência",
  },
  {
    perguntaId: "p-22",
    codigo: "22",
    tema: "Violência física",
    temaConclusao: "violência física",
  },
  {
    perguntaId: "p-23",
    codigo: "23",
    tema: "Bullying",
    temaConclusao: "bullying",
  },
] as const;

export const LABEL_STATUS_INDICADOR: Record<StatusIndicadorComplementar, string> =
  {
    sem_indicacao: "Sem indicação",
    requer_atencao: "Requer atenção",
    sem_dados: "Sem dados",
  };

export const LABEL_STATUS_GERAL_INDICADORES: Record<
  Exclude<StatusGeralIndicadoresComplementares, "indisponivel">,
  string
> = {
  sem_indicacao: "Sem indicação",
  requer_atencao: "Requer atenção",
  sem_dados: "Sem dados",
};

type BlocoOfensivosSnapshot =
  | RiscosRelatorioResultadoJson["comportamentosOfensivos"]
  | RiscosResultadosPublicos["comportamentosOfensivos"]
  | null
  | undefined;

function isAusenciaExposicao(alternativaId: string, label: string): boolean {
  const id = String(alternativaId ?? "").trim();
  const lb = String(label ?? "").trim();
  return id === EXP_NAO || lb === "Não";
}

function statusPorTotais(
  totais: ReadonlyArray<{
    alternativaId: string;
    label: string;
    quantidade: number;
  }>
): StatusIndicadorComplementar {
  let totalRespostas = 0;
  let algumaExposicao = false;

  for (const t of totais) {
    const q = Math.max(0, Math.floor(Number(t.quantidade) || 0));
    if (q <= 0) continue;
    totalRespostas += q;
    if (!isAusenciaExposicao(t.alternativaId, t.label)) {
      algumaExposicao = true;
    }
  }

  if (totalRespostas === 0) return "sem_dados";
  if (algumaExposicao) return "requer_atencao";
  return "sem_indicacao";
}

function resolverStatusGeral(
  indicadores: IndicadorComplementarApresentacao[]
): StatusGeralIndicadoresComplementares {
  if (indicadores.length === 0) return "indisponivel";
  if (indicadores.some((i) => i.status === "requer_atencao")) {
    return "requer_atencao";
  }
  if (indicadores.every((i) => i.status === "sem_dados")) {
    return "sem_dados";
  }
  return "sem_indicacao";
}

function textoOrientacao(input: {
  statusGeral: StatusGeralIndicadoresComplementares;
  todosSemIndicacao: boolean;
  todosSemDados: boolean;
}): string | null {
  if (input.statusGeral === "indisponivel") return null;

  if (input.statusGeral === "requer_atencao") {
    return "Foram identificadas respostas que indicam possível exposição a comportamento(s) ofensivo(s) no ambiente de trabalho. Recomenda-se atenção aos temas sinalizados e avaliação das medidas preventivas e de acompanhamento aplicáveis, preservando a confidencialidade e o anonimato dos participantes.";
  }

  if (input.todosSemDados) {
    return "Não há respostas válidas registradas para os indicadores complementares de comportamentos ofensivos nesta avaliação.";
  }

  if (input.todosSemIndicacao) {
    return "Nesta avaliação, não foram identificadas respostas indicativas de exposição nos indicadores complementares de comportamentos ofensivos.";
  }

  return null;
}

/** Lista temas para conclusão — ex.: "bullying e ameaças de violência". */
export function listarTemasIndicadoresConclusao(temas: readonly string[]): string {
  const limpos = temas.map((t) => t.trim()).filter(Boolean);
  if (limpos.length === 0) return "";
  if (limpos.length === 1) return limpos[0]!;
  if (limpos.length === 2) return `${limpos[0]} e ${limpos[1]}`;
  return `${limpos.slice(0, -1).join(", ")} e ${limpos[limpos.length - 1]}`;
}

/**
 * Monta DTO de apresentação a partir do bloco agregado do snapshot.
 * Não altera nem persiste o snapshot.
 */
export function montarIndicadoresComplementares(
  bloco: BlocoOfensivosSnapshot
): IndicadoresComplementaresApresentacao {
  if (!bloco || !Array.isArray(bloco.itens)) {
    return {
      disponivel: false,
      indicadores: [],
      statusGeral: "indisponivel",
      labelStatusGeral: "Indisponível",
      algumRequerAtencao: false,
      temasRequerAtencao: [],
      todosSemDados: true,
      todosSemIndicacao: false,
      textoOrientacaoSecao: null,
    };
  }

  const porCodigo = new Map(
    bloco.itens.map((item) => [String(item.perguntaCodigo ?? "").trim(), item])
  );

  const indicadores: IndicadorComplementarApresentacao[] =
    METADADOS_INDICADOR.map((meta) => {
      const item = porCodigo.get(meta.codigo);
      const totais = item?.totais ?? [];
      const status = statusPorTotais(totais);
      return {
        id: meta.perguntaId,
        codigo: meta.codigo,
        tema: meta.tema,
        temaConclusao: meta.temaConclusao,
        status,
        labelStatus: LABEL_STATUS_INDICADOR[status],
      };
    });

  const statusGeral = resolverStatusGeral(indicadores);
  const todosSemDados = indicadores.every((i) => i.status === "sem_dados");
  const todosSemIndicacao = indicadores.every(
    (i) => i.status === "sem_indicacao"
  );
  const temasRequerAtencao = indicadores
    .filter((i) => i.status === "requer_atencao")
    .map((i) => i.temaConclusao);

  const labelStatusGeral =
    statusGeral === "indisponivel"
      ? "Indisponível"
      : LABEL_STATUS_GERAL_INDICADORES[statusGeral];

  return {
    disponivel: true,
    indicadores,
    statusGeral,
    labelStatusGeral,
    algumRequerAtencao: statusGeral === "requer_atencao",
    temasRequerAtencao,
    todosSemDados,
    todosSemIndicacao,
    textoOrientacaoSecao: textoOrientacao({
      statusGeral,
      todosSemIndicacao,
      todosSemDados,
    }),
  };
}

export function indicadoresComplementaresDeRelatorio(input: {
  resultado_json?: RiscosRelatorioResultadoJson | null;
}): IndicadoresComplementaresApresentacao {
  return montarIndicadoresComplementares(
    input.resultado_json?.comportamentosOfensivos
  );
}

/** Valida alinhamento com perguntas oficiais (testes). */
export function idsPerguntasOfensivasOficiais(): string[] {
  return COPSOQ_PERGUNTAS.filter(
    (p) => p.dimensaoId === "comportamentos-ofensivos"
  ).map((p) => p.id);
}
