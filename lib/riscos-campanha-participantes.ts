/** Participantes da Pesquisa Psicossocial (campanha). */

import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import { parseDataNascimentoBr } from "@/lib/date-br";
import { gerarCodigoPublicoCampanha } from "@/lib/riscos-campanha";

export const RISCOS_PARTICIPANTE_STATUS = [
  "pendente",
  "iniciado",
  "respondido",
  "invalidado",
  "removido",
] as const;

export type RiscosParticipanteStatus =
  (typeof RISCOS_PARTICIPANTE_STATUS)[number];

export const RISCOS_PARTICIPANTE_STATUS_LABELS: Record<
  RiscosParticipanteStatus,
  string
> = {
  pendente: "Pendente",
  iniciado: "Iniciado",
  respondido: "Concluído",
  invalidado: "Invalidado",
  removido: "Removido",
};

/**
 * Status operacional de acompanhamento (não altera Responderam/resultados).
 * - Pendente: 0 respostas e não concluído
 * - Iniciado: ≥1 resposta e não concluído
 * - Concluído (respondido): sessão finalizada
 * Nunca regride de iniciado para pendente.
 */
export function calcularStatusParticipanteOperacional(input: {
  quantidadeRespostas: number;
  concluido?: boolean;
  statusAtual?: string | null;
}): "pendente" | "iniciado" | "respondido" {
  if (input.concluido || input.statusAtual === "respondido") {
    return "respondido";
  }
  if (input.quantidadeRespostas > 0 || input.statusAtual === "iniciado") {
    return "iniciado";
  }
  return "pendente";
}

/** Após gravar resposta válida: só avança pendente → iniciado. */
export function deveAvancarParaIniciado(statusAtual: string): boolean {
  return statusAtual === "pendente";
}

export const RISCOS_PARTICIPANTE_ORIGENS = ["manual", "importacao"] as const;

export type RiscosParticipanteOrigem =
  (typeof RISCOS_PARTICIPANTE_ORIGENS)[number];

export type RiscosCampanhaParticipanteRecord = {
  id: string;
  campanha_id: string;
  orcamento_id: string | null;
  cliente_id: string | null;
  nome_completo: string;
  cpf: string;
  /** YYYY-MM-DD */
  data_nascimento: string | null;
  cargo: string | null;
  setor: string | null;
  email: string | null;
  status: RiscosParticipanteStatus;
  /** Identificador interno do participante (não é login do portal). */
  codigo_acesso: string;
  origem: RiscosParticipanteOrigem;
  criado_por: string | null;
  created_at: string;
  updated_at?: string;
  removido_em?: string | null;
};

export type RiscosParticipanteInput = {
  nomeCompleto: string;
  cpf: string;
  /** DD/MM/AAAA ou YYYY-MM-DD */
  dataNascimento: string;
  email?: string;
};

/**
 * Colunas de importação Excel:
 * Nome completo | CPF | Data de nascimento
 * (E-mail permanece no banco, mas fora do cadastro/importação atuais.)
 */

export type RiscosParticipantesResumo = {
  /** Sempre igual a `cadastrados` — quantidade oficial da campanha. */
  previstos: number;
  cadastrados: number;
  pendentes: number;
  respondidos: number;
  invalidados: number;
};

export function isRiscosParticipanteStatus(
  value: string
): value is RiscosParticipanteStatus {
  return (RISCOS_PARTICIPANTE_STATUS as readonly string[]).includes(value);
}

export function gerarCodigoAcessoParticipante(length = 8): string {
  return gerarCodigoPublicoCampanha(length);
}

/** CPF mascarado para listagem: ***.***.***-XX */
export function maskCpfParticipante(
  value: string | null | undefined
): string {
  const digits = normalizeCpfDigits(value);
  if (digits.length !== 11) return "—";
  return `***.***.***-${digits.slice(9)}`;
}

export function validateRiscosParticipanteInput(
  input: RiscosParticipanteInput
): string | null {
  if (!input.nomeCompleto.trim()) {
    return "Informe o nome completo.";
  }
  if (!isValidCPF(input.cpf)) {
    return "Informe um CPF válido.";
  }
  if (!parseDataNascimentoBr(input.dataNascimento)) {
    return "Informe a data de nascimento (DD/MM/AAAA).";
  }
  return null;
}

/**
 * Resumo operacional. A quantidade oficial é o total de cadastrados ativos
 * (não há mais “qtd. prevista” informada pelo usuário).
 */
export function buildParticipantesResumo(
  participantes: Pick<RiscosCampanhaParticipanteRecord, "status">[]
): RiscosParticipantesResumo {
  let pendentes = 0;
  let respondidos = 0;
  let invalidados = 0;
  for (const p of participantes) {
    if (p.status === "respondido") respondidos += 1;
    else if (p.status === "invalidado" || p.status === "removido") {
      invalidados += 1;
    } else pendentes += 1;
  }
  const cadastrados = participantes.length;
  return {
    previstos: cadastrados,
    cadastrados,
    pendentes,
    respondidos,
    invalidados,
  };
}
