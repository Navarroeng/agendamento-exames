export type {
  CopsoqClassificacaoResultado,
  CopsoqClassificacaoResultadoId,
  CopsoqComportamentosOfensivosQualitativo,
  CopsoqDimensaoCalculoResultado,
  CopsoqEngineInput,
  CopsoqEngineResult,
  CopsoqParticipacaoOperacional,
  CopsoqRespostasRespondente,
} from "@/lib/copsoq-engine/types";

export { COPSOQ_ENGINE_DIVERGENCIAS } from "@/lib/copsoq-engine/types";

export {
  maxPontuacaoEscala,
  pontuarAlternativa,
  pontuarRespostaPorId,
  pontuarRespostaPorLabel,
} from "@/lib/copsoq-engine/score";

export {
  resolverPontuacaoResposta,
  normalizarChaveAlternativa,
} from "@/lib/copsoq-engine/normalization";

export {
  COPSOQ_ESCALA_COMUM_MIN,
  COPSOQ_ESCALA_COMUM_MAX,
  amplitudeEscalaDimensao,
  amplitudeEfetivaPergunta,
  minPontuacaoEscala,
  normalizarMediaDimensao,
  normalizarPontuacao,
} from "@/lib/copsoq-engine/scale-normalize";

export {
  mediaIndividualDimensao,
  mediaGeralDimensao,
  perguntasCalculoDaDimensao,
} from "@/lib/copsoq-engine/dimensions";

export {
  classificarMediaDimensao,
  CLASSIFICACAO_NAO_DEFINIDA,
  COPSOQ_FAIXA_BAIXA_MAX,
  COPSOQ_FAIXA_MEDIA_MIN,
  COPSOQ_FAIXA_MEDIA_MAX,
} from "@/lib/copsoq-engine/classification";

export {
  calcularParticipacaoOperacional,
  contarCoberturaDimensao,
} from "@/lib/copsoq-engine/statistics";

export {
  interpretarCampanhaCopsoq,
  dimensoesParaMediaGeral,
} from "@/lib/copsoq-engine/interpreter";
