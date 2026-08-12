/**
 * Conteúdo executivo do Relatório Final — gerado a partir do snapshot persistido.
 * Não altera cálculos, classificação COPSOQ, banco ou geração.
 *
 * Referência técnica (não visual): boas práticas de relatórios SST/consultoria
 * + Orientações oficiais COPSOQ II-Br (faixas, ações e interpretação RISCO×PROTEÇÃO).
 */

import { COPSOQ_DIMENSOES } from "@/lib/copsoq/dimensoes";
import type { CopsoqClassificacaoResultadoId } from "@/lib/copsoq-engine";
import {
  formatTaxaParticipacao,
  type RiscosRelatorioDimensaoSnapshot,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import {
  dimensoesParaCalculo,
  formatMediaRelatorio,
  formatPontuacaoComMaximo,
  rankingMelhores,
  severidadeClassificacao,
} from "@/lib/riscos-relatorio-view";

export type AnaliseDimensaoConteudo = {
  oQueAvalia: string;
  resultadoEncontrado: string;
  possiveisImpactos: string;
  recomendacoes: string[];
};

export type ItemPlanoAcao = {
  prioridade: "Alta" | "Média" | "Baixa";
  acao: string;
  objetivo: string;
  responsavelSugerido: string;
  prazoSugerido: string;
  status: "Pendente";
  dimensaoId: string;
  dimensaoNome: string;
};

export type ConteudoExecutivoRelatorio = {
  resumoNarrativo: string[];
  conclusaoTecnica: string[];
  recomendacoesGerais: string[];
  planoAcao: ItemPlanoAcao[];
};

/** Textos técnicos por dimensão (baseados nas descrições oficiais COPSOQ). */
const O_QUE_AVALIA: Record<string, string> = {
  "demandas-trabalho":
    "Esta dimensão avalia o nível de exigência quantitativa, cognitiva e emocional imposto ao trabalhador na execução das atividades — ritmo, volume de trabalho e carga emocional associada.",
  "influencia-desenvolvimento":
    "Esta dimensão avalia o grau de autonomia do trabalhador nas decisões do próprio trabalho e as oportunidades reais de aprendizado e desenvolvimento profissional.",
  "significado-comprometimento":
    "Esta dimensão avalia o sentido atribuído ao trabalho e o vínculo afetivo-profissional com a organização, elementos associados à motivação e à permanência.",
  "relacoes-interpessoais":
    "Esta dimensão avalia a qualidade das relações no trabalho: informação, reconhecimento, tratamento justo e clareza de papéis e objetivos.",
  "lideranca":
    "Esta dimensão avalia a qualidade da liderança imediata — apoio, planejamento, reconhecimento e condução das equipes no dia a dia.",
  "interface-trabalho-individuo":
    "Esta dimensão avalia a satisfação geral do trabalhador com o trabalho como um todo, refletindo o equilíbrio percebido entre exigências e recompensas.",
  "conflitos-familia-trabalho":
    "Esta dimensão avalia o quanto as demandas do trabalho interferem na vida particular e familiar, indicando risco de conflito entre esferas profissional e pessoal.",
  "valores-local-trabalho":
    "Esta dimensão avalia a percepção de confiança, justiça e coerência dos valores organizacionais no ambiente de trabalho.",
  "saude-geral":
    "Esta dimensão avalia a percepção geral de saúde e bem-estar do trabalhador nas últimas semanas, independentemente da causa atribuída aos sintomas.",
  "burnout-estresse":
    "Esta dimensão avalia sinais de esgotamento físico e emocional, estresse e irritação — indicadores clássicos de desgaste psicossocial ocupacional.",
  "comportamentos-ofensivos":
    "Esta dimensão avalia a exposição a comportamentos ofensivos no ambiente de trabalho. No COPSOQ II-Br, é analisada de forma qualitativa e não entra na média quantitativa geral.",
};

function metaDimensao(id: string) {
  return COPSOQ_DIMENSOES.find((d) => d.id === id);
}

function isRisco(tipo: string): boolean {
  return String(tipo).toUpperCase() === "RISCO";
}

function labelSeveridade(
  id: CopsoqClassificacaoResultadoId | string
): "favoravel" | "intermediario" | "critico" | "indefinido" {
  if (id === "situacao_favoravel") return "favoravel";
  if (id === "risco_intermediario") return "intermediario";
  if (id === "risco_para_saude") return "critico";
  return "indefinido";
}

export function textoOQueAvalia(
  d: Pick<RiscosRelatorioDimensaoSnapshot, "id" | "nome" | "tipo">
): string {
  const oficial = O_QUE_AVALIA[d.id];
  if (oficial) return oficial;
  const meta = metaDimensao(d.id);
  if (meta?.descricao) {
    return `Esta dimensão (${isRisco(d.tipo) ? "fator de risco" : "fator de proteção"}) avalia: ${meta.descricao}`;
  }
  return `Esta dimensão avalia aspectos psicossociais relacionados a “${d.nome}”, conforme o instrumento COPSOQ II-Br.`;
}

export function textoResultadoEncontrado(
  d: Pick<
    RiscosRelatorioDimensaoSnapshot,
    | "nome"
    | "tipo"
    | "media"
    | "mediaBruta"
    | "maxEscalaBruta"
    | "maxEscalaPadronizada"
    | "classificacaoId"
    | "classificacaoLabel"
    | "respondentesValidos"
  >
): string {
  const risco = isRisco(d.tipo);
  const sev = labelSeveridade(d.classificacaoId);
  const temNorm =
    d.mediaBruta != null && !Number.isNaN(d.mediaBruta);

  let base: string;
  if (temNorm) {
    const original = formatPontuacaoComMaximo(
      d.mediaBruta,
      d.maxEscalaBruta
    );
    const padronizada = formatPontuacaoComMaximo(
      d.media,
      d.maxEscalaPadronizada ?? 4
    );
    base = `Com base em ${d.respondentesValidos} respondente(s) válido(s), a dimensão “${d.nome}” apresentou pontuação original ${original} e pontuação padronizada ${padronizada} (escala comum usada na classificação), resultando em ${d.classificacaoLabel}.`;
  } else {
    const media = formatMediaRelatorio(d.media);
    base = `Com base em ${d.respondentesValidos} respondente(s) válido(s), a dimensão “${d.nome}” apresentou média ${media}, classificada como ${d.classificacaoLabel}.`;
  }

  if (sev === "favoravel") {
    return risco
      ? `${base} Os resultados indicam baixos níveis de exposição neste fator de risco, sugerindo adequada gestão das exigências associadas.`
      : `${base} Os resultados indicam presença consistente deste fator de proteção, favorecendo condições psicossociais positivas.`;
  }
  if (sev === "intermediario") {
    return risco
      ? `${base} A exposição encontra-se em Situação Moderada e pode sinalizar início de sobrecarga — recomenda-se monitoramento e ações de suporte.`
      : `${base} O fator de proteção aparece enfraquecido em Situação Moderada, indicando necessidade de reforço preventivo antes de agravamento.`;
  }
  if (sev === "critico") {
    return risco
      ? `${base} Trata-se de exposição elevada neste fator de risco, com potencial impacto à saúde ocupacional — prioridade de intervenção organizacional.`
      : `${base} O fator de proteção encontra-se significativamente reduzido (Situação Desfavorável), exigindo reforço prioritário do ponto de vista psicossocial.`;
  }
  return `${base} A classificação quantitativa não pôde ser definida plenamente para esta dimensão.`;
}

export function textoPossiveisImpactos(
  d: Pick<
    RiscosRelatorioDimensaoSnapshot,
    "nome" | "tipo" | "classificacaoId"
  >
): string {
  const sev = labelSeveridade(d.classificacaoId);
  const risco = isRisco(d.tipo);

  if (sev === "favoravel") {
    return (
      `Em “${d.nome}”, o resultado favorável tende a sustentar bem-estar dos colaboradores, estabilidade do clima organizacional e menor probabilidade de adoecimento relacionado ao trabalho. ` +
      `Do ponto de vista da produtividade, favorece engajamento e continuidade das boas práticas de SST.`
    );
  }
  if (sev === "intermediario") {
    return (
      `Em “${d.nome}”, o resultado em Situação Moderada pode elevar fadiga, tensão interpessoal e redução gradual de desempenho, afetando clima e saúde ocupacional se não houver acompanhamento. ` +
      `É uma janela oportuna para prevenção, evitando evolução para Situação Desfavorável.`
    );
  }
  if (sev === "critico") {
    return risco
      ? `Em “${d.nome}”, o resultado em Situação Desfavorável eleva o risco de estresse crônico, absenteísmo, presenteísmo, conflitos e deterioração do clima. Pode comprometer a produtividade e aumentar a probabilidade de agravos à saúde ocupacional, exigindo resposta organizacional estruturada.`
      : `Em “${d.nome}”, a fragilidade deste fator de proteção (Situação Desfavorável) pode reduzir suporte percebido, motivação e confiança institucional, com reflexos negativos sobre clima, retenção e saúde dos trabalhadores.`;
  }
  return `Os impactos específicos de “${d.nome}” dependem de aprofundamento qualitativo complementar à análise quantitativa.`;
}

/** Ações oficiais das Orientações + recomendações práticas por dimensão. */
export function recomendacoesDimensao(
  d: Pick<
    RiscosRelatorioDimensaoSnapshot,
    "id" | "nome" | "tipo" | "classificacaoId"
  >
): string[] {
  const sev = labelSeveridade(d.classificacaoId);
  const especificas = recomendacoesEspecificasPorId(d.id, sev);

  if (sev === "favoravel") {
    return [
      "Manter e documentar as boas práticas já identificadas nesta dimensão.",
      "Comunicar os resultados positivos às lideranças para reforço cultural.",
      ...especificas.slice(0, 2),
    ];
  }
  if (sev === "intermediario") {
    return [
      "Monitorar indicadores desta dimensão e promover ações de suporte preventivo.",
      "Incluir o tema em reuniões de SST/RH e acompanhar evolução em novo ciclo.",
      ...especificas,
    ];
  }
  if (sev === "critico") {
    return [
      "Priorizar intervenção imediata com revisão de processos e responsabilidades.",
      "Estabelecer plano de ação com prazo, responsável e indicador de acompanhamento.",
      "Avaliar necessidade de escuta estruturada (grupos focais) e suporte especializado.",
      ...especificas,
    ];
  }
  return [
    "Complementar a análise com investigação qualitativa antes de decisões estruturais.",
  ];
}

function recomendacoesEspecificasPorId(
  id: string,
  sev: ReturnType<typeof labelSeveridade>
): string[] {
  const base: Record<string, string[]> = {
    "demandas-trabalho": [
      "Revisar distribuição de carga, prazos e priorização de demandas.",
      "Avaliar ritmo de trabalho e mecanismos de apoio em picos de produção.",
    ],
    "influencia-desenvolvimento": [
      "Ampliar participação dos trabalhadores em decisões do próprio posto.",
      "Fortalecer planos de capacitação e trilhas de desenvolvimento.",
    ],
    "significado-comprometimento": [
      "Reforçar comunicação do propósito do trabalho e reconhecimento de entregas.",
      "Alinhar metas individuais ao sentido organizacional da atividade.",
    ],
    "relacoes-interpessoais": [
      "Fortalecer canais de feedback, reconhecimento e clareza de papéis.",
      "Promover práticas de comunicação não violenta e resolução de conflitos.",
    ],
    lideranca: [
      "Desenvolver competências de liderança (escuta, planejamento e suporte).",
      "Padronizar rituais de alinhamento entre líderes e equipes.",
    ],
    "interface-trabalho-individuo": [
      "Mapear fatores de insatisfação e oportunidades de melhoria no posto.",
      "Reavaliar equilíbrio entre exigências, recursos e reconhecimento.",
    ],
    "conflitos-familia-trabalho": [
      "Revisar jornadas, horas extras e políticas de flexibilidade quando aplicável.",
      "Orientar lideranças sobre respeito a limites vida-trabalho.",
    ],
    "valores-local-trabalho": [
      "Reforçar transparência, justiça procedimental e coerência entre discurso e prática.",
      "Acompanhar percepção de confiança organizacional em pesquisas internas.",
    ],
    "saude-geral": [
      "Integrar ações de promoção da saúde ao PCMSO/PGR e comunicação interna.",
      "Estimular autocuidado e acesso a canais de apoio à saúde do trabalhador.",
    ],
    "burnout-estresse": [
      "Implementar ações de prevenção ao esgotamento e gestão de estresse.",
      "Monitorar sinais de sobrecarga emocional com suporte da liderança e SST.",
    ],
  };

  const lista = base[id] ?? [
    "Definir ações preventivas específicas com SST, RH e liderança da área.",
  ];
  if (sev === "favoravel") return lista.slice(0, 1);
  return lista;
}

export function analisarDimensao(
  d: RiscosRelatorioDimensaoSnapshot
): AnaliseDimensaoConteudo {
  return {
    oQueAvalia: textoOQueAvalia(d),
    resultadoEncontrado: textoResultadoEncontrado(d),
    possiveisImpactos: textoPossiveisImpactos(d),
    recomendacoes: recomendacoesDimensao(d),
  };
}

function listarNomes(dims: RiscosRelatorioDimensaoSnapshot[]): string {
  if (dims.length === 0) return "nenhuma dimensão em destaque";
  if (dims.length === 1) return `“${dims[0].nome}”`;
  if (dims.length === 2) return `“${dims[0].nome}” e “${dims[1].nome}”`;
  const inicio = dims
    .slice(0, -1)
    .map((d) => `“${d.nome}”`)
    .join(", ");
  return `${inicio} e “${dims[dims.length - 1].nome}”`;
}

export function gerarConteudoExecutivo(
  relatorio: RiscosRelatorioRecord
): ConteudoExecutivoRelatorio {
  const json = relatorio.resultado_json;
  const capa = json?.capa;
  const dimensoes = dimensoesParaCalculo(json?.dimensoes ?? []);
  const empresa = capa?.empresaNome || relatorio.empresa_nome;
  const participantes = capa?.participantes ?? relatorio.participantes ?? 0;
  const respondentes = capa?.respondentes ?? relatorio.respondentes ?? 0;
  const taxa = formatTaxaParticipacao(
    capa?.taxaParticipacao ?? relatorio.taxa_participacao
  );
  const codigo = capa?.codigoPublico || relatorio.codigo_publico;

  const criticas = dimensoes.filter(
    (d) => severidadeClassificacao(d.classificacaoId) >= 1
  );
  const criticasAltas = dimensoes.filter(
    (d) => d.classificacaoId === "risco_para_saude"
  );
  const intermediarias = dimensoes.filter(
    (d) => d.classificacaoId === "risco_intermediario"
  );
  const favoraveis = dimensoes.filter(
    (d) => d.classificacaoId === "situacao_favoravel"
  );
  const melhores = rankingMelhores(dimensoes, 3);

  const resumoNarrativo = [
    `O presente relatório apresenta os resultados da Avaliação de Riscos Psicossociais da organização ${empresa} (campanha ${codigo}), realizada por meio do instrumento COPSOQ II-Br, referência reconhecida para análise de fatores psicossociais no ambiente de trabalho.`,
    `Foram considerados ${participantes} participante(s) elegível(is), com ${respondentes} respondente(s) válido(s) e taxa de participação de ${taxa}. A análise contempla ${dimensoes.length} categorias, permitindo distinguir fatores de risco e fatores de proteção conforme as orientações oficiais do instrumento.`,
    `Este relatório tem como finalidade subsidiar a empresa na identificação de fatores de atenção relacionados aos riscos psicossociais, contribuindo para o desenvolvimento de estratégias preventivas, ações de melhoria organizacional e fortalecimento das práticas voltadas à promoção da saúde e segurança ocupacional.`,
    `Além do atendimento às exigências normativas aplicáveis, a presente avaliação busca apoiar a construção de um ambiente de trabalho mais saudável, equilibrado e produtivo, promovendo melhores condições organizacionais e contribuindo para o bem-estar físico, emocional e psicossocial dos trabalhadores.`,
  ];

  const conclusaoTecnica = [
    `Do ponto de vista técnico, a campanha reuniu ${respondentes} resposta(s) válida(s) em um universo de ${participantes} participante(s) (${taxa} de participação), conferindo base empírica para leitura executiva dos riscos psicossociais em ${empresa}.`,
    `Das ${dimensoes.length} dimensões no cálculo quantitativo, ${favoraveis.length} apresentaram Situação Favorável, ${intermediarias.length} Situação Moderada e ${criticasAltas.length} Situação Desfavorável.`,
    criticasAltas.length > 0
      ? `O panorama geral indica necessidade de intervenção prioritária, com foco imediato em ${listarNomes(criticasAltas)}. A persistência desses fatores eleva a probabilidade de impactos sobre saúde, clima e desempenho, devendo integrar o plano de ação organizacional.`
      : intermediarias.length > 0
        ? `O panorama geral é de atenção/monitoramento: não há dimensões em Situação Desfavorável, porém o conjunto em Situação Moderada (${listarNomes(intermediarias)}) recomenda prevenção ativa e acompanhamento de indicadores.`
        : `O panorama geral é estável e favorável. A organização demonstra, neste ciclo, predominância de condições psicossociais positivas, o que não dispensa a manutenção de rotinas de vigilância e reavaliação periódica.`,
    melhores.length > 0
      ? `Como fatores positivos a preservar, destacam-se ${listarNomes(melhores)}. A consolidação desses resultados deve ser tratada como ativo de gestão, e não apenas como ausência de problema.`
      : `Recomenda-se registrar formalmente as evidências deste ciclo para comparação longitudinal em avaliações futuras.`,
  ];

  const recomendacoesGerais: string[] = [];
  if (criticasAltas.length > 0) {
    recomendacoesGerais.push(
      `Instituir comitê curto (SST, RH e lideranças) para tratar, em até 30 dias, as dimensões em Situação Desfavorável: ${listarNomes(criticasAltas)}.`
    );
    recomendacoesGerais.push(
      "Revisar processos, jornadas e mecanismos de suporte nas áreas mais expostas, com indicadores de acompanhamento mensal."
    );
    recomendacoesGerais.push(
      "Avaliar ações de escuta estruturada e suporte psicossocial, priorizando prevenção de agravos e cumprimento das diretrizes de gerenciamento de riscos."
    );
  } else if (intermediarias.length > 0) {
    recomendacoesGerais.push(
      `Monitorar trimestralmente as dimensões em Situação Moderada (${listarNomes(intermediarias)}) e executar ações de suporte preventivo.`
    );
    recomendacoesGerais.push(
      "Fortalecer comunicação interna, desenvolvimento de lideranças e clareza de papéis como alavancas transversais de proteção."
    );
    recomendacoesGerais.push(
      "Registrar o plano preventivo no sistema de gestão (PGR/GRO ou equivalente interno) e revisar após novo ciclo de avaliação."
    );
  } else {
    recomendacoesGerais.push(
      "Manter as boas práticas psicossociais identificadas e reconhecê-las formalmente junto às equipes e lideranças."
    );
    recomendacoesGerais.push(
      "Estabelecer rotina anual (ou semestral) de reavaliação COPSOQ para comparação longitudinal."
    );
    recomendacoesGerais.push(
      "Usar os fatores de proteção mais fortes como referência interna de benchmarking entre áreas."
    );
  }
  recomendacoesGerais.push(
    "Compartilhar este relatório com a direção e os responsáveis por SST/RH, convertendo achados em ações com prazo e responsável definidos (ver Plano de Ação)."
  );
  if (criticas.length > 3) {
    recomendacoesGerais.push(
      "Diante do volume de dimensões que requerem atenção, priorizar as de maior severidade e impacto operacional, evitando dispersão de esforços."
    );
  }

  const planoAcao = montarPlanoAcao(dimensoes);

  return {
    resumoNarrativo,
    conclusaoTecnica,
    recomendacoesGerais,
    planoAcao,
  };
}

export function montarPlanoAcao(
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[]
): ItemPlanoAcao[] {
  const ordenadas = [...dimensoesParaCalculo(dimensoes)].sort(
    (a, b) =>
      severidadeClassificacao(b.classificacaoId) -
        severidadeClassificacao(a.classificacaoId) ||
      a.nome.localeCompare(b.nome, "pt-BR")
  );

  const itens: ItemPlanoAcao[] = [];
  for (const d of ordenadas) {
    const sev = labelSeveridade(d.classificacaoId);
    if (sev === "favoravel") {
      // no máximo 2 ações de manutenção
      if (itens.filter((i) => i.prioridade === "Baixa").length >= 2) continue;
      itens.push({
        prioridade: "Baixa",
        acao: `Manter boas práticas em “${d.nome}” e documentar evidências.`,
        objetivo: "Preservar fator de proteção / baixa exposição ao risco.",
        responsavelSugerido: "Liderança da área + RH",
        prazoSugerido: "90 dias (revisão)",
        status: "Pendente",
        dimensaoId: d.id,
        dimensaoNome: d.nome,
      });
      continue;
    }

    const recs = recomendacoesDimensao(d);
    const acaoPrincipal =
      recs.find((r) => !r.toLowerCase().startsWith("monitorar")) ?? recs[0];

    itens.push({
      prioridade: sev === "critico" ? "Alta" : "Média",
      acao: acaoPrincipal,
      objetivo:
        sev === "critico"
          ? `Reduzir a exposição em Situação Desfavorável em “${d.nome}” e mitigar impactos à saúde ocupacional.`
          : `Estabilizar “${d.nome}” (Situação Moderada) e evitar progressão para Situação Desfavorável.`,
      responsavelSugerido:
        sev === "critico"
          ? "Diretoria / SST / RH"
          : "SST / RH / Liderança imediata",
      prazoSugerido: sev === "critico" ? "30 dias" : "60 dias",
      status: "Pendente",
      dimensaoId: d.id,
      dimensaoNome: d.nome,
    });
  }

  // Limitar a um plano executivo legível
  const altas = itens.filter((i) => i.prioridade === "Alta");
  const medias = itens.filter((i) => i.prioridade === "Média");
  const baixas = itens.filter((i) => i.prioridade === "Baixa");
  return [...altas, ...medias.slice(0, 5), ...baixas.slice(0, 2)].slice(0, 10);
}
