import { formatCNPJ } from "@/lib/cnpj";
import { compareByLabel } from "@/lib/sort-by-label";
import type { ClienteRecord } from "@/lib/types";

export interface ClienteFilterOption {
  value: string;
  label: string;
}

export function formatClienteSelectLabel(
  cliente: Pick<ClienteRecord, "nome" | "cnpj">
): string {
  const cnpjLabel = cliente.cnpj?.trim()
    ? formatCNPJ(cliente.cnpj)
    : "CNPJ não informado";
  return `${cliente.nome} — ${cnpjLabel}`;
}

export function buildClienteFilterOptions(
  clientes: ClienteRecord[]
): ClienteFilterOption[] {
  return [...clientes]
    .sort((a, b) => compareByLabel(a.nome, b.nome))
    .map((cliente) => ({
      value: cliente.nome,
      label: formatClienteSelectLabel(cliente),
    }));
}

export function resolveClienteIdByNome(
  clientes: ClienteRecord[],
  nome: string
): string {
  const trimmed = nome.trim();
  if (!trimmed) return "";
  const found = clientes.find((c) => c.nome === trimmed);
  return found?.id ?? "";
}
