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
  /** PDF anterior à alteração de contratação. Não é a versão atual. */
  substituido_em?: string | null;
  substituido_motivo?: string | null;
  /** Envio da aprovação no momento em que este PDF deixou de ser a versão atual. */
  versao_enviado?: boolean | null;
  versao_enviado_em?: string | null;
  /** Assinatura da aprovação no momento em que este PDF deixou de ser a versão atual. */
  versao_assinado?: boolean | null;
  versao_assinado_em?: string | null;
}

export function textoAcompanhamentoVersaoAnterior(
  doc: Pick<
    OrcamentoContratoDocumentoRecord,
    | "versao_enviado"
    | "versao_enviado_em"
    | "versao_assinado"
    | "versao_assinado_em"
  >,
  formatarData: (iso: string) => string
): string | null {
  if (doc.versao_enviado == null && doc.versao_assinado == null) return null;
  const envio = doc.versao_enviado
    ? `Enviado${doc.versao_enviado_em ? ` em ${formatarData(doc.versao_enviado_em)}` : ""}`
    : "Não enviado";
  const assinatura = doc.versao_assinado
    ? `Assinado${doc.versao_assinado_em ? ` em ${formatarData(doc.versao_assinado_em)}` : ""}`
    : "Não assinado";
  return `${envio} · ${assinatura}`;
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
