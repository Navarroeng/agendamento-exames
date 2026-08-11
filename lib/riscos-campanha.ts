/** Campanha de avaliação psicossocial (fundação). */

import {
  RISCOS_CAMPANHA_ORIGEM,
  normalizeRiscosCampanhaOrigem,
  type RiscosCampanhaOrigem,
} from "@/lib/riscos-campanha-origem";

export const RISCOS_CAMPANHA_STATUS = [
  "em_preparacao",
  "aberta",
  "encerrada",
] as const;

export type RiscosCampanhaStatus = (typeof RISCOS_CAMPANHA_STATUS)[number];

export const RISCOS_CAMPANHA_STATUS_LABELS: Record<RiscosCampanhaStatus, string> =
  {
    em_preparacao: "Em preparação",
    aberta: "Aberta",
    encerrada: "Encerrada",
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
  quantidadePrevista: number;
};

/** Criação a partir do cadastro do cliente (sem orçamento/contrato). */
export type RiscosCampanhaManualCreateInput = {
  clienteId: string;
  cnpj: string;
  empresaNome: string;
  responsavel: string;
  dataInicioIso: string;
  dataEncerramentoIso: string;
  quantidadePrevista: number;
  observacoes?: string | null;
};

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

function validatePeriodoEQuantidade(input: {
  dataInicioIso: string;
  dataEncerramentoIso: string;
  quantidadePrevista: number;
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
  const qtd = Number(input.quantidadePrevista);
  if (!Number.isFinite(qtd) || qtd < 1 || !Number.isInteger(qtd)) {
    return "Informe a quantidade prevista de colaboradores (número inteiro ≥ 1).";
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
  const base = validatePeriodoEQuantidade(input);
  if (base) return base;
  if (!input.orcamentoId) {
    return "Processo de Riscos inválido.";
  }
  return null;
}

export function validateRiscosCampanhaManualCreateInput(
  input: RiscosCampanhaManualCreateInput
): string | null {
  const base = validatePeriodoEQuantidade(input);
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

/** Path conceitual futuro do questionário público. */
export function pathAvaliacaoCampanha(codigo: string): string {
  return `/avaliacao/${codigo.trim().toUpperCase()}`;
}

/**
 * Link/código no card Convites: só após abertura (ou encerrada, como info admin).
 * O codigo_publico pode existir no banco antes — a UX não deve divulgá-lo.
 */
export function campanhaExibeLinkConvite(
  status: RiscosCampanhaStatus | string | null | undefined
): boolean {
  return status === "aberta" || status === "encerrada";
}

/** Copiar link só enquanto a pesquisa está aberta ao portal. */
export function campanhaPermiteCopiarLink(
  status: RiscosCampanhaStatus | string | null | undefined
): boolean {
  return status === "aberta";
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

