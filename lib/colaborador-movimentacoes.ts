/**
 * Movimentações administrativas de colaboradores.
 * Eventos persistidos (não flag). Identidade: cliente_id + CPF normalizado.
 */

import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import type { ClienteColaboradorLinha } from "@/lib/portal-colaboradores";

export const TIPO_DESLIGAMENTO_ADMIN = "desligamento_admin" as const;

export type ColaboradorMovimentacaoTipo = typeof TIPO_DESLIGAMENTO_ADMIN;

export type ColaboradorDesligamentoOrigem = "demissional" | "admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

export function toDataEventoIso(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const iso = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

export function isMovimentacaoCancelada(
  canceladoEm: string | null | undefined
): boolean {
  return Boolean(String(canceladoEm ?? "").trim());
}

export function podeDemitirColaborador(
  linha: ClienteColaboradorLinha | null | undefined
): boolean {
  return linha?.situacao === "ativo";
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
  cpf: string;
  dataEvento: string;
  motivo?: string | null;
};

export type ValidarDesligamentoOk = {
  ok: true;
  clienteId: string;
  cpfDigits: string;
  dataEvento: string;
  motivo: string | null;
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
  if (!isValidCPF(cpfDigits)) {
    return { ok: false, error: "CPF inválido.", status: 400 };
  }

  const dataEvento = toDataEventoIso(input.dataEvento);
  if (!dataEvento) {
    return { ok: false, error: "Data do desligamento inválida.", status: 400 };
  }

  const motivoRaw = String(input.motivo ?? "").trim();
  const motivo = motivoRaw ? motivoRaw.slice(0, 500) : null;

  return { ok: true, clienteId, cpfDigits, dataEvento, motivo };
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
