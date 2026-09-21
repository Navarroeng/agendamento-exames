import { normalizeCnpjDigits } from "@/lib/cliente-cnpj";

export const CLIENTE_CADASTRO_AMBIGUO_MSG =
  "Há mais de um cadastro com este nome de empresa. Selecione a filial pelo CNPJ para continuar.";

export const AGENDAMENTO_SAVE_ERRO_INESPERADO_MSG =
  "Não foi possível salvar o agendamento. Tente novamente.";

export type ClienteLookupBy = "id" | "cnpj" | "nome" | "none";

export type ClienteLookupPlan = {
  by: ClienteLookupBy;
  value: string;
};

/**
 * Identidade do cliente no agendamento:
 * 1. UUID selecionado
 * 2. CNPJ
 * 3. nome só como fallback legado
 */
export function planClienteLookup(input: {
  clienteId?: string | null;
  clienteCnpj?: string | null;
  clienteNome?: string | null;
}): ClienteLookupPlan {
  const id = input.clienteId?.trim() ?? "";
  if (id) return { by: "id", value: id };

  const cnpjDigits = normalizeCnpjDigits(input.clienteCnpj ?? "");
  if (cnpjDigits.length === 14) return { by: "cnpj", value: cnpjDigits };

  const nome = input.clienteNome?.trim() ?? "";
  if (nome) return { by: "nome", value: nome };

  return { by: "none", value: "" };
}

export function escolherUnicoPorNome<T extends { nome: string }>(
  candidatos: T[],
  nome: string
): { status: "none" | "unique" | "ambiguous"; item?: T } {
  const key = nome.trim().toLowerCase();
  if (!key) return { status: "none" };
  const matches = candidatos.filter(
    (item) => item.nome.trim().toLowerCase() === key
  );
  if (matches.length === 0) return { status: "none" };
  if (matches.length > 1) return { status: "ambiguous" };
  return { status: "unique", item: matches[0] };
}

export function filtrarPeriodicosDoCliente<
  T extends { contrato_id?: string | null },
>(params: {
  rows: T[];
  contratoIdsDoCliente: readonly string[];
}): T[] {
  const ids = new Set(
    params.contratoIdsDoCliente.map((id) => id.trim()).filter(Boolean)
  );
  if (ids.size === 0) return [];
  return params.rows.filter((row) => {
    const contratoId = (row.contrato_id ?? "").trim();
    return contratoId !== "" && ids.has(contratoId);
  });
}

export function selecionarContratoVigenteParaAgendamento<
  T extends { id: string },
>(
  contratos: T[],
  isVigente: (contrato: T) => boolean,
  contratoIdPreferido?: string | null
): T | undefined {
  const preferido = (contratoIdPreferido ?? "").trim();
  if (preferido) {
    const alvo = contratos.find((contrato) => contrato.id === preferido);
    if (!alvo) return undefined;
    return isVigente(alvo) ? alvo : undefined;
  }
  return contratos.find(isVigente);
}

export function isPostgrestMultipleRowsError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { code?: unknown; message?: unknown };
  if (rec.code === "PGRST116") return true;
  const message = String(rec.message ?? "").toLowerCase();
  return (
    message.includes("multiple") &&
    (message.includes("row") || message.includes("result"))
  );
}

export function mensagemErroSalvarAgendamento(err: unknown): string {
  if (isPostgrestMultipleRowsError(err)) {
    return CLIENTE_CADASTRO_AMBIGUO_MSG;
  }
  const raw =
    err instanceof Error
      ? err.message
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message ?? "")
        : "";
  const message = raw.trim();
  if (!message) return AGENDAMENTO_SAVE_ERRO_INESPERADO_MSG;
  if (
    /pgrst|json object requested|multiple \(or no\) rows/i.test(message)
  ) {
    return CLIENTE_CADASTRO_AMBIGUO_MSG;
  }
  return message;
}
