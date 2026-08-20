/** Campanha de avaliação psicossocial (fundação). */

import {
  RISCOS_CAMPANHA_ORIGEM,
  normalizeRiscosCampanhaOrigem,
  type RiscosCampanhaOrigem,
} from "@/lib/riscos-campanha-origem";
import type { RiscosCampanhaLogoOrigem } from "@/lib/riscos-campanha-logo";

export const RISCOS_CAMPANHA_STATUS = [
  "em_preparacao",
  "aberta",
  "encerrada",
  "cancelada",
] as const;

export type RiscosCampanhaStatus = (typeof RISCOS_CAMPANHA_STATUS)[number];

export const RISCOS_CAMPANHA_STATUS_LABELS: Record<RiscosCampanhaStatus, string> =
  {
    em_preparacao: "Em preparação",
    aberta: "Aberta",
    encerrada: "Encerrada",
    cancelada: "Cancelada",
  };

export type RiscosCampanhaRecord = {
  id: string;
  /** Null em inclusão manual (sem orçamento fictício). */
  orcamento_id: string | null;
  cliente_id: string | null;
  cnpj: string;
  empresa_nome: string;
  data_inicio: string;
  data_encerramento: string;
  quantidade_prevista: number;
  status: RiscosCampanhaStatus;
  codigo_publico: string;
  /** Código compartilhado da campanha (admin). Nunca enviar ao portal público. */
  codigo_acesso_exibicao: string | null;
  origem: RiscosCampanhaOrigem;
  responsavel: string | null;
  observacoes: string | null;
  criado_por: string | null;
  /** URL pública opcional (geralmente null; UI usa signed URL). */
  logo_url: string | null;
  /** Path no Storage da campanha (isolado do cadastro da empresa). */
  logo_storage_path: string | null;
  /** empresa | campanha | manual */
  logo_origem: RiscosCampanhaLogoOrigem | null;
  logo_nome: string | null;
  logo_tipo: string | null;
  logo_tamanho: number | null;
  cancelada_em?: string | null;
  cancelada_por?: string | null;
  motivo_cancelamento?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RiscosCampanhaCreateInput = {
  orcamentoId: string;
  clienteId: string | null;
  cnpj: string;
  empresaNome: string;
  dataInicioIso: string;
  dataEncerramentoIso: string;
};

/** Criação a partir do cadastro do cliente (sem orçamento/contrato). */
export type RiscosCampanhaManualCreateInput = {
  clienteId: string;
  cnpj: string;
  empresaNome: string;
  responsavel: string;
  dataInicioIso: string;
  dataEncerramentoIso: string;
};

export function mapRiscosCampanhaRow(
  row: Record<string, unknown>
): RiscosCampanhaRecord {
  const statusRaw = String(row.status ?? "em_preparacao");
  const status: RiscosCampanhaStatus = isRiscosCampanhaStatus(statusRaw)
    ? statusRaw
    : "em_preparacao";

  const logoOrigemRaw =
    row.logo_origem != null ? String(row.logo_origem) : null;
  const logo_origem: RiscosCampanhaLogoOrigem | null =
    logoOrigemRaw === "empresa" ||
    logoOrigemRaw === "campanha" ||
    logoOrigemRaw === "manual"
      ? logoOrigemRaw
      : null;

  return {
    id: String(row.id),
    orcamento_id: row.orcamento_id ? String(row.orcamento_id) : null,
    cliente_id: row.cliente_id ? String(row.cliente_id) : null,
    cnpj: String(row.cnpj ?? ""),
    empresa_nome: String(row.empresa_nome ?? ""),
    data_inicio: String(row.data_inicio ?? "").slice(0, 10),
    data_encerramento: String(row.data_encerramento ?? "").slice(0, 10),
    quantidade_prevista: Number(row.quantidade_prevista) || 0,
    status,
    codigo_publico: String(row.codigo_publico ?? ""),
    codigo_acesso_exibicao: row.codigo_acesso_exibicao
      ? String(row.codigo_acesso_exibicao)
      : null,
    origem: normalizeRiscosCampanhaOrigem(
      row.origem != null ? String(row.origem) : undefined
    ),
    responsavel: row.responsavel ? String(row.responsavel) : null,
    observacoes: row.observacoes ? String(row.observacoes) : null,
    criado_por: row.criado_por ? String(row.criado_por) : null,
    logo_url: row.logo_url ? String(row.logo_url) : null,
    logo_storage_path: row.logo_storage_path
      ? String(row.logo_storage_path)
      : null,
    logo_origem,
    logo_nome: row.logo_nome ? String(row.logo_nome) : null,
    logo_tipo: row.logo_tipo ? String(row.logo_tipo) : null,
    logo_tamanho:
      row.logo_tamanho != null ? Number(row.logo_tamanho) : null,
    cancelada_em: row.cancelada_em ? String(row.cancelada_em) : null,
    cancelada_por: row.cancelada_por ? String(row.cancelada_por) : null,
    motivo_cancelamento: row.motivo_cancelamento
      ? String(row.motivo_cancelamento)
      : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export const RISCOS_CAMPANHA_SELECT =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, codigo_acesso_exibicao, origem, responsavel, observacoes, criado_por, logo_url, logo_storage_path, logo_origem, logo_nome, logo_tipo, logo_tamanho, cancelada_em, cancelada_por, motivo_cancelamento, created_at, updated_at";

/** Schema com origem/cancelamento, sem colunas de logo (pré-migration 107). */
export const RISCOS_CAMPANHA_SELECT_SEM_LOGO =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, codigo_acesso_exibicao, origem, responsavel, observacoes, criado_por, cancelada_em, cancelada_por, motivo_cancelamento, created_at, updated_at";

export const RISCOS_CAMPANHA_SELECT_LEGACY =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, codigo_acesso_exibicao, criado_por, created_at, updated_at";

/** Erro de coluna ausente no SELECT de riscos_campanhas (migrations pendentes). */
export function isRiscosCampanhaSelectSchemaError(
  error: { message?: string; code?: string } | null | undefined
): boolean {
  if (!error) return false;
  const msg = error.message ?? "";
  return (
    /origem|responsavel|observacoes|logo_|cancelada_/i.test(msg) ||
    error.code === "42703" ||
    error.code === "PGRST204"
  );
}

const CODIGO_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function gerarCodigoPublicoCampanha(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * CODIGO_ALPHABET.length);
    out += CODIGO_ALPHABET[idx];
  }
  return out;
}

export function isRiscosCampanhaStatus(
  value: string
): value is RiscosCampanhaStatus {
  return (RISCOS_CAMPANHA_STATUS as readonly string[]).includes(value);
}

function validatePeriodoCampanhaBase(input: {
  dataInicioIso: string;
  dataEncerramentoIso: string;
  empresaNome: string;
  cnpj: string;
}): string | null {
  const inicio = input.dataInicioIso.trim().slice(0, 10);
  const fim = input.dataEncerramentoIso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
    return "Informe a data de início.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
    return "Informe a data de encerramento.";
  }
  if (fim < inicio) {
    return "A data de encerramento deve ser igual ou posterior ao início.";
  }
  if (!input.empresaNome.trim()) {
    return "Empresa não identificada no processo.";
  }
  if (!input.cnpj.replace(/\D/g, "")) {
    return "CNPJ não identificado no processo.";
  }
  return null;
}

export function validateRiscosCampanhaCreateInput(
  input: RiscosCampanhaCreateInput
): string | null {
  const base = validatePeriodoCampanhaBase(input);
  if (base) return base;
  if (!input.orcamentoId) {
    return "Processo de Riscos inválido.";
  }
  return null;
}

export function validateRiscosCampanhaManualCreateInput(
  input: RiscosCampanhaManualCreateInput
): string | null {
  const base = validatePeriodoCampanhaBase(input);
  if (base) return base;
  if (!input.clienteId.trim()) {
    return "Cliente inválido.";
  }
  if (!input.responsavel.trim()) {
    return "Selecione o responsável interno.";
  }
  return null;
}

export { normalizeRiscosCampanhaOrigem, RISCOS_CAMPANHA_ORIGEM };

export function formatPeriodoCampanha(
  dataInicio: string,
  dataEncerramento: string
): string {
  const fmt = (iso: string) => {
    const d = iso.slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (!m) return d;
    return `${m[3]}/${m[2]}/${m[1]}`;
  };
  return `${fmt(dataInicio)} a ${fmt(dataEncerramento)}`;
}

/** Path conceitual do questionário público. */
export function pathAvaliacaoCampanha(codigo: string): string {
  return `/avaliacao/${codigo.trim().toUpperCase()}`;
}

/**
 * URL pública completa da pesquisa (mesma fonte para Copiar link e QR Code).
 * Em browser usa `window.location.origin` quando `origin` não é informado.
 */
export function urlPublicaPesquisaCampanha(
  codigo: string,
  origin?: string
): string {
  const path = pathAvaliacaoCampanha(codigo);
  const base = (
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

/** Nome de arquivo seguro para download do QR (empresa + código). */
export function nomeArquivoQrCodePesquisa(
  empresaNome: string,
  codigoPublico: string
): string {
  const empresa = empresaNome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 48);
  const codigo = codigoPublico.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const parteEmpresa = empresa || "EMPRESA";
  const parteCodigo = codigo || "CAMPANHA";
  return `QR-Code-${parteEmpresa}-${parteCodigo}.png`;
}

/**
 * Pesquisa efetivamente aberta: a ação "Abrir pesquisa" persistiu
 * `riscos_campanhas.status = aberta`. Encerrada também conta (já foi aberta).
 * Existência de campanha, código ou link NÃO indica abertura.
 */
export function isPesquisaEfetivamenteAberta(
  status: RiscosCampanhaStatus | string | null | undefined
): boolean {
  return status === "aberta" || status === "encerrada";
}

/**
 * Link/código no card Convites: só após abertura (ou encerrada, como info admin).
 * O codigo_publico pode existir no banco antes — a UX não deve divulgá-lo.
 */
export function campanhaExibeLinkConvite(
  status: RiscosCampanhaStatus | string | null | undefined
): boolean {
  return isPesquisaEfetivamenteAberta(status);
}

/** Copiar link só enquanto a pesquisa está aberta ao portal. */
export function campanhaPermiteCopiarLink(
  status: RiscosCampanhaStatus | string | null | undefined
): boolean {
  return status === "aberta";
}

/**
 * Habilitação do menu ⋮ na listagem principal (coluna Ações).
 * Gerar relatório: todos os cadastrados concluídos e ainda sem relatório persistido.
 */
export function acoesMenuListagemProcessoRiscos(input: {
  campanhaStatus: RiscosCampanhaStatus | string | null | undefined;
  codigoPublico?: string | null;
  isAdmin: boolean;
  hasCampanha: boolean;
  relatorioGerado?: boolean;
  participantesCadastrados?: number;
  participantesRespondidos?: number;
  processoCancelado?: boolean;
  processoConcluido?: boolean;
}): {
  podeAbrir: boolean;
  podeCopiarLink: boolean;
  copiarLinkMotivoDesabilitado: string;
  podeGerarRelatorio: boolean;
  gerarRelatorioMotivoDesabilitado: string;
  mostrarRemoverProcesso: boolean;
  mostrarCancelar: boolean;
} {
  const codigo = String(input.codigoPublico ?? "").trim();
  const processoCancelado = input.processoCancelado === true;
  const podeCopiar =
    !processoCancelado &&
    Boolean(input.hasCampanha) &&
    Boolean(codigo) &&
    campanhaPermiteCopiarLink(input.campanhaStatus);

  const cadastrados = Math.max(0, Number(input.participantesCadastrados) || 0);
  const respondidos = Math.max(0, Number(input.participantesRespondidos) || 0);
  const status = String(input.campanhaStatus ?? "");
  let gerarMotivo = "";
  let podeGerar = false;
  if (processoCancelado) {
    gerarMotivo = "Não é possível gerar relatório de processo cancelado.";
  } else if (!input.hasCampanha) {
    gerarMotivo = "Crie a pesquisa antes de gerar o relatório.";
  } else if (status === "cancelada") {
    gerarMotivo = "Não é possível gerar relatório de campanha cancelada.";
  } else if (input.relatorioGerado) {
    gerarMotivo = "Relatório já gerado — abra o processo para visualizar.";
  } else if (cadastrados < 1) {
    gerarMotivo = "Cadastre e conclua os participantes antes de gerar o relatório.";
  } else if (respondidos < cadastrados) {
    gerarMotivo = "Ainda existem participantes que não concluíram a pesquisa.";
  } else {
    podeGerar = true;
  }

  return {
    podeAbrir: true,
    podeCopiarLink: podeCopiar,
    copiarLinkMotivoDesabilitado: processoCancelado
      ? "Processo cancelado."
      : podeCopiar
        ? ""
        : "Disponível após abrir a pesquisa.",
    podeGerarRelatorio: podeGerar,
    gerarRelatorioMotivoDesabilitado: gerarMotivo,
    mostrarRemoverProcesso:
      input.isAdmin && input.hasCampanha && Boolean(codigo) && !processoCancelado,
    mostrarCancelar: !processoCancelado && input.processoConcluido !== true,
  };
}

/**
 * Ações do card Convites conforme status persistido (fonte de verdade).
 * Separado do state local — use sempre o status lido do banco.
 */
export function acoesConvitePorStatus(
  status: RiscosCampanhaStatus | string | null | undefined
): {
  exibirAbrir: boolean;
  exibirEncerrar: boolean;
  exibirLink: boolean;
  permitirCopiarLink: boolean;
} {
  const s = String(status ?? "");
  return {
    exibirAbrir: s === "em_preparacao",
    exibirEncerrar: s === "aberta",
    exibirLink: s === "aberta" || s === "encerrada",
    permitirCopiarLink: s === "aberta",
  };
}

/** Cancelar processo: qualquer status exceto já cancelada (e sem relatório real — futuro). */
export function validateCancelarProcessoRiscos(
  campanha: Pick<RiscosCampanhaRecord, "status">
): string | null {
  if (campanha.status === "cancelada") {
    return "Esta pesquisa já está cancelada.";
  }
  return null;
}

export function validateMotivoCancelamento(motivo: string): string | null {
  const t = motivo.trim();
  if (!t) return "Informe o motivo do cancelamento.";
  if (t.length < 5) return "O motivo deve ter ao menos 5 caracteres.";
  if (t.length > 2000) return "O motivo é demasiado longo.";
  return null;
}

/** Exclusão definitiva: exige confirmação do código público. */
export function validateConfirmacaoExclusaoCampanha(
  codigoPublico: string,
  confirmacaoDigitada: string
): string | null {
  const esperado = codigoPublico.trim().toUpperCase();
  const digitado = confirmacaoDigitada.trim().toUpperCase();
  if (!esperado) return "Código da campanha inválido.";
  if (!digitado) return "Digite o código público da campanha para confirmar.";
  if (digitado !== esperado) {
    return "O código digitado não confere com o código da campanha.";
  }
  return null;
}

/** Motivos pré-definidos para remoção definitiva do processo (admin). */
export const RISCOS_MOTIVOS_REMOCAO_PROCESSO = [
  "Processo criado por engano",
  "Empresa incorreta",
  "Campanha de teste",
  "Necessário reiniciar processo",
  "Outro",
] as const;

export type RiscosMotivoRemocaoProcesso =
  (typeof RISCOS_MOTIVOS_REMOCAO_PROCESSO)[number];

/**
 * Relatório final persistido — ainda não existe entidade.
 * Nunca usar status "encerrada" como proxy.
 */
export function existeRelatorioFinalPersistidoCampanha(_campanhaId: string): boolean {
  return false;
}

export function validateRemoverProcessoRiscos(
  campanha: Pick<RiscosCampanhaRecord, "id" | "status">
): string | null {
  if (existeRelatorioFinalPersistidoCampanha(campanha.id)) {
    return "Não é possível remover o processo: existe relatório final persistido.";
  }
  return null;
}

export function validateMotivoRemocaoProcesso(
  motivoOpcao: string,
  motivoOutro?: string
): string | null {
  const opcao = motivoOpcao.trim();
  if (!opcao) return "Informe o motivo da remoção.";
  if (
    !(RISCOS_MOTIVOS_REMOCAO_PROCESSO as readonly string[]).includes(opcao)
  ) {
    return "Motivo da remoção inválido.";
  }
  if (opcao === "Outro") {
    const outro = (motivoOutro ?? "").trim();
    if (!outro) return "Descreva o motivo da remoção.";
    if (outro.length < 5) return "O motivo deve ter ao menos 5 caracteres.";
    if (outro.length > 2000) return "O motivo é demasiado longo.";
  }
  return null;
}

export function resolverTextoMotivoRemocao(
  motivoOpcao: string,
  motivoOutro?: string
): string {
  const opcao = motivoOpcao.trim();
  if (opcao === "Outro") return (motivoOutro ?? "").trim();
  return opcao;
}

/**
 * Pré-requisitos de negócio para liberar o botão "Abrir pesquisa".
 * Laudos SST só quando o fluxo exige (origem orçamento).
 */
export function validatePreRequisitosAbrirCampanha(input: {
  listaPresencaConcluida: boolean;
  participantesCadastrados: number;
  exigeLaudosSst?: boolean;
  laudosSstConcluido?: boolean;
}): string | null {
  if (input.exigeLaudosSst && !input.laudosSstConcluido) {
    return "Conclua o processo de Laudos SST antes de abrir a pesquisa.";
  }
  if (!input.listaPresencaConcluida) {
    return "Conclua a Lista de Presença antes de abrir a pesquisa.";
  }
  if (input.participantesCadastrados < 1) {
    return "Cadastre ao menos um participante antes de abrir a pesquisa.";
  }
  return null;
}

/**
 * Valida se a campanha pode ser aberta para respostas no Portal.
 * Não altera dados — apenas regras de negócio (status + período).
 */
export function validateAbrirCampanhaRiscos(
  campanha: Pick<
    RiscosCampanhaRecord,
    "status" | "data_inicio" | "data_encerramento"
  >,
  hojeIso?: string
): string | null {
  if (campanha.status === "aberta") {
    return "Esta pesquisa já está aberta.";
  }
  if (campanha.status === "encerrada") {
    return "Não é possível abrir uma pesquisa encerrada.";
  }
  if (campanha.status === "cancelada") {
    return "Não é possível abrir uma pesquisa cancelada.";
  }
  if (campanha.status !== "em_preparacao") {
    return "Somente pesquisas em preparação podem ser abertas.";
  }

  const inicio = String(campanha.data_inicio ?? "").trim().slice(0, 10);
  const fim = String(campanha.data_encerramento ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
    return "Informe a data de início antes de abrir a pesquisa.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
    return "Informe a data de encerramento antes de abrir a pesquisa.";
  }
  if (fim < inicio) {
    return "A data de encerramento deve ser igual ou posterior ao início.";
  }

  const hoje = (hojeIso ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
  if (hoje < inicio || hoje > fim) {
    return "A data atual precisa estar dentro do período configurado para abrir a pesquisa.";
  }

  return null;
}

/** Estrutura preparada para encerramento manual (ainda não implementado). */
export function validateEncerrarCampanhaRiscos(
  campanha: Pick<RiscosCampanhaRecord, "status">
): string | null {
  if (campanha.status !== "aberta") {
    return "Somente pesquisas abertas podem ser encerradas.";
  }
  return null;
}

