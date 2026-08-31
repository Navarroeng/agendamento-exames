export type {
  CopsoqAlternativa,
  CopsoqClassificacaoId,
  CopsoqDimensao,
  CopsoqDimensaoTipo,
  CopsoqEscala,
  CopsoqEscalaId,
  CopsoqFlowItem,
  CopsoqInstrumento,
  CopsoqPergunta,
} from "@/lib/copsoq/types";

export { COPSOQ_DIMENSOES } from "@/lib/copsoq/dimensoes";
export { COPSOQ_ESCALAS, getCopsoqEscala } from "@/lib/copsoq/escalas";
export { COPSOQ_PERGUNTAS } from "@/lib/copsoq/perguntas";
export {
  COPSOQ_INTERSTICIAIS_INVENTADOS_PROIBIDOS,
  COPSOQ_INTERSTICIAIS_OFICIAIS,
  COPSOQ_INTERSTICIAL_ANTES_DE_CODIGOS,
} from "@/lib/copsoq/intersticiais";
export {
  COPSOQ_INSTRUMENTO,
  buildCopsoqFlow,
  getAlternativasDaPergunta,
  getCopsoqInstrumento,
  getDimensaoById,
  getPerguntasOrdenadas,
} from "@/lib/copsoq/instrument";
export {
  filtrarMapaQuestionario,
  formatNumeroVisualQuestionario,
  idsCategoriasVisiveis,
  idsPerguntasQueCombinam,
  montarMapaQuestionarioCopsoq,
  normalizarBuscaMapa,
  todasCategoriasDoMapa,
  type MapaCategoriaCopsoq,
  type MapaPerguntaCopsoq,
  type MapaQuestionarioCopsoq,
} from "@/lib/copsoq/mapa-questionario";
export {
  classificarMediaDimensao,
  dimensoesParaMediaGeral,
  mediaGeralDimensao,
  mediaIndividualDimensao,
  pontuarAlternativa,
  pontuarRespostaPorId,
  pontuarRespostaPorLabel,
} from "@/lib/copsoq/scoring";
export {
  assertSemPerguntasLegadas,
  validarInstrumentoCopsoq,
} from "@/lib/copsoq/validate";
