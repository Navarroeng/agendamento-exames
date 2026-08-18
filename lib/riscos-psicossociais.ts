/**
 * Riscos Psicossociais — fluxo pós-Implantação.
 *
 * Entrada: mesma elegibilidade de Laudos SST (Implantação concluída).
 * A 1ª aba "Laudos SST" é automática e deriva do status real de Laudos SST
 * (não é persistida em campo próprio para evitar divergência).
 */

import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import {
  isLaudosSstConcluido,
  isProcessoElegivelLaudosSst,
  type LaudosSstProcesso,
  type OrcamentoLaudosSstRecord,
} from "@/lib/laudos-sst";
import { EMPTY_LAUDOS_WORKFLOW } from "@/lib/laudos-sst-etapas";
import { filterByEtapaEntradaMes } from "@/lib/etapa-entrada";
import { LISTAGEM_MES_VAZIO_MSG, type YearMonth } from "@/lib/listagem-meses";
import {
  isListaPresencaEtapaConcluida,
  mapListaPresencaFromTracking,
  type RiscosListaPresencaDados,
} from "@/lib/riscos-lista-presenca";
import {
  campanhaExibeLinkConvite,
  type RiscosCampanhaRecord,
} from "@/lib/riscos-campanha";
import {
  exigeLaudosSstPorOrigem,
  isOrigemManualCliente,
  normalizeRiscosCampanhaOrigem,
  escolherCampanhaParaProgresso,
  RISCOS_CAMPANHA_ORIGEM,
  type RiscosCampanhaOrigem,
} from "@/lib/riscos-campanha-origem";
import type { RiscosParticipanteStatus } from "@/lib/riscos-campanha-participantes";
import { normalizeSearchText } from "@/lib/text-normalize";

/**
 * Modo de desenvolvimento do módulo Riscos Psicossociais.
 *
 * `true`  → todas as abas/etapas ficam navegáveis (bloqueio sequencial ignorado).
 * `false` → restaura o fluxo normal (exige conclusão das etapas anteriores).
 *
 * Não altera status, regras de negócio persistidas nem o banco — apenas a
 * liberação de navegação na UI, via `isRiscosEtapaLiberada`.
 */
export const DEVELOPMENT_UNLOCK_ALL_TABS = true;

/**
 * TODO: Reativar dependência automática de Laudos SST quando o módulo estiver finalizado.
 *
 * Enquanto `true`, o status de Laudos SST continua sendo exibido no painel,
 * mas não impede o uso do restante do fluxo (Lista de Presença, pesquisa,
 * participantes, etc.). A regra de negócio permanece no código — apenas
 * esta validação de avanço fica desabilitada.
 */
export const DEVELOPMENT_SKIP_LAUDOS_SST_GATE = true;

/**
 * Etapas do fluxo na UI (sem Laudo SST automático).
 * Progresso é derivado de fatos reais — não de `tracking.etapas_concluidas`.
 */
export const RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS = [
  { id: "lista_presenca", label: "Lista de Presença" },
  { id: "cadastro_colaboradores", label: "Cadastro dos Colaboradores" },
  { id: "link_enviado", label: "Link enviado" },
  { id: "aguardando_respostas", label: "Aguardando respostas" },
  { id: "finalizado", label: "Finalizado" },
] as const;

export type RiscosPsicossociaisEtapaManualId =
  (typeof RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS)[number]["id"];

/**
 * IDs aceitos em `orcamento_riscos_psicossociais.etapa_atual` (constraint do banco).
 * Mantidos para persistência da lista; o progresso exibido não depende deles.
 */
export const RISCOS_PSICOSSOCIAIS_ETAPAS_PERSISTIDAS = [
  "lista_presenca",
  "cadastro_empresa",
  "envio_qr_code",
  "preenchimento_finalizado",
  "laudo_elaborado",
  "enviado_cliente",
] as const;

export type RiscosPsicossociaisEtapaPersistidaId =
  (typeof RISCOS_PSICOSSOCIAIS_ETAPAS_PERSISTIDAS)[number];

/** Sequência completa na UI (inclui etapa automática dependente de Laudos SST). */
export const RISCOS_PSICOSSOCIAIS_ETAPAS = [
  {
    id: "laudos_sst",
    label: "Laudo SST Automático",
    automatica: true as const,
  },
  ...RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS.map((e) => ({
    ...e,
    automatica: false as const,
  })),
] as const;

export type RiscosPsicossociaisEtapaId =
  (typeof RISCOS_PSICOSSOCIAIS_ETAPAS)[number]["id"];

export type RiscosPsicossociaisStatus = "em_andamento" | "concluido";

export const RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS =
  RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS.length;

/** Total no fluxo automático (1 Laudo SST + 5 etapas). */
export const RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS =
  RISCOS_PSICOSSOCIAIS_ETAPAS.length;

export const RISCOS_PSICOSSOCIAIS_ETAPA_LABELS: Record<
  RiscosPsicossociaisEtapaId,
  string
> = Object.fromEntries(
  RISCOS_PSICOSSOCIAIS_ETAPAS.map((e) => [e.id, e.label])
) as Record<RiscosPsicossociaisEtapaId, string>;

/** Tracking persistido: etapas manuais persistíveis (0–6 no banco atual). */
export interface OrcamentoRiscosPsicossociaisRecord {
  orcamento_id: string;
  etapa_atual: RiscosPsicossociaisEtapaPersistidaId;
  etapas_concluidas: number;
  status?: RiscosPsicossociaisStatus | null;
  entrada_em?: string | null;
  concluido_em?: string | null;
  created_at?: string;
  updated_at?: string;
  lista_solicitada?: boolean | null;
  lista_solicitada_em?: string | null;
  lista_solicitada_email?: string | null;
  lista_solicitada_por?: string | null;
  lista_solicitada_registrado_em?: string | null;
  lista_recebida?: boolean | null;
  lista_anexo_path?: string | null;
  lista_anexo_nome?: string | null;
  lista_anexo_tipo?: string | null;
  lista_anexo_tamanho?: number | null;
  lista_recebida_em?: string | null;
  lista_recebida_por?: string | null;
}

export interface RiscosPsicossociaisProcesso {
  /**
   * Chave estável na UI: orçamento.id (fluxo normal) ou campanha.id (manual).
   */
  processoKey: string;
  origem: RiscosCampanhaOrigem;
  /** Laudos SST só existe no fluxo normal. */
  exigeLaudosSst: boolean;
  implantacao: ImplantacaoProcesso;
  laudos: LaudosSstProcesso;
  etapaAtual: RiscosPsicossociaisEtapaId;
  /** Progresso total exibido (0–N), conforme origem. */
  etapasConcluidas: number;
  /** Etapas do fluxo (sem Laudo SST) já concluídas. */
  etapasManuaisConcluidas: number;
  totalEtapas: number;
  progressoLabel: string;
  /** Percentual 0–100 das etapas concluídas. */
  progressoPercentual: number;
  status: RiscosPsicossociaisStatus;
  /** Se a aba automática Laudos SST está concluída (derivado do módulo Laudos). */
  laudosSstConcluido: boolean;
  /** Lista de presença concluída (solicitação + recebimento com anexo). */
  listaPresencaConcluida: boolean;
  listaPresenca: RiscosListaPresencaDados;
  /** Campanha de avaliação vinculada ao processo (se já criada). */
  campanha: RiscosCampanhaRecord | null;
  /** Participantes ativos (não removidos) — base do progresso. */
  participantesCadastrados: number;
  /** Participantes com status operacional Concluído (`respondido`). */
  participantesRespondidos: number;
  /** Relatório final efetivamente gerado (não confundir com campanha encerrada). */
  relatorioGerado: boolean;
  /**
   * Data de entrada em Riscos (= entrada simultânea com Laudos, na conclusão
   * da Implantação). Não muda quando Laudos é concluído depois.
   */
  dataEntrada: string | null;
  /** Data real de conclusão do tracking, se existir. */
  concluidoEm: string | null;
}

export type RiscosProgressoParticipanteInput = {
  status: RiscosParticipanteStatus | string;
};

export type BuildRiscosProcessoOpts = {
  origem?: RiscosCampanhaOrigem;
  /** Status dos participantes ativos (sem removidos). */
  participantes?: readonly RiscosProgressoParticipanteInput[];
  /** Fallback quando a lista completa não é recarregada. */
  participantesCadastrados?: number;
  participantesRespondidos?: number;
  /** Relatório final gerado — default false até existir geração real. */
  relatorioGerado?: boolean;
};

export interface RiscosPsicossociaisFilters {
  busca: string;
  responsavel: string;
}

export const EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS: RiscosPsicossociaisFilters = {
  busca: "",
  responsavel: "",
};

export function isRiscosPsicossociaisEtapaManualId(
  value: string
): value is RiscosPsicossociaisEtapaManualId {
  return RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS.some((e) => e.id === value);
}

export function isRiscosPsicossociaisEtapaPersistidaId(
  value: string
): value is RiscosPsicossociaisEtapaPersistidaId {
  return (RISCOS_PSICOSSOCIAIS_ETAPAS_PERSISTIDAS as readonly string[]).includes(
    value
  );
}

export function isRiscosPsicossociaisEtapaId(
  value: string
): value is RiscosPsicossociaisEtapaId {
  return RISCOS_PSICOSSOCIAIS_ETAPAS.some((e) => e.id === value);
}

export function isRiscosEtapaAutomatica(
  etapaId: RiscosPsicossociaisEtapaId
): boolean {
  return etapaId === "laudos_sst";
}

/** Etapas exibidas / contadas conforme a origem do processo. */
export function getEtapasRiscosPorOrigem(
  origem: RiscosCampanhaOrigem | string | null | undefined
): readonly (typeof RISCOS_PSICOSSOCIAIS_ETAPAS)[number][] {
  if (exigeLaudosSstPorOrigem(origem)) {
    return RISCOS_PSICOSSOCIAIS_ETAPAS;
  }
  return RISCOS_PSICOSSOCIAIS_ETAPAS.filter((e) => e.id !== "laudos_sst");
}

export function getTotalEtapasRiscosPorOrigem(
  origem: RiscosCampanhaOrigem | string | null | undefined
): number {
  return getEtapasRiscosPorOrigem(origem).length;
}

/**
 * Posição da etapa atual na sequência oficial da UI
 * (`RISCOS_PSICOSSOCIAIS_ETAPAS`). Inclusão manual não tem Laudo SST, mas
 * `lista_presenca` continua depois de `laudos_sst` nessa mesma sequência.
 */
export function indiceEtapaAtualRiscos(
  etapaId: RiscosPsicossociaisEtapaId | string | null | undefined
): number {
  return RISCOS_PSICOSSOCIAIS_ETAPAS.findIndex((e) => e.id === etapaId);
}

/** Cadastro concluído quando há pelo menos 1 participante ativo na campanha atual. */
export function isCadastroColaboradoresConcluido(input: {
  participantesCadastrados: number;
  /** @deprecated Ignorado — regra atual não usa quantidade prevista. */
  quantidadePrevista?: number | null | undefined;
}): boolean {
  return Math.max(0, Number(input.participantesCadastrados) || 0) >= 1;
}

/** Link enviado: pesquisa aberta (ou já encerrada — link foi liberado). */
export function isLinkEnviadoConcluido(
  campanhaStatus: string | null | undefined
): boolean {
  return campanhaExibeLinkConvite(campanhaStatus);
}

/**
 * Aguardando respostas: concluída somente quando TODOS os participantes
 * ativos estão Concluído (`respondido`). Pendente ou Iniciado mantém a etapa.
 */
export function isAguardandoRespostasConcluido(input: {
  participantesCadastrados: number;
  participantesRespondidos: number;
}): boolean {
  if (input.participantesCadastrados < 1) return false;
  return input.participantesRespondidos >= input.participantesCadastrados;
}

/** @deprecated Use `isAguardandoRespostasConcluido`. */
export function isQuestionarioFinalizadoConcluido(input: {
  participantesCadastrados: number;
  participantesRespondidos: number;
}): boolean {
  return isAguardandoRespostasConcluido(input);
}

export function contarParticipantesParaProgresso(
  participantes: readonly RiscosProgressoParticipanteInput[] | null | undefined
): { cadastrados: number; respondidos: number } {
  if (!participantes?.length) {
    return { cadastrados: 0, respondidos: 0 };
  }
  let cadastrados = 0;
  let respondidos = 0;
  for (const p of participantes) {
    const status = String(p.status ?? "");
    if (status === "removido") continue;
    cadastrados += 1;
    if (status === "respondido") respondidos += 1;
  }
  return { cadastrados, respondidos };
}

function resolveContagemParticipantes(opts?: BuildRiscosProcessoOpts): {
  cadastrados: number;
  respondidos: number;
} {
  if (opts?.participantes) {
    return contarParticipantesParaProgresso(opts.participantes);
  }
  return {
    cadastrados: Math.max(0, Number(opts?.participantesCadastrados) || 0),
    respondidos: Math.max(0, Number(opts?.participantesRespondidos) || 0),
  };
}

/**
 * Calcula etapa atual e progresso a partir dos fatos do processo
 * (sem usar `tracking.etapas_concluidas` / `tracking.etapa_atual`).
 */
export function calcularProgressoEtapasRiscos(input: {
  origem: RiscosCampanhaOrigem | string | null | undefined;
  laudosSstConcluido: boolean;
  listaPresencaConcluida: boolean;
  quantidadePrevista: number | null | undefined;
  participantesCadastrados: number;
  participantesRespondidos: number;
  campanhaStatus: RiscosCampanhaRecord["status"] | string | null | undefined;
  relatorioGerado: boolean;
}): {
  etapaAtual: RiscosPsicossociaisEtapaId;
  etapasConcluidas: number;
  etapasManuaisConcluidas: number;
  totalEtapas: number;
  progressoLabel: string;
  progressoPercentual: number;
  status: RiscosPsicossociaisStatus;
} {
  const exigeLaudos = exigeLaudosSstPorOrigem(input.origem);
  const etapas = getEtapasRiscosPorOrigem(input.origem);
  const totalEtapas = etapas.length;

  const cadastroOk = isCadastroColaboradoresConcluido({
    participantesCadastrados: input.participantesCadastrados,
  });
  const linkOk = isLinkEnviadoConcluido(input.campanhaStatus);
  const aguardandoOk = isAguardandoRespostasConcluido({
    participantesCadastrados: input.participantesCadastrados,
    participantesRespondidos: input.participantesRespondidos,
  });
  const finalizadoOk = input.relatorioGerado === true;

  const concluidaPorId: Record<RiscosPsicossociaisEtapaId, boolean> = {
    laudos_sst: !exigeLaudos || input.laudosSstConcluido,
    lista_presenca: input.listaPresencaConcluida,
    cadastro_colaboradores: cadastroOk,
    link_enviado: linkOk,
    aguardando_respostas: aguardandoOk,
    finalizado: finalizadoOk,
  };

  let etapasConcluidas = 0;
  let etapaAtual: RiscosPsicossociaisEtapaId = etapas[0]?.id ?? "lista_presenca";

  for (const etapa of etapas) {
    if (concluidaPorId[etapa.id]) {
      etapasConcluidas += 1;
      continue;
    }
    etapaAtual = etapa.id;
    break;
  }

  if (etapasConcluidas >= totalEtapas) {
    etapaAtual = "finalizado";
    etapasConcluidas = totalEtapas;
  }

  const etapasManuaisConcluidas = exigeLaudos
    ? Math.max(0, etapasConcluidas - (concluidaPorId.laudos_sst ? 1 : 0))
    : etapasConcluidas;

  const progressoPercentual =
    totalEtapas > 0
      ? Math.round((etapasConcluidas / totalEtapas) * 100)
      : 0;

  return {
    etapaAtual,
    etapasConcluidas,
    etapasManuaisConcluidas,
    totalEtapas,
    progressoLabel: `${etapasConcluidas} de ${totalEtapas}`,
    progressoPercentual,
    status: etapasConcluidas >= totalEtapas ? "concluido" : "em_andamento",
  };
}

/**
 * Encaminhamento automático da Implantação para Riscos:
 * mesma regra de Laudos (implantação pronta + Pacote completo - SST).
 * Inclusão manual (`origem = manual_cliente`) não usa esta função.
 */
export function isProcessoElegivelRiscosPsicossociais(
  implantacao: ImplantacaoProcesso
): boolean {
  return isProcessoElegivelLaudosSst(implantacao);
}

/** Tracking automático com trabalho real (não só lista_presenca vazia). */
export function riscosTrackingTemTrabalhoReal(
  tracking: OrcamentoRiscosPsicossociaisRecord | null | undefined
): boolean {
  if (!tracking) return false;
  if (tracking.status === "concluido") return true;
  if (Number(tracking.etapas_concluidas) > 0) return true;
  const etapa = (tracking.etapa_atual ?? "").trim();
  if (etapa && etapa !== "lista_presenca") return true;
  if (tracking.lista_solicitada === true) return true;
  if (tracking.lista_recebida === true) return true;
  if ((tracking.lista_anexo_path ?? "").trim()) return true;
  return false;
}

export function isProcessoVisivelRiscosAutomatico(
  implantacao: ImplantacaoProcesso,
  tracking: OrcamentoRiscosPsicossociaisRecord | null | undefined,
  temCampanha?: boolean
): boolean {
  if (isProcessoElegivelRiscosPsicossociais(implantacao)) return true;
  if (
    implantacao.orcamento.status === "cancelado" ||
    implantacao.orcamento.status === "contrato_encerrado" ||
    implantacao.etapaAtual === "contrato_encerrado" ||
    implantacao.etapaAtual === "treinamento_cancelado"
  ) {
    return false;
  }
  if (temCampanha) return true;
  return riscosTrackingTemTrabalhoReal(tracking);
}

/** @deprecated Use isProcessoElegivelRiscosPsicossociais(implantacao). */
export function isProcessoElegivelRiscosPsicossociaisPorLaudos(
  laudos: LaudosSstProcesso,
  trackingLaudos: OrcamentoLaudosSstRecord | null
): boolean {
  if (laudos.status === "concluido") return true;
  return isLaudosSstConcluido(trackingLaudos);
}

/**
 * Regra real de liberação sequencial (sempre preservada).
 * Usada por `isRiscosEtapaLiberada` quando o modo de desenvolvimento está off.
 */
export function isRiscosEtapaLiberadaByFluxo(
  processo: Pick<
    RiscosPsicossociaisProcesso,
    "laudosSstConcluido" | "listaPresencaConcluida" | "exigeLaudosSst"
  >,
  etapaId: RiscosPsicossociaisEtapaId
): boolean {
  if (etapaId === "laudos_sst") return true;
  // Fluxo manual: Laudos SST não faz parte — não bloqueia.
  const exigeLaudos = processo.exigeLaudosSst !== false;
  // TODO: Reativar dependência automática de Laudos SST quando o módulo estiver finalizado.
  if (
    exigeLaudos &&
    !DEVELOPMENT_SKIP_LAUDOS_SST_GATE &&
    !processo.laudosSstConcluido
  ) {
    return false;
  }
  if (etapaId === "lista_presenca") return true;
  return processo.listaPresencaConcluida;
}

/** Etapas manuais só liberam após Laudos SST (fluxo normal); Cadastro+ após Lista. */
export function isRiscosEtapaLiberada(
  processo: Pick<
    RiscosPsicossociaisProcesso,
    "laudosSstConcluido" | "listaPresencaConcluida" | "exigeLaudosSst"
  >,
  etapaId: RiscosPsicossociaisEtapaId
): boolean {
  if (DEVELOPMENT_UNLOCK_ALL_TABS) return true;
  return isRiscosEtapaLiberadaByFluxo(processo, etapaId);
}

export function mensagemBloqueioEtapaRiscos(
  processo: Pick<
    RiscosPsicossociaisProcesso,
    "laudosSstConcluido" | "listaPresencaConcluida" | "exigeLaudosSst"
  >,
  etapaId: RiscosPsicossociaisEtapaId
): string | null {
  if (isRiscosEtapaLiberada(processo, etapaId)) return null;
  const exigeLaudos = processo.exigeLaudosSst !== false;
  // TODO: Reativar dependência automática de Laudos SST quando o módulo estiver finalizado.
  if (
    exigeLaudos &&
    !DEVELOPMENT_SKIP_LAUDOS_SST_GATE &&
    !processo.laudosSstConcluido
  ) {
    return "Aguardando finalização do processo de Laudos SST.";
  }
  return "Aguardando conclusão da Lista de Presença (recebimento e anexo).";
}

export function buildRiscosPsicossociaisProcesso(
  laudos: LaudosSstProcesso,
  tracking: OrcamentoRiscosPsicossociaisRecord | null,
  campanha: RiscosCampanhaRecord | null = null,
  opts?: BuildRiscosProcessoOpts
): RiscosPsicossociaisProcesso {
  const origem = normalizeRiscosCampanhaOrigem(
    opts?.origem ?? campanha?.origem ?? RISCOS_CAMPANHA_ORIGEM.orcamento
  );
  const exigeLaudosSst = exigeLaudosSstPorOrigem(origem);
  /** Cancelada nunca entra no progresso — fonte única com a listagem. */
  const campanhaAtiva = escolherCampanhaParaProgresso([campanha]);

  const laudosSstConcluido = exigeLaudosSst
    ? laudos.status === "concluido"
    : true;
  const listaPresenca = mapListaPresencaFromTracking(tracking);
  const listaPresencaConcluida = isListaPresencaEtapaConcluida(listaPresenca);

  const { cadastrados, respondidos } = campanhaAtiva
    ? resolveContagemParticipantes(opts)
    : { cadastrados: 0, respondidos: 0 };
  const relatorioGerado = campanhaAtiva
    ? opts?.relatorioGerado === true
    : false;

  const progresso = calcularProgressoEtapasRiscos({
    origem,
    laudosSstConcluido,
    listaPresencaConcluida,
    quantidadePrevista: campanhaAtiva?.quantidade_prevista ?? null,
    participantesCadastrados: cadastrados,
    participantesRespondidos: respondidos,
    campanhaStatus: campanhaAtiva?.status ?? null,
    relatorioGerado,
  });

  return {
    processoKey: laudos.implantacao.orcamento.id,
    origem,
    exigeLaudosSst,
    implantacao: laudos.implantacao,
    laudos,
    etapaAtual: progresso.etapaAtual,
    etapasConcluidas: progresso.etapasConcluidas,
    etapasManuaisConcluidas: progresso.etapasManuaisConcluidas,
    totalEtapas: progresso.totalEtapas,
    progressoLabel: progresso.progressoLabel,
    progressoPercentual: progresso.progressoPercentual,
    status: progresso.status,
    laudosSstConcluido,
    listaPresencaConcluida,
    listaPresenca,
    campanha: campanhaAtiva,
    participantesCadastrados: cadastrados,
    participantesRespondidos: respondidos,
    relatorioGerado,
    dataEntrada: tracking?.entrada_em ?? laudos.dataEntrada ?? null,
    concluidoEm: tracking?.concluido_em ?? null,
  };
}

/** Recalcula etapa/progresso mantendo o restante do processo. */
export function withRiscosProgressoAtualizado(
  processo: RiscosPsicossociaisProcesso,
  patch?: {
    campanha?: RiscosCampanhaRecord | null;
    participantes?: readonly RiscosProgressoParticipanteInput[];
    relatorioGerado?: boolean;
  }
): RiscosPsicossociaisProcesso {
  const campanhaRaw =
    patch && "campanha" in patch ? patch.campanha ?? null : processo.campanha;
  const campanha = escolherCampanhaParaProgresso([campanhaRaw]);
  const contagem = patch?.participantes
    ? contarParticipantesParaProgresso(patch.participantes)
    : {
        cadastrados: processo.participantesCadastrados,
        respondidos: processo.participantesRespondidos,
      };
  const relatorioGerado =
    patch?.relatorioGerado !== undefined
      ? patch.relatorioGerado
      : processo.relatorioGerado;

  const progresso = calcularProgressoEtapasRiscos({
    origem: processo.origem,
    laudosSstConcluido: processo.laudosSstConcluido,
    listaPresencaConcluida: processo.listaPresencaConcluida,
    quantidadePrevista: campanha?.quantidade_prevista ?? null,
    participantesCadastrados: contagem.cadastrados,
    participantesRespondidos: contagem.respondidos,
    campanhaStatus: campanha?.status ?? null,
    relatorioGerado,
  });

  return {
    ...processo,
    campanha,
    participantesCadastrados: contagem.cadastrados,
    participantesRespondidos: contagem.respondidos,
    relatorioGerado,
    etapaAtual: progresso.etapaAtual,
    etapasConcluidas: progresso.etapasConcluidas,
    etapasManuaisConcluidas: progresso.etapasManuaisConcluidas,
    totalEtapas: progresso.totalEtapas,
    progressoLabel: progresso.progressoLabel,
    progressoPercentual: progresso.progressoPercentual,
    status: progresso.status,
  };
}

/**
 * Monta processo de lista a partir de campanha manual (sem orçamento/contrato).
 * Usa stub mínimo de implantação apenas para reutilizar a UI existente.
 */
export function buildRiscosProcessoManualCliente(input: {
  campanha: RiscosCampanhaRecord;
  tracking: OrcamentoRiscosPsicossociaisRecord | null;
  participantes?: readonly RiscosProgressoParticipanteInput[];
  relatorioGerado?: boolean;
}): RiscosPsicossociaisProcesso {
  const { campanha } = input;
  const origem = RISCOS_CAMPANHA_ORIGEM.manual_cliente;
  const agora = campanha.created_at ?? new Date().toISOString();
  const empresa = campanha.empresa_nome;
  const cnpj = campanha.cnpj;
  const responsavel = campanha.responsavel?.trim() || "—";

  const orcamentoStub = {
    id: `manual:${campanha.id}`,
    numero: "",
    data_proposta: agora.slice(0, 10),
    cliente_id: campanha.cliente_id,
    cliente_nome: empresa,
    cliente_cnpj: cnpj,
    cliente_endereco: null,
    cliente_setor: null,
    contato: null,
    email: null,
    telefone: null,
    responsavel,
    origem_cliente: null,
    observacoes: campanha.observacoes,
    motivo_cancelamento: null,
    observacao_cancelamento: null,
    cancelado_em: null,
    cancelado_por: null,
    desconto_percentual: 0,
    forma_pagamento: null,
    validade_proposta: null,
    subtotal: 0,
    valor_total: 0,
    status: "aprovado" as const,
    assinatura_status: "nao_aplicavel" as const,
    assinatura_token: null,
    aceite_em: null,
    aceite_ip: null,
    aceite_usuario_nome: null,
    link_aceite_expira_em: null,
    created_at: agora,
    updated_at: agora,
  };

  const implantacaoStub: ImplantacaoProcesso = {
    orcamento: orcamentoStub,
    aprovacao: null,
    contrato: null,
    etapaAtual: "concluido",
    etapasConcluidas: 0,
    totalEtapas: 0,
    progressoLabel: "—",
    agendamentoLiberado: false,
    agendamentoLabel: "Bloqueado",
    dataAprovacao: null,
    numeroContrato: null,
    ativo: true,
    quantidadeContratada: campanha.quantidade_prevista,
    agendamentosRealizados: 0,
    examesProgramadosFuturos: 0,
    asosContratuaisEmAberto: 0,
    agendamentosIniciaisDispensados: false,
    concluidoComExamesFuturos: false,
    fluxoImplantacao: "padrao",
    treinamento: null,
    etapasOperacionais: [],
  };

  const laudosStub: LaudosSstProcesso = {
    implantacao: implantacaoStub,
    etapaAtual: "envio_cliente",
    etapasConcluidas: 0,
    totalEtapas: 0,
    progressoLabel: "—",
    status: "concluido",
    dataEntrada: input.tracking?.entrada_em ?? campanha.created_at ?? null,
    concluidoEm: null,
    dataConclusaoImplantacao: null,
    workflow: { ...EMPTY_LAUDOS_WORKFLOW },
    tracking: null,
  };

  const processo = buildRiscosPsicossociaisProcesso(
    laudosStub,
    input.tracking,
    campanha,
    {
      origem,
      participantes: input.participantes,
      relatorioGerado: input.relatorioGerado,
    }
  );

  return {
    ...processo,
    processoKey: campanha.id,
  };
}

export function filterRiscosPsicossociaisProcessos(
  processos: RiscosPsicossociaisProcesso[],
  filters: RiscosPsicossociaisFilters
): RiscosPsicossociaisProcesso[] {
  const busca = normalizeSearchText(filters.busca);
  const buscaDigits = filters.busca.replace(/\D/g, "");

  return processos.filter((p) => {
    const { orcamento } = p.implantacao;
    const responsavel =
      p.campanha?.responsavel?.trim() || orcamento.responsavel || "";

    if (filters.responsavel && responsavel !== filters.responsavel) {
      return false;
    }

    if (!busca && !buscaDigits) return true;

    const haystack = [
      orcamento.numero,
      p.implantacao.numeroContrato ?? "",
      orcamento.cliente_nome,
      orcamento.cliente_cnpj ?? "",
      responsavel,
      isOrigemManualCliente(p.origem) ? "Inclusão manual" : "",
      p.status === "concluido"
        ? "Concluído"
        : RISCOS_PSICOSSOCIAIS_ETAPA_LABELS[p.etapaAtual],
    ].join(" ");

    if (busca && normalizeSearchText(haystack).includes(busca)) return true;
    if (
      buscaDigits &&
      (orcamento.cliente_cnpj ?? "").replace(/\D/g, "").includes(buscaDigits)
    ) {
      return true;
    }
    return false;
  });
}

export function filterRiscosPsicossociaisProcessosPorMes(
  processos: RiscosPsicossociaisProcesso[],
  mes: YearMonth
): RiscosPsicossociaisProcesso[] {
  return filterByEtapaEntradaMes(processos, (p) => p.dataEntrada, mes);
}

export const RISCOS_PSICOSSOCIAIS_MES_VAZIO_MSG = LISTAGEM_MES_VAZIO_MSG;

export function sortRiscosPsicossociaisProcessos(
  processos: RiscosPsicossociaisProcesso[]
): RiscosPsicossociaisProcesso[] {
  return [...processos].sort((a, b) => {
    const da = a.dataEntrada ?? "";
    const db = b.dataEntrada ?? "";
    if (da !== db) return db.localeCompare(da);
    return compareNomeProcessoRiscos(a, b);
  });
}

/** Filtro da listagem: Aberto = ainda não finalizado; Concluído = fluxo 100%. */
export type RiscosPsicossociaisListagemStatus = "aberto" | "concluido";

export const DEFAULT_RISCOS_LISTAGEM_STATUS: RiscosPsicossociaisListagemStatus =
  "aberto";

export function isRiscosProcessoListagemConcluido(
  processo: Pick<
    RiscosPsicossociaisProcesso,
    | "status"
    | "etapaAtual"
    | "etapasConcluidas"
    | "totalEtapas"
    | "progressoPercentual"
  >
): boolean {
  if (processo.status === "concluido") return true;
  if (processo.etapaAtual === "finalizado") return true;
  if (processo.totalEtapas > 0 && processo.etapasConcluidas >= processo.totalEtapas) {
    return true;
  }
  return processo.progressoPercentual >= 100;
}

export function filterRiscosPsicossociaisProcessosPorStatus(
  processos: RiscosPsicossociaisProcesso[],
  status: RiscosPsicossociaisListagemStatus
): RiscosPsicossociaisProcesso[] {
  return processos.filter((p) => {
    const concluido = isRiscosProcessoListagemConcluido(p);
    return status === "concluido" ? concluido : !concluido;
  });
}

function compareNomeProcessoRiscos(
  a: RiscosPsicossociaisProcesso,
  b: RiscosPsicossociaisProcesso
): number {
  const na =
    a.implantacao.orcamento.cliente_nome ||
    a.implantacao.orcamento.numero ||
    a.processoKey;
  const nb =
    b.implantacao.orcamento.cliente_nome ||
    b.implantacao.orcamento.numero ||
    b.processoKey;
  return na.localeCompare(nb, "pt-BR");
}

/**
 * Aberto: percentual DESC, índice da etapa atual DESC, data de entrada ASC.
 * Concluído: concluidoEm DESC se existir; senão dataEntrada DESC.
 */
export function sortRiscosPsicossociaisProcessosListagem(
  processos: RiscosPsicossociaisProcesso[],
  status: RiscosPsicossociaisListagemStatus
): RiscosPsicossociaisProcesso[] {
  return [...processos].sort((a, b) => {
    if (status === "aberto") {
      const pa = a.progressoPercentual ?? 0;
      const pb = b.progressoPercentual ?? 0;
      if (pa !== pb) return pb - pa;
      const ia = indiceEtapaAtualRiscos(a.etapaAtual);
      const ib = indiceEtapaAtualRiscos(b.etapaAtual);
      if (ia !== ib) return ib - ia;
      const da = a.dataEntrada ?? "";
      const db = b.dataEntrada ?? "";
      if (da !== db) return da.localeCompare(db);
      return compareNomeProcessoRiscos(a, b);
    }

    const ca = a.concluidoEm || a.dataEntrada || "";
    const cb = b.concluidoEm || b.dataEntrada || "";
    if (ca !== cb) return cb.localeCompare(ca);
    return compareNomeProcessoRiscos(a, b);
  });
}
