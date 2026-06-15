import { RESPONSAVEIS } from "@/lib/constants";
import { formatDateIsoToBR, maskDateBR } from "@/lib/agendamento-datetime";
import type {
  OrcamentoFormValues,
  OrcamentoItemFormItem,
  OrcamentoStatus,
} from "@/lib/orcamento-types";

export function createEmptyOrcamentoItem(): OrcamentoItemFormItem {
  return {
    id: crypto.randomUUID(),
    servico_id: "",
    servico_nome: "",
    quantidade: "1",
    valor_unitario: "",
    valor_total: "",
  };
}

export function getEmptyOrcamentoForm(): OrcamentoFormValues {
  const hoje = new Date().toISOString().split("T")[0];
  return {
    numero: "",
    data_proposta: hoje,
    cliente_id: "",
    cliente_nome: "",
    contato: "",
    email: "",
    telefone: "",
    responsavel: RESPONSAVEIS[0] ?? "",
    observacoes: "",
    desconto_percentual: "0",
    forma_pagamento: "",
    validade_proposta: "",
    status: "em_elaboracao",
    itens: [createEmptyOrcamentoItem()],
  };
}

export function maskOrcamentoDateField(value: string): string {
  return maskDateBR(value);
}

export function parseOrcamentoDateField(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

export function formatOrcamentoDateForForm(iso: string | null | undefined): string {
  if (!iso) return "";
  return formatDateIsoToBR(iso.split("T")[0]);
}

export function isValidOrcamentoStatus(value: string): value is OrcamentoStatus {
  return [
    "em_elaboracao",
    "enviado",
    "em_negociacao",
    "aprovado",
    "reprovado",
    "cancelado",
  ].includes(value);
}
