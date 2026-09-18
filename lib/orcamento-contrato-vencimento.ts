export interface OrcamentoContratoVencimentoRecord {
  id: string;
  aprovacao_id: string;
  orcamento_id: string;
  indice: number;
  data_vencimento: string;
  created_at: string;
  updated_at: string;
}

export interface OrcamentoContratoVencimentoInput {
  indice: number;
  data_vencimento: string;
}
