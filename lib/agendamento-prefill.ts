import { resolveClienteIdByNome } from "@/lib/cliente-display";
import { cnpjDigitsIguais } from "@/lib/cliente-cnpj";

export const AGENDAMENTO_PREFILL_STORAGE_KEY = "agendamento_prefill_v1";

export interface AgendamentoPrefillData {
  cliente_nome: string;
  colaborador: string;
  colaborador_cpf?: string;
  cargo_id?: string;
  cargo_nome?: string;
  exame_nome?: string;
  aso?: string;
  cliente_id?: string;
  cliente_cnpj?: string;
  contrato_id?: string;
  contrato_numero?: string;
  vaga_id?: string;
  /** Ciclo de Periódico Futuro a vincular automaticamente (caminho A). */
  periodico_ids?: string[];
}

export type PrefillClienteCatalogItem = {
  id: string;
  nome: string;
  cnpj?: string | null;
};

function parsePrefillJson(raw: string): AgendamentoPrefillData | null {
  try {
    const parsed = JSON.parse(raw) as AgendamentoPrefillData;
    if (!parsed?.cliente_nome?.trim() || !parsed?.colaborador?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAgendamentoPrefill(data: AgendamentoPrefillData): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AGENDAMENTO_PREFILL_STORAGE_KEY, JSON.stringify(data));
}

export function peekAgendamentoPrefill(): AgendamentoPrefillData | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(AGENDAMENTO_PREFILL_STORAGE_KEY);
  if (!raw) return null;
  return parsePrefillJson(raw);
}

export function consumeAgendamentoPrefill(): AgendamentoPrefillData | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(AGENDAMENTO_PREFILL_STORAGE_KEY);
  if (!raw) return null;

  sessionStorage.removeItem(AGENDAMENTO_PREFILL_STORAGE_KEY);
  return parsePrefillJson(raw);
}

export function parseAgendamentoPrefillFromSearchParams(
  params: URLSearchParams
): AgendamentoPrefillData | null {
  if (params.get("prefill") !== "1") return null;

  const cliente_nome = params.get("empresa")?.trim() ?? "";
  const colaborador = params.get("colaborador")?.trim() ?? "";
  if (!cliente_nome || !colaborador) return null;

  return {
    cliente_nome,
    colaborador,
    colaborador_cpf: params.get("cpf")?.trim() || undefined,
    cargo_id: params.get("cargo_id")?.trim() || undefined,
    cargo_nome: params.get("cargo")?.trim() || undefined,
    exame_nome: params.get("exame")?.trim() || undefined,
    aso: params.get("aso")?.trim() || "Periódico",
    cliente_id: params.get("cliente_id")?.trim() || undefined,
    cliente_cnpj: params.get("cnpj")?.trim() || undefined,
    contrato_id: params.get("contrato_id")?.trim() || undefined,
    contrato_numero: params.get("contrato")?.trim() || undefined,
    vaga_id: params.get("vaga_id")?.trim() || undefined,
  };
}

/**
 * Não aplica o prefill até a lista de clientes (e, se preciso, cargos) existir.
 * Evita consumir o storage e marcar como aplicado enquanto o select ainda está vazio.
 */
export function shouldDeferAgendamentoPrefillApply(input: {
  clientesLoading: boolean;
  cargosLoading: boolean;
  cargoId?: string | null;
  cargoNome?: string | null;
}): boolean {
  if (input.clientesLoading) return true;
  const hasCargoId = Boolean(input.cargoId?.trim());
  const hasCargoNome = Boolean(input.cargoNome?.trim());
  return !hasCargoId && hasCargoNome && input.cargosLoading;
}

/**
 * Resolve o id do select de Cliente.
 * Ordem: cliente_id → CNPJ → nome (já usado no formulário).
 */
export function resolveClienteIdFromPrefill(
  clientes: PrefillClienteCatalogItem[],
  prefill: Pick<AgendamentoPrefillData, "cliente_id" | "cliente_cnpj" | "cliente_nome">
): string {
  const id = prefill.cliente_id?.trim() ?? "";
  if (id && clientes.some((cliente) => cliente.id === id)) {
    return id;
  }

  if (prefill.cliente_cnpj?.trim()) {
    const byCnpj = clientes.find((cliente) =>
      cnpjDigitsIguais(cliente.cnpj, prefill.cliente_cnpj)
    );
    if (byCnpj) return byCnpj.id;
  }

  return resolveClienteIdByNome(clientes, prefill.cliente_nome);
}
