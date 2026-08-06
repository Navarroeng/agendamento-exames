import { formatCNPJ } from "@/lib/cnpj";
import { compareByLabel } from "@/lib/sort-by-label";
import type { ClienteRecord } from "@/lib/types";

export interface ClienteFilterOption {
  value: string;
  label: string;
}

/**
 * Apresentação do nome da empresa em caixa alta (pt-BR).
 * Não altera o valor persistido — uso exclusivo de UI.
 */
export function formatClienteNomeDisplay(
  nome: string | null | undefined
): string {
  if (nome == null) return "";
  return nome.toLocaleUpperCase("pt-BR");
}

export function formatClienteSelectLabel(
  cliente: Pick<ClienteRecord, "nome" | "cnpj">
): string {
  const cnpjLabel = cliente.cnpj?.trim()
    ? formatCNPJ(cliente.cnpj)
    : "CNPJ não informado";
  return `${formatClienteNomeDisplay(cliente.nome)} — ${cnpjLabel}`;
}

export function buildClienteFilterOptions(
  clientes: ClienteRecord[]
): ClienteFilterOption[] {
  return buildClienteFilterOptionsHistorico(clientes);
}

/** Opções de filtro histórico: todos os clientes cadastrados + nomes extras (ex.: agendamentos). */
export function buildClienteFilterOptionsHistorico(
  clientes: ClienteRecord[],
  nomesExtras: string[] = []
): ClienteFilterOption[] {
  const byKey = new Map<string, ClienteFilterOption>();

  for (const cliente of clientes) {
    const nome = cliente.nome.trim();
    if (!nome) continue;
    byKey.set(nome.toLowerCase(), {
      value: nome,
      label: formatClienteSelectLabel(cliente),
    });
  }

  for (const raw of nomesExtras) {
    const nome = raw.trim();
    if (!nome) continue;
    const key = nome.toLowerCase();
    if (byKey.has(key)) continue;
    byKey.set(key, { value: nome, label: formatClienteNomeDisplay(nome) });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    compareByLabel(a.label, b.label)
  );
}

export function resolveClienteIdByNome(
  clientes: ClienteRecord[],
  nome: string
): string {
  const trimmed = nome.trim();
  if (!trimmed) return "";
  const key = trimmed.toLowerCase().replace(/\s+/g, " ");
  const found = clientes.find(
    (c) => c.nome.trim().toLowerCase().replace(/\s+/g, " ") === key
  );
  return found?.id ?? "";
}
