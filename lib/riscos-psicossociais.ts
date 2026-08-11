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
import { filterByEtapaEntradaMes } from "@/lib/etapa-entrada";
import { LISTAGEM_MES_VAZIO_MSG, type YearMonth } from "@/lib/listagem-meses";
import {
  isListaPresencaEtapaConcluida,
  mapListaPresencaFromTracking,
  type RiscosListaPresencaDados,
} from "@/lib/riscos-lista-presenca";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";
import {
  exigeLaudosSstPorOrigem,
  isOrigemManualCliente,
  normalizeRiscosCampanhaOrigem,
  RISCOS_CAMPANHA_ORIGEM,
  type RiscosCampanhaOrigem,
} from "@/lib/riscos-campanha-origem";
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

/** Etapas manuais na UI (ordem do fluxo). */
export const RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS = [
  { id: "lista_presenca", label: "Lista de presença" },
  { id: "cadastro_empresa", label: "Cadastro da empresa" },
  { id: "pesquisa_psicossocial", label: "Pesquisa Psicossocial" },
  { id: "envio_qr_code", label: "Envio do QR Code" },
  { id: "preenchimento_finalizado", label: "Preenchimento finalizado" },
  { id: "laudo_elaborado", label: "Laudo elaborado" },
  { id: "enviado_cliente", label: "Enviado para o cliente" },
] as const;

export type RiscosPsicossociaisEtapaManualId =
  (typeof RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS)[number]["id"];

/**
 * IDs aceitos em `orcamento_riscos_psicossociais.etapa_atual` (constraint atual).
 * `pesquisa_psicossocial` é etapa de UI; persistência desse id virá em migration futura.
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
    label: "Laudos SST",
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

/** Total exibido (1 automática + 7 manuais). */
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
  /** Etapas manuais concluídas (0–7 na UI). */
  etapasManuaisConcluidas: number;
  totalEtapas: number;
  progressoLabel: string;
  status: RiscosPsicossociaisStatus;
  /** Se a aba automática Laudos SST está concluída (derivado do módulo Laudos). */
  laudosSstConcluido: boolean;
  /** Lista de presença concluída (solicitação + recebimento com anexo). */
  listaPresencaConcluida: boolean;
  listaPresenca: RiscosListaPresencaDados;
  /** Campanha de avaliação vinculada ao processo (se já criada). */
  campanha: RiscosCampanhaRecord | null;
  /**
   * Data de entrada em Riscos (= entrada simultânea com Laudos, na conclusão
   * da Implantação). Não muda quando Laudos é concluído depois.
   */
  dataEntrada: string | null;
}

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
 * Elegível a Riscos desde a Implantação concluída
 * (mesmo critério de entrada em Laudos SST).
 */
export function isProcessoElegivelRiscosPsicossociais(
  implantacao: ImplantacaoProcesso
): boolean {
  return isProcessoElegivelLaudosSst(implantacao);
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
  opts?: { origem?: RiscosCampanhaOrigem }
): RiscosPsicossociaisProcesso {
  const origem = normalizeRiscosCampanhaOrigem(
    opts?.origem ?? campanha?.origem ?? RISCOS_CAMPANHA_ORIGEM.orcamento
  );
  const exigeLaudosSst = exigeLaudosSstPorOrigem(origem);
  const totalEtapas = getTotalEtapasRiscosPorOrigem(origem);

  const laudosSstConcluido = exigeLaudosSst
    ? laudos.status === "concluido"
    : true;
  const listaPresenca = mapListaPresencaFromTracking(tracking);
  const listaPresencaConcluida = isListaPresencaEtapaConcluida(listaPresenca);

  const storedManuais = Math.min(
    RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS,
    Math.max(0, Number(tracking?.etapas_concluidas) || 0)
  );

  // Lista incompleta impede progresso manual; concluída garante pelo menos 1.
  const etapasManuaisConcluidas = listaPresencaConcluida
    ? Math.max(1, storedManuais)
    : 0;

  const etapasConcluidas =
    (exigeLaudosSst && laudosSstConcluido ? 1 : 0) + etapasManuaisConcluidas;

  const manuaisConcluidasTodas =
    etapasManuaisConcluidas >= RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS;
  const concluido =
    (!exigeLaudosSst || laudosSstConcluido) &&
    listaPresencaConcluida &&
    (tracking?.status === "concluido" || manuaisConcluidasTodas);

  let etapaAtual: RiscosPsicossociaisEtapaId;
  // TODO: Reativar dependência automática de Laudos SST quando o módulo estiver finalizado.
  if (
    exigeLaudosSst &&
    !DEVELOPMENT_SKIP_LAUDOS_SST_GATE &&
    !laudosSstConcluido
  ) {
    etapaAtual = "laudos_sst";
  } else if (!listaPresencaConcluida) {
    etapaAtual = "lista_presenca";
  } else if (concluido) {
    etapaAtual = "enviado_cliente";
  } else if (
    tracking &&
    isRiscosPsicossociaisEtapaPersistidaId(tracking.etapa_atual) &&
    tracking.etapa_atual !== "lista_presenca"
  ) {
    etapaAtual = tracking.etapa_atual;
  } else {
    etapaAtual = "cadastro_empresa";
  }

  const progressoAtual = concluido ? totalEtapas : etapasConcluidas;

  return {
    processoKey: laudos.implantacao.orcamento.id,
    origem,
    exigeLaudosSst,
    implantacao: laudos.implantacao,
    laudos,
    etapaAtual,
    etapasConcluidas: progressoAtual,
    etapasManuaisConcluidas: concluido
      ? RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS
      : etapasManuaisConcluidas,
    totalEtapas,
    progressoLabel: `${progressoAtual} de ${totalEtapas}`,
    status: concluido ? "concluido" : "em_andamento",
    laudosSstConcluido,
    listaPresencaConcluida,
    listaPresenca,
    campanha,
    dataEntrada: tracking?.entrada_em ?? laudos.dataEntrada ?? null,
  };
}

/**
 * Monta processo de lista a partir de campanha manual (sem orçamento/contrato).
 * Usa stub mínimo de implantação apenas para reutilizar a UI existente.
 */
export function buildRiscosProcessoManualCliente(input: {
  campanha: RiscosCampanhaRecord;
  tracking: OrcamentoRiscosPsicossociaisRecord | null;
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
  };

  const processo = buildRiscosPsicossociaisProcesso(
    laudosStub,
    input.tracking,
    campanha,
    { origem }
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
    const na =
      a.implantacao.orcamento.cliente_nome ||
      a.implantacao.orcamento.numero ||
      a.processoKey;
    const nb =
      b.implantacao.orcamento.cliente_nome ||
      b.implantacao.orcamento.numero ||
      b.processoKey;
    return na.localeCompare(nb, "pt-BR");
  });
}
