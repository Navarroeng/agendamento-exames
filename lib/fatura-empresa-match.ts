import { onlyDigits } from "./cnpj";

/** Catálogo mínimo de clientes para resolver id/CNPJ a partir do nome. */
export type ClienteCatalogItem = {
  id: string;
  nome: string;
  cnpj: string;
};

export type EmpresaFaturaRef = {
  id?: string | null;
  cnpj?: string | null;
  nome: string;
};

export type AgendamentoEmpresaFields = {
  cliente_id?: string | null;
  cliente_cnpj?: string | null;
  cliente_nome: string;
};

export function normalizeNomeEmpresaFatura(
  nome: string | null | undefined
): string {
  return (nome ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeCnpjFatura(
  cnpj: string | null | undefined
): string | null {
  const digits = onlyDigits(cnpj ?? "");
  return digits.length === 14 ? digits : null;
}

export function resolveClienteFromCatalog(
  catalog: ClienteCatalogItem[] | undefined,
  nome: string | null | undefined
): ClienteCatalogItem | null {
  const key = normalizeNomeEmpresaFatura(nome);
  if (!key || !catalog?.length) return null;
  return (
    catalog.find((c) => normalizeNomeEmpresaFatura(c.nome) === key) ?? null
  );
}

function resolveAgendamentoIdentity(
  agendamento: AgendamentoEmpresaFields,
  catalog?: ClienteCatalogItem[]
): { id: string | null; cnpj: string | null; nome: string } {
  const fromCatalog = resolveClienteFromCatalog(
    catalog,
    agendamento.cliente_nome
  );
  const id =
    (agendamento.cliente_id ?? "").trim() || fromCatalog?.id || null;
  const cnpj =
    normalizeCnpjFatura(agendamento.cliente_cnpj) ||
    normalizeCnpjFatura(fromCatalog?.cnpj) ||
    null;
  return {
    id,
    cnpj,
    nome: agendamento.cliente_nome ?? "",
  };
}

function resolveEmpresaIdentity(
  empresa: EmpresaFaturaRef,
  catalog?: ClienteCatalogItem[]
): { id: string | null; cnpj: string | null; nome: string } {
  const fromCatalog = resolveClienteFromCatalog(catalog, empresa.nome);
  const id = (empresa.id ?? "").trim() || fromCatalog?.id || null;
  const cnpj =
    normalizeCnpjFatura(empresa.cnpj) ||
    normalizeCnpjFatura(fromCatalog?.cnpj) ||
    null;
  return {
    id,
    cnpj,
    nome: empresa.nome ?? "",
  };
}

/**
 * Regra de pertencimento do agendamento à empresa da fatura.
 * NÃO usa includes/contains — só identificadores exatos.
 *
 * Ordem: cliente_id → CNPJ → igualdade exata de nome (normalizado).
 */
export function isAgendamentoDaEmpresa(
  agendamento: AgendamentoEmpresaFields,
  empresa: EmpresaFaturaRef,
  catalog?: ClienteCatalogItem[]
): boolean {
  const ag = resolveAgendamentoIdentity(agendamento, catalog);
  const emp = resolveEmpresaIdentity(empresa, catalog);

  if (ag.id && emp.id) return ag.id === emp.id;
  if (ag.cnpj && emp.cnpj) return ag.cnpj === emp.cnpj;

  const nomeAg = normalizeNomeEmpresaFatura(ag.nome);
  const nomeEmp = normalizeNomeEmpresaFatura(emp.nome);
  if (!nomeAg || !nomeEmp) return false;
  return nomeAg === nomeEmp;
}

/** Clínica: igualdade exata de nome (sem substring). */
export function isAgendamentoDaClinica(
  clinicaNomeAgendamento: string | null | undefined,
  clinicaReferencia: string | null | undefined
): boolean {
  const a = normalizeNomeEmpresaFatura(clinicaNomeAgendamento);
  const b = normalizeNomeEmpresaFatura(clinicaReferencia);
  if (!a || !b) return false;
  return a === b;
}
