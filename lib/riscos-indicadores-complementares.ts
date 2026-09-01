/**
 * Indicadores complementares — Comportamentos Ofensivos (37–40).
 * Deriva status e textos na renderização a partir do snapshot agregado existente.
 * Política de confidencialidade para superfícies do cliente (relatório, PDF, portal).
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

/**
 * Política de confidencialidade da Navarro para exibição de quantitativos
 * dos indicadores complementares ao cliente.
 *
 * Limite adotado pela aplicação para supressão de pequenas amostras e redução
 * do risco de reidentificação. Não é requisito expresso da LGPD nem do COPSOQ.
 */
export const MIN_RESPONDENTES_PARA_EXIBIR_QUANTITATIVO_OFENSIVOS = 10;

export type IndicadorComplementarApresentacao = {
  id: string;
  codigo: string;
  tema: string;
  /** Texto curto para conclusão (ex.: bullying). */
  temaConclusao: string;
  status: StatusIndicadorComplementar;
  labelStatus: string;
  /** Participantes com indicação neste tema (derivado dos totais agregados). */
  quantidadeIndicacao: number | null;
  podeExibirQuantidade: boolean;
  textoPrincipal: string;
  textoRecomendacao: string | null;
  textoAvisoConfidencialidade: string | null;
};

export type SinteseIndicadoresComplementares = {
  titulo: string;
  textoIntro: string;
  rotuloTemas: string;
  temas: string[];
};

export type IndicadoresComplementaresApresentacao = {
  disponivel: boolean;
  respondentesValidos: number;
  indicadores: IndicadorComplementarApresentacao[];
  statusGeral: StatusGeralIndicadoresComplementares;
  labelStatusGeral: string;
  algumRequerAtencao: boolean;
  temasRequerAtencao: string[];
  todosSemDados: boolean;
  todosSemIndicacao: boolean;
  sintese: SinteseIndicadoresComplementares | null;
};

const EXP_NAO = "exp-nao";

const AVISO_CONFIDENCIALIDADE_QUANTITATIVO =
  "Os dados quantitativos deste indicador não são apresentados em razão dos critérios de confidencialidade adotados para esta avaliação.";

const METADADOS_INDICADOR = [
  {
    perguntaId: "p-20",
    codigo: "20",
    tema: "Atenção sexual indesejada",
    temaConclusao: "atenção sexual indesejada",
    textoSemIndicacao:
      "Não foram identificadas, nesta avaliação, respostas indicativas de exposição a situações de atenção sexual indesejada no ambiente de trabalho.",
    textoRequerAtencaoBase:
      "Esta avaliação identificou respostas indicativas de possível exposição a situações de atenção sexual indesejada no ambiente de trabalho.",
    textoRecomendacao:
      "Recomenda-se avaliar as medidas preventivas existentes, as orientações institucionais relacionadas a condutas adequadas no ambiente de trabalho e a disponibilidade de canais confidenciais de orientação e acolhimento.",
  },
  {
    perguntaId: "p-21",
    codigo: "21",
    tema: "Ameaças de violência",
    temaConclusao: "ameaças de violência",
    textoSemIndicacao:
      "Não foram identificadas, nesta avaliação, respostas indicativas de exposição a ameaças de violência no ambiente de trabalho.",
    textoRequerAtencaoBase:
      "Foram identificadas respostas indicativas de possível exposição a ameaças de violência no ambiente de trabalho.",
    textoRecomendacao:
      "Recomenda-se avaliar as condições relacionadas ao achado e revisar, conforme aplicável, os procedimentos preventivos, os mecanismos de comunicação e as medidas organizacionais de suporte e resposta.",
  },
  {
    perguntaId: "p-22",
    codigo: "22",
    tema: "Violência física",
    temaConclusao: "violência física",
    textoSemIndicacao:
      "Não foram identificadas, nesta avaliação, respostas indicativas de exposição a situações de violência física no ambiente de trabalho.",
    textoRequerAtencaoBase:
      "Foram identificadas respostas indicativas de possível exposição a situações de violência física no ambiente de trabalho.",
    textoRecomendacao:
      "Recomenda-se avaliar as condições relacionadas ao achado, bem como as medidas preventivas, os procedimentos organizacionais aplicáveis e os mecanismos de comunicação e resposta existentes.",
  },
  {
    perguntaId: "p-23",
    codigo: "23",
    tema: "Bullying",
    temaConclusao: "bullying",
    textoSemIndicacao:
      "Não foram identificadas, nesta avaliação, respostas indicativas de exposição a situações de bullying no ambiente de trabalho.",
    textoRequerAtencaoBase:
      "Foram identificadas respostas indicativas de possível exposição a bullying no ambiente de trabalho nos últimos 12 meses.",
    textoRecomendacao:
      "O resultado sinaliza a necessidade de atenção ao tema, com avaliação das condições organizacionais relacionadas, das medidas preventivas existentes e dos canais de orientação e acolhimento disponíveis.",
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

type TotaisIndicador = ReadonlyArray<{
  alternativaId: string;
  label: string;
  quantidade: number;
}>;

function isAusenciaExposicao(alternativaId: string, label: string): boolean {
  const id = String(alternativaId ?? "").trim();
  const lb = String(label ?? "").trim();
  return id === EXP_NAO || lb === "Não";
}

function statusPorTotais(totais: TotaisIndicador): StatusIndicadorComplementar {
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

/**
 * Cada participante responde no máximo uma vez por pergunta.
 * A soma das alternativas ≠ "Não" equivale à quantidade de participantes com indicação.
 */
export function quantidadeParticipantesComIndicacao(
  totais: TotaisIndicador
): number | null {
  if (!totais.length) return null;

  let totalRespostas = 0;
  let comIndicacao = 0;

  for (const t of totais) {
    const q = Math.max(0, Math.floor(Number(t.quantidade) || 0));
    if (q <= 0) continue;
    totalRespostas += q;
    if (!isAusenciaExposicao(t.alternativaId, t.label)) {
      comIndicacao += q;
    }
  }

  if (totalRespostas === 0) return null;
  return comIndicacao;
}

export function fraseQuantidadeParticipantesIndicacao(quantidade: number): string {
  const n = Math.max(0, Math.floor(quantidade));
  if (n === 1) return "1 participante apresentou indicação de exposição.";
  return `${n} participantes apresentaram indicação de exposição.`;
}

export function politicaPermiteExibirQuantitativoOfensivos(
  respondentesValidos: number
): boolean {
  return (
    Math.max(0, Math.floor(respondentesValidos)) >=
    MIN_RESPONDENTES_PARA_EXIBIR_QUANTITATIVO_OFENSIVOS
  );
}

function podeExibirQuantidadeIndicador(input: {
  respondentesValidos: number;
  quantidadeIndicacao: number | null;
  status: StatusIndicadorComplementar;
}): boolean {
  if (input.status !== "requer_atencao") return false;
  if (input.quantidadeIndicacao == null || input.quantidadeIndicacao <= 0) {
    return false;
  }
  return politicaPermiteExibirQuantitativoOfensivos(input.respondentesValidos);
}

function resolverRespondentesValidos(input: {
  respondentesValidos?: number | null;
  capaRespondentes?: number | null;
}): number {
  if (input.respondentesValidos != null && input.respondentesValidos >= 0) {
    return Math.floor(input.respondentesValidos);
  }
  if (input.capaRespondentes != null && input.capaRespondentes >= 0) {
    return Math.floor(input.capaRespondentes);
  }
  return 0;
}

function montarTextosIndicador(input: {
  meta: (typeof METADADOS_INDICADOR)[number];
  status: StatusIndicadorComplementar;
  quantidadeIndicacao: number | null;
  podeExibirQuantidade: boolean;
}): {
  textoPrincipal: string;
  textoRecomendacao: string | null;
  textoAvisoConfidencialidade: string | null;
} {
  const { meta, status, quantidadeIndicacao, podeExibirQuantidade } = input;

  if (status === "sem_dados") {
    return {
      textoPrincipal:
        "Não houve respostas válidas suficientes para análise deste indicador nesta avaliação.",
      textoRecomendacao: null,
      textoAvisoConfidencialidade: null,
    };
  }

  if (status === "sem_indicacao") {
    return {
      textoPrincipal: meta.textoSemIndicacao,
      textoRecomendacao: null,
      textoAvisoConfidencialidade: null,
    };
  }

  const partes: string[] = [meta.textoRequerAtencaoBase];
  if (podeExibirQuantidade && quantidadeIndicacao != null && quantidadeIndicacao > 0) {
    partes.push(fraseQuantidadeParticipantesIndicacao(quantidadeIndicacao));
  }

  const suprimiuQuantidade =
    !podeExibirQuantidade &&
    quantidadeIndicacao != null &&
    quantidadeIndicacao > 0;

  return {
    textoPrincipal: partes.join(" "),
    textoRecomendacao: meta.textoRecomendacao,
    textoAvisoConfidencialidade: suprimiuQuantidade
      ? AVISO_CONFIDENCIALIDADE_QUANTITATIVO
      : null,
  };
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

function montarSintese(
  indicadores: IndicadorComplementarApresentacao[]
): SinteseIndicadoresComplementares | null {
  const temas = indicadores
    .filter((i) => i.status === "requer_atencao")
    .map((i) => i.tema);
  if (temas.length === 0) return null;

  return {
    titulo: "Síntese dos indicadores complementares",
    textoIntro:
      "A análise identificou sinalização relacionada a comportamento(s) ofensivo(s) no ambiente de trabalho. Os achados são avaliados separadamente das 10 categorias COPSOQ e devem ser considerados sob perspectiva preventiva, preservando a confidencialidade dos participantes.",
    rotuloTemas: "Temas que requerem atenção:",
    temas,
  };
}

/** Lista temas para conclusão — ex.: "bullying e ameaças de violência". */
export function listarTemasIndicadoresConclusao(temas: readonly string[]): string {
  const limpos = temas.map((t) => t.trim()).filter(Boolean);
  if (limpos.length === 0) return "";
  if (limpos.length === 1) return limpos[0]!;
  if (limpos.length === 2) return `${limpos[0]} e ${limpos[1]}`;
  return `${limpos.slice(0, -1).join(", ")} e ${limpos[limpos.length - 1]}`;
}

/** Parágrafo da conclusão técnica — sem quantidades. */
export function fraseConclusaoTemasIndicadores(temas: readonly string[]): string {
  const lista = listarTemasIndicadoresConclusao(temas);
  if (!lista) return "";
  const concordancia = temas.length === 1 ? "relacionada" : "relacionadas";
  return `Nos indicadores complementares, foram identificadas respostas indicativas de possível exposição ${concordancia} a ${lista}. Os achados requerem atenção específica da organização e são analisados separadamente das 10 categorias COPSOQ.`;
}

const APRESENTACAO_VAZIA: IndicadoresComplementaresApresentacao = {
  disponivel: false,
  respondentesValidos: 0,
  indicadores: [],
  statusGeral: "indisponivel",
  labelStatusGeral: "Indisponível",
  algumRequerAtencao: false,
  temasRequerAtencao: [],
  todosSemDados: true,
  todosSemIndicacao: false,
  sintese: null,
};

/**
 * Monta DTO de apresentação a partir do bloco agregado do snapshot.
 * Não altera nem persiste o snapshot.
 */
export function montarIndicadoresComplementares(
  bloco: BlocoOfensivosSnapshot,
  respondentesValidos?: number | null
): IndicadoresComplementaresApresentacao {
  if (!bloco || !Array.isArray(bloco.itens)) {
    return { ...APRESENTACAO_VAZIA };
  }

  const respondentes = resolverRespondentesValidos({ respondentesValidos });

  const porCodigo = new Map(
    bloco.itens.map((item) => [String(item.perguntaCodigo ?? "").trim(), item])
  );

  const indicadores: IndicadorComplementarApresentacao[] =
    METADADOS_INDICADOR.map((meta) => {
      const item = porCodigo.get(meta.codigo);
      const totais = item?.totais ?? [];
      const status = statusPorTotais(totais);
      const quantidadeIndicacao = quantidadeParticipantesComIndicacao(totais);
      const podeExibirQuantidade = podeExibirQuantidadeIndicador({
        respondentesValidos: respondentes,
        quantidadeIndicacao,
        status,
      });
      const textos = montarTextosIndicador({
        meta,
        status,
        quantidadeIndicacao,
        podeExibirQuantidade,
      });

      return {
        id: meta.perguntaId,
        codigo: meta.codigo,
        tema: meta.tema,
        temaConclusao: meta.temaConclusao,
        status,
        labelStatus: LABEL_STATUS_INDICADOR[status],
        quantidadeIndicacao,
        podeExibirQuantidade,
        textoPrincipal: textos.textoPrincipal,
        textoRecomendacao: textos.textoRecomendacao,
        textoAvisoConfidencialidade: textos.textoAvisoConfidencialidade,
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
    respondentesValidos: respondentes,
    indicadores,
    statusGeral,
    labelStatusGeral,
    algumRequerAtencao: statusGeral === "requer_atencao",
    temasRequerAtencao,
    todosSemDados,
    todosSemIndicacao,
    sintese: montarSintese(indicadores),
  };
}

export function indicadoresComplementaresDeRelatorio(input: {
  resultado_json?: RiscosRelatorioResultadoJson | null;
  respondentesValidos?: number | null;
}): IndicadoresComplementaresApresentacao {
  const capaRespondentes = input.resultado_json?.capa?.respondentes;
  return montarIndicadoresComplementares(
    input.resultado_json?.comportamentosOfensivos,
    input.respondentesValidos ?? capaRespondentes
  );
}

/** Valida alinhamento com perguntas oficiais (testes). */
export function idsPerguntasOfensivasOficiais(): string[] {
  return COPSOQ_PERGUNTAS.filter(
    (p) => p.dimensaoId === "comportamentos-ofensivos"
  ).map((p) => p.id);
}

/** Garante que textos do cliente não exponham distribuição de frequências. */
export function textoClienteSeguroOfensivos(texto: string): boolean {
  const proibidos = [
    /Sim,\s*poucas vezes/i,
    /Sim,\s*mensalmente/i,
    /Sim,\s*semanalmente/i,
    /Sim,\s*diariamente/i,
    /\bNão:\s*\d/i,
    /\d+\s*de\s*\d+/,
    /\d+[,.]?\d*\s*%/,
    /colegas/i,
    /gerente|supervisor/i,
    /subordinad/i,
    /fregueses|pacientes/i,
  ];
  return !proibidos.some((re) => re.test(texto));
}
