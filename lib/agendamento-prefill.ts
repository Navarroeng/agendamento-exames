export const AGENDAMENTO_PREFILL_STORAGE_KEY = "agendamento_prefill_v1";

export interface AgendamentoPrefillData {
  cliente_nome: string;
  colaborador: string;
  colaborador_cpf?: string;
  cargo_id?: string;
  cargo_nome?: string;
  exame_nome?: string;
  aso?: string;
  cliente_cnpj?: string;
  contrato_id?: string;
  contrato_numero?: string;
  vaga_id?: string;
}

export function saveAgendamentoPrefill(data: AgendamentoPrefillData): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AGENDAMENTO_PREFILL_STORAGE_KEY, JSON.stringify(data));
}

export function consumeAgendamentoPrefill(): AgendamentoPrefillData | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(AGENDAMENTO_PREFILL_STORAGE_KEY);
  if (!raw) return null;

  sessionStorage.removeItem(AGENDAMENTO_PREFILL_STORAGE_KEY);

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
    cliente_cnpj: params.get("cnpj")?.trim() || undefined,
    contrato_id: params.get("contrato_id")?.trim() || undefined,
    contrato_numero: params.get("contrato")?.trim() || undefined,
    vaga_id: params.get("vaga_id")?.trim() || undefined,
  };
}
