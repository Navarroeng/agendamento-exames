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
  /** Revisão das condições comerciais usada para gerar este PDF. */
  condicoes_revisao?: number | null;
  /** Sinal legado. A comparação vigente é condicoes_revisao. */
  desatualizado_em?: string | null;
  /** PDF conservado após reversão da aprovação. Não é o contrato vigente do processo. */
  sem_validade_em?: string | null;
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
