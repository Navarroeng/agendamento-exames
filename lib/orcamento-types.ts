import type { OrcamentoOrigemCliente } from "@/lib/orcamento-origem";

export type OrcamentoStatus =
  | "em_elaboracao"
  | "enviado"
  | "em_negociacao"
  | "aprovado"
  | "reprovado"
  | "cancelado";

export type { OrcamentoOrigemCliente } from "@/lib/orcamento-origem";
export {
  ORCAMENTO_ORIGEM_LABELS,
  ORCAMENTO_ORIGEM_NAO_INFORMADO,
  ORCAMENTO_ORIGEM_OPTIONS,
  formatOrcamentoOrigemCliente,
  isOrcamentoOrigemCliente,
} from "@/lib/orcamento-origem";

export type OrcamentoAssinaturaStatus =
  | "nao_aplicavel"
  | "pendente"
  | "assinado"
  | "recusado";

export const ORCAMENTO_STATUS_OPTIONS: readonly {
  value: OrcamentoStatus;
  label: string;
}[] = [
  { value: "em_elaboracao", label: "Em elaboração" },
  { value: "enviado", label: "Enviado" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const ORCAMENTO_STATUS_LABELS: Record<OrcamentoStatus, string> =
  Object.fromEntries(
    ORCAMENTO_STATUS_OPTIONS.map((item) => [item.value, item.label])
  ) as Record<OrcamentoStatus, string>;

export const ORCAMENTO_STATUS_BADGE: Record<
  OrcamentoStatus,
  { className: string }
> = {
  em_elaboracao: {
    className: "bg-[#eef2ff] text-[#4338ca]",
  },
  enviado: {
    className: "bg-brand-blue-soft text-brand-blue",
  },
  em_negociacao: {
    className: "bg-[#fef3c7] text-[#b45309]",
  },
  aprovado: {
    className: "bg-brand-green-soft text-brand-green",
  },
  reprovado: {
    className: "bg-brand-red-soft text-brand-red",
  },
  cancelado: {
    className: "bg-[#f1f5f9] text-[#64748b]",
  },
};

export interface ServicoSstRecord {
  id: string;
  nome: string;
  descricao: string | null;
  valor_sugerido: number | null;
  ativo: boolean;
  ordem: number;
  itens_inclusos: string[] | null;
  created_at?: string;
}

export interface OrcamentoRecord {
  id: string;
  numero: string;
  data_proposta: string;
  cliente_id: string | null;
  cliente_nome: string;
  cliente_cnpj: string | null;
  cliente_endereco: string | null;
  cliente_setor: string | null;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  responsavel: string;
  origem_cliente: OrcamentoOrigemCliente | null;
  observacoes: string | null;
  motivo_cancelamento: string | null;
  observacao_cancelamento: string | null;
  cancelado_em: string | null;
  cancelado_por: string | null;
  desconto_percentual: number;
  forma_pagamento: string | null;
  validade_proposta: string | null;
  subtotal: number;
  valor_total: number;
  status: OrcamentoStatus;
  assinatura_status: OrcamentoAssinaturaStatus;
  assinatura_token: string | null;
  aceite_em: string | null;
  aceite_ip: string | null;
  aceite_usuario_nome: string | null;
  link_aceite_expira_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrcamentoItemRecord {
  id: string;
  orcamento_id: string;
  servico_id: string | null;
  servico_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ordem: number;
  created_at?: string;
}

export interface OrcamentoComItens extends OrcamentoRecord {
  orcamento_itens: OrcamentoItemRecord[];
}

export interface OrcamentoItemFormItem {
  id: string;
  servico_id: string;
  servico_nome: string;
  quantidade: string;
  valor_unitario: string;
  valor_total: string;
}

export interface OrcamentoFormValues {
  numero: string;
  data_proposta: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_cnpj: string;
  cliente_endereco: string;
  cliente_setor: string;
  contato: string;
  email: string;
  telefone: string;
  origem_cliente: "" | OrcamentoOrigemCliente;
  observacoes: string;
  forma_pagamento: string;
  itens: OrcamentoItemFormItem[];
}

export interface OrcamentoItemInsert {
  servico_id: string | null;
  servico_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ordem: number;
}

export interface OrcamentoInsertPayload {
  numero: string;
  data_proposta: string;
  cliente_id: string | null;
  cliente_nome: string;
  cliente_cnpj: string | null;
  cliente_endereco: string | null;
  cliente_setor: string | null;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  responsavel: string;
  origem_cliente: OrcamentoOrigemCliente | null;
  observacoes: string | null;
  desconto_percentual: number;
  forma_pagamento: string | null;
  validade_proposta: string | null;
  subtotal: number;
  valor_total: number;
  itens: OrcamentoItemInsert[];
}

export interface OrcamentoFilters {
  busca: string;
  status: "" | OrcamentoStatus;
}

export const EMPTY_ORCAMENTO_FILTERS: OrcamentoFilters = {
  busca: "",
  status: "",
};
