import type { LaudosSstEtapaId } from "@/lib/laudos-sst";

/** Perguntas extras do Cronograma quando a empresa disponibiliza EPIs. */
export const LAUDOS_CRONOGRAMA_PERGUNTAS_EPI = [
  {
    id: "itens_considerados",
    label: "Os itens relacionados a EPIs foram considerados no Cronograma de Ações?",
  },
] as const;

export type LaudosCronogramaEpiPerguntaId =
  (typeof LAUDOS_CRONOGRAMA_PERGUNTAS_EPI)[number]["id"];

export type LaudosEpiRespostas = Record<string, boolean | null>;

export interface LaudosSstWorkflow {
  epiDisponibiliza: boolean | null;
  cadastroRealizado: boolean | null;
  cadastroData: string | null;
  cronogramaElaborado: boolean | null;
  cronogramaData: string | null;
  cronogramaEpiRespostas: LaudosEpiRespostas;
  pgrRealizado: boolean | null;
  pgrData: string | null;
  pcmsoRealizado: boolean | null;
  pcmsoData: string | null;
  ltcatRealizado: boolean | null;
  ltcatData: string | null;
  enviadoPedro: boolean | null;
  enviadoPedroEm: string | null;
  aprovacaoPedro: boolean | null;
  aprovacaoPedroEm: string | null;
  aprovacaoPedroPorNome: string | null;
  enviadoCliente: boolean | null;
  enviadoClienteEmail: string | null;
  enviadoClienteData: string | null;
}

export const EMPTY_LAUDOS_WORKFLOW: LaudosSstWorkflow = {
  epiDisponibiliza: null,
  cadastroRealizado: null,
  cadastroData: null,
  cronogramaElaborado: null,
  cronogramaData: null,
  cronogramaEpiRespostas: {},
  pgrRealizado: null,
  pgrData: null,
  pcmsoRealizado: null,
  pcmsoData: null,
  ltcatRealizado: null,
  ltcatData: null,
  enviadoPedro: null,
  enviadoPedroEm: null,
  aprovacaoPedro: null,
  aprovacaoPedroEm: null,
  aprovacaoPedroPorNome: null,
  enviadoCliente: null,
  enviadoClienteEmail: null,
  enviadoClienteData: null,
};

function hasDate(value: string | null | undefined): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function simComData(
  realizado: boolean | null,
  data: string | null | undefined
): boolean {
  return realizado === true && hasDate(data);
}

export function isCronogramaEpiPerguntasConcluidas(
  epiDisponibiliza: boolean | null,
  respostas: LaudosEpiRespostas
): boolean {
  if (epiDisponibiliza !== true) return true;
  return LAUDOS_CRONOGRAMA_PERGUNTAS_EPI.every((q) => respostas[q.id] === true);
}

export function isLaudosEtapaConcluida(
  etapa: LaudosSstEtapaId,
  w: LaudosSstWorkflow
): boolean {
  switch (etapa) {
    case "epis":
      return w.epiDisponibiliza === true || w.epiDisponibiliza === false;
    case "processo_inicial":
      return simComData(w.cadastroRealizado, w.cadastroData);
    case "cronograma_acoes":
      return (
        simComData(w.cronogramaElaborado, w.cronogramaData) &&
        isCronogramaEpiPerguntasConcluidas(
          w.epiDisponibiliza,
          w.cronogramaEpiRespostas
        )
      );
    case "pgr_pcmso_ltcat":
      return (
        simComData(w.pgrRealizado, w.pgrData) &&
        simComData(w.pcmsoRealizado, w.pcmsoData) &&
        simComData(w.ltcatRealizado, w.ltcatData) &&
        w.enviadoPedro === true
      );
    case "autorizacao_pedro":
      return w.aprovacaoPedro === true;
    case "envio_cliente":
      return (
        w.enviadoCliente === true &&
        Boolean(w.enviadoClienteEmail?.trim()) &&
        hasDate(w.enviadoClienteData)
      );
    default:
      return false;
  }
}

export function isPgrPcmsoLtcatDocumentosProntos(w: LaudosSstWorkflow): boolean {
  return (
    simComData(w.pgrRealizado, w.pgrData) &&
    simComData(w.pcmsoRealizado, w.pcmsoData) &&
    simComData(w.ltcatRealizado, w.ltcatData)
  );
}

export function contarEtapasConsecutivasConcluidas(
  w: LaudosSstWorkflow,
  ordem: readonly LaudosSstEtapaId[]
): number {
  let n = 0;
  for (const etapa of ordem) {
    if (!isLaudosEtapaConcluida(etapa, w)) break;
    n += 1;
  }
  return n;
}

export function resolverEtapaAtualLaudos(
  w: LaudosSstWorkflow,
  ordem: readonly LaudosSstEtapaId[]
): LaudosSstEtapaId {
  for (const etapa of ordem) {
    if (!isLaudosEtapaConcluida(etapa, w)) return etapa;
  }
  return ordem[ordem.length - 1] ?? "epis";
}

export function isLaudosEtapaLiberada(
  etapa: LaudosSstEtapaId,
  w: LaudosSstWorkflow,
  ordem: readonly LaudosSstEtapaId[]
): boolean {
  const idx = ordem.indexOf(etapa);
  if (idx <= 0) return true;
  const concluidas = contarEtapasConsecutivasConcluidas(w, ordem);
  return idx <= concluidas;
}

export function proximaEtapaLaudos(
  etapa: LaudosSstEtapaId,
  ordem: readonly LaudosSstEtapaId[]
): LaudosSstEtapaId | null {
  const idx = ordem.indexOf(etapa);
  if (idx < 0 || idx >= ordem.length - 1) return null;
  return ordem[idx + 1] ?? null;
}

export function isEmailLaudosValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
