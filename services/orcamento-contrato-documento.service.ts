import { createClient } from "@/lib/supabase/client";
import type {
  OrcamentoContratoDocumentoInsert,
  OrcamentoContratoDocumentoRecord,
} from "@/lib/orcamento-contrato-documento";
import {
  obterUrlOrcamentoOnboarding,
  uploadOrcamentoContratoPdf,
} from "@/services/orcamento-onboarding-storage.service";

function mapRow(row: OrcamentoContratoDocumentoRecord): OrcamentoContratoDocumentoRecord {
  return {
    ...row,
    versao: Number(row.versao) || 1,
    arquivo_tamanho:
      row.arquivo_tamanho == null ? null : Number(row.arquivo_tamanho),
  };
}

export async function listarContratoDocumentos(
  aprovacaoId: string
): Promise<OrcamentoContratoDocumentoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_contrato_documentos")
    .select("*")
    .eq("aprovacao_id", aprovacaoId)
    .order("versao", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) =>
    mapRow(row as OrcamentoContratoDocumentoRecord)
  );
}

export async function proximaVersaoContratoDocumento(
  aprovacaoId: string
): Promise<number> {
  const existentes = await listarContratoDocumentos(aprovacaoId);
  const max = existentes.reduce((acc, row) => Math.max(acc, row.versao), 0);
  return max + 1;
}

export async function persistirContratoDocumentoGerado(params: {
  payload: Omit<OrcamentoContratoDocumentoInsert, "versao" | "storage_path">;
  file: File;
}): Promise<OrcamentoContratoDocumentoRecord> {
  const versao = await proximaVersaoContratoDocumento(params.payload.aprovacao_id);
  const uploaded = await uploadOrcamentoContratoPdf(
    params.payload.aprovacao_id,
    params.file
  );

  const insert: OrcamentoContratoDocumentoInsert = {
    ...params.payload,
    versao,
    storage_path: uploaded.path,
    arquivo_nome: uploaded.nome,
    arquivo_tipo: uploaded.tipo,
    arquivo_tamanho: uploaded.tamanho,
  };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_contrato_documentos")
    .insert(insert)
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data as OrcamentoContratoDocumentoRecord);
}

export async function obterUrlContratoDocumento(
  path: string
): Promise<string> {
  return obterUrlOrcamentoOnboarding(path, 3600);
}
