import type { OrcamentoModalidade } from "@/lib/orcamento-modalidade";

/**
 * PDFs de contrato gerados a partir do orçamento aprovado (versionados).
 * O contrato documental do AET reutiliza esta tabela (modalidade pontual),
 * vinculado ao orçamento/aprovação/cliente — não é cliente_contratos SST.
 */

export interface OrcamentoContratoDocumentoRecord {
  id: string;
  orcamento_id: string;
  aprovacao_id: string;
  cliente_id: string | null;
  modalidade: OrcamentoModalidade;
  data_contrato: string;
  versao: number;
  storage_path: string;
  arquivo_nome: string;
  arquivo_tipo: string | null;
  arquivo_tamanho: number | null;
  gerado_por: string | null;
  gerado_por_user_id: string | null;
  gerado_em: string;
  created_at: string;
}

export interface OrcamentoContratoDocumentoInsert {
  orcamento_id: string;
  aprovacao_id: string;
  cliente_id: string | null;
  modalidade: OrcamentoModalidade;
  data_contrato: string;
  versao: number;
  storage_path: string;
  arquivo_nome: string;
  arquivo_tipo: string | null;
  arquivo_tamanho: number | null;
  gerado_por: string | null;
  gerado_por_user_id: string | null;
}
