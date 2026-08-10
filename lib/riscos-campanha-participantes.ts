/** Participantes da Pesquisa Psicossocial (campanha). */

import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import { parseDataNascimentoBr } from "@/lib/date-br";
import { gerarCodigoPublicoCampanha } from "@/lib/riscos-campanha";

export const RISCOS_PARTICIPANTE_STATUS = ["pendente", "respondido"] as const;

export type RiscosParticipanteStatus =
  (typeof RISCOS_PARTICIPANTE_STATUS)[number];

export const RISCOS_PARTICIPANTE_STATUS_LABELS: Record<
  RiscosParticipanteStatus,
  string
> = {
  pendente: "Pendente",
  respondido: "Concluído",
};

export const RISCOS_PARTICIPANTE_ORIGENS = ["manual", "importacao"] as const;

export type RiscosParticipanteOrigem =
  (typeof RISCOS_PARTICIPANTE_ORIGENS)[number];

export type RiscosCampanhaParticipanteRecord = {
  id: string;
  campanha_id: string;
  orcamento_id: string;
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
};

export type RiscosParticipanteInput = {
  nomeCompleto: string;
  cpf: string;
  /** DD/MM/AAAA ou YYYY-MM-DD */
  dataNascimento: string;
  cargo?: string;
  setor?: string;
  email?: string;
};

/**
 * Colunas previstas para importação Excel futura:
 * Nome | CPF | Data de nascimento | Cargo | Setor | E-mail
 */

export type RiscosParticipantesResumo = {
  previstos: number;
  cadastrados: number;
  pendentes: number;
  respondidos: number;
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
  const email = input.email?.trim() ?? "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Informe um e-mail válido ou deixe em branco.";
  }
  return null;
}

export function buildParticipantesResumo(
  previstos: number,
  participantes: Pick<RiscosCampanhaParticipanteRecord, "status">[]
): RiscosParticipantesResumo {
  let pendentes = 0;
  let respondidos = 0;
  for (const p of participantes) {
    if (p.status === "respondido") respondidos += 1;
    else pendentes += 1;
  }
  return {
    previstos: Math.max(0, previstos),
    cadastrados: participantes.length,
    pendentes,
    respondidos,
  };
}
