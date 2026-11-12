/**
 * Movimentações administrativas de colaboradores.
 * Eventos persistidos (não flag). Identidade: cliente_id + CPF normalizado.
 */

import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import type { ClienteColaboradorLinha } from "@/lib/portal-colaboradores";

export const TIPO_DESLIGAMENTO_ADMIN = "desligamento_admin" as const;
export const TIPO_ADMISSAO = "admissao" as const;
export const TIPO_CADASTRO = "cadastro" as const;

export type ColaboradorMovimentacaoTipo =
  | typeof TIPO_DESLIGAMENTO_ADMIN
  | typeof TIPO_ADMISSAO
  | typeof TIPO_CADASTRO;

export type ColaboradorDesligamentoOrigem = "demissional" | "admin";

export function isDesligamentoAdminAtivo(mov: {
  tipo?: string | null;
  cancelado_em?: string | null;
}): boolean {
  if (String(mov.tipo ?? "").trim() !== TIPO_DESLIGAMENTO_ADMIN) return false;
  return !isMovimentacaoCancelada(mov.cancelado_em);
}

/** CPFs com desligamento administrativo vigente (não cancelado). */
export function coletarCpfsDesligamentoAdminAtivo(
  movimentacoes: Array<{
    tipo?: string | null;
    cpf_digits?: string | null;
    cancelado_em?: string | null;
  }>
): Set<string> {
  const cpfs = new Set<string>();
  for (const mov of movimentacoes) {
    if (!isDesligamentoAdminAtivo(mov)) continue;
    const cpf = normalizeCpfDigits(mov.cpf_digits);
    if (isValidCPF(cpf)) cpfs.add(cpf);
  }
  return cpfs;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

export function toDataEventoIso(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

/** Data de calendário, sem interpretar o texto como instante UTC. */
export function isDataCalendarioIso(value: string | null | undefined): boolean {
  const iso = toDataEventoIso(value);
  if (!iso) return false;
  const [yearStr, monthStr, dayStr] = iso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isMovimentacaoCancelada(
  canceladoEm: string | null | undefined
): boolean {
  return Boolean(String(canceladoEm ?? "").trim());
}

export function podeDemitirColaborador(
  linha: ClienteColaboradorLinha | null | undefined
): boolean {
  if (linha?.situacao !== "ativo") return false;
  if (isValidCPF(linha.cpfDigits)) return true;
  return Boolean(
    linha.historicoAgendamentoId || linha.vinculoVagaId || linha.cadastroId
  );
}

export function podeDesfazerDesligamentoAdmin(
  linha: ClienteColaboradorLinha | null | undefined
): boolean {
  return (
    linha?.situacao === "demitido" &&
    linha.desligamentoOrigem === "admin" &&
    Boolean(linha.desligamentoMovimentacaoId)
  );
}

export type ValidarDesligamentoInput = {
  clienteId: string;
  cpf?: string | null;
  dataEvento: string;
  motivo?: string | null;
  agendamentoId?: string | null;
  vagaId?: string | null;
  cadastroId?: string | null;
};

export type ValidarDesligamentoOk = {
  ok: true;
  clienteId: string;
  cpfDigits: string;
  dataEvento: string;
  motivo: string | null;
  agendamentoId: string | null;
  vagaId: string | null;
  cadastroId: string | null;
};

export type ValidarDesligamentoErro = {
  ok: false;
  error: string;
  status: 400;
};

export function validarPayloadDesligamentoAdmin(
  input: ValidarDesligamentoInput
): ValidarDesligamentoOk | ValidarDesligamentoErro {
  const clienteId = String(input.clienteId ?? "").trim();
  if (!isUuid(clienteId)) {
    return { ok: false, error: "Cliente inválido.", status: 400 };
  }

  const cpfDigits = normalizeCpfDigits(input.cpf);
  const agendamentoId = String(input.agendamentoId ?? "").trim();
  const vagaId = String(input.vagaId ?? "").trim();
  const cadastroId = String(input.cadastroId ?? "").trim();
  const temCpf = isValidCPF(cpfDigits);
  if (!temCpf && cpfDigits) {
    return { ok: false, error: "CPF inválido.", status: 400 };
  }
  if (agendamentoId && !isUuid(agendamentoId)) {
    return { ok: false, error: "Exame inválido.", status: 400 };
  }
  if (vagaId && !isUuid(vagaId)) {
    return { ok: false, error: "Vínculo inválido.", status: 400 };
  }
  if (cadastroId && !isUuid(cadastroId)) {
    return { ok: false, error: "Cadastro inválido.", status: 400 };
  }
  if (!temCpf && !agendamentoId && !vagaId && !cadastroId) {
    return { ok: false, error: "CPF inválido.", status: 400 };
  }

  const dataEvento = toDataEventoIso(input.dataEvento);
  if (!dataEvento) {
    return { ok: false, error: "Data do desligamento inválida.", status: 400 };
  }

  const motivoRaw = String(input.motivo ?? "").trim();
  const motivo = motivoRaw ? motivoRaw.slice(0, 500) : null;

  return {
    ok: true,
    clienteId,
    cpfDigits: temCpf ? cpfDigits : "",
    dataEvento,
    motivo,
    agendamentoId: temCpf ? null : agendamentoId || null,
    vagaId: temCpf ? null : vagaId || null,
    cadastroId: temCpf ? null : cadastroId || null,
  };
}

export type ValidarAdmissaoInput = {
  clienteId: string;
  cpf: string;
  dataAdmissao: string;
  movimentacaoId?: string | null;
};

export type ValidarAdmissaoOk = {
  ok: true;
  clienteId: string;
  cpfDigits: string;
  dataAdmissao: string;
  movimentacaoId: string | null;
};

export function validarPayloadAdmissao(
  input: ValidarAdmissaoInput
): ValidarAdmissaoOk | ValidarDesligamentoErro {
  const clienteId = String(input.clienteId ?? "").trim();
  if (!isUuid(clienteId)) {
    return { ok: false, error: "Cliente inválido.", status: 400 };
  }

  const cpfDigits = normalizeCpfDigits(input.cpf);
  if (!isValidCPF(cpfDigits)) {
    return { ok: false, error: "CPF inválido.", status: 400 };
  }

  const dataAdmissao = toDataEventoIso(input.dataAdmissao);
  if (!dataAdmissao || !isDataCalendarioIso(dataAdmissao)) {
    return { ok: false, error: "Data de admissão inválida.", status: 400 };
  }

  const movimentacaoInformada = String(input.movimentacaoId ?? "").trim();
  if (movimentacaoInformada && !isUuid(movimentacaoInformada)) {
    return { ok: false, error: "Registro de admissão inválido.", status: 400 };
  }

  return {
    ok: true,
    clienteId,
    cpfDigits,
    dataAdmissao,
    movimentacaoId: movimentacaoInformada || null,
  };
}

export type ValidarDesfazerInput = {
  clienteId: string;
  movimentacaoId: string;
};

export function validarPayloadDesfazerDesligamento(
  input: ValidarDesfazerInput
):
  | { ok: true; clienteId: string; movimentacaoId: string }
  | ValidarDesligamentoErro {
  const clienteId = String(input.clienteId ?? "").trim();
  const movimentacaoId = String(input.movimentacaoId ?? "").trim();
  if (!isUuid(clienteId)) {
    return { ok: false, error: "Cliente inválido.", status: 400 };
  }
  if (!isUuid(movimentacaoId)) {
    return { ok: false, error: "Movimentação inválida.", status: 400 };
  }
  return { ok: true, clienteId, movimentacaoId };
}
