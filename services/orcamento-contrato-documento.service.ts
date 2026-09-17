import { createClient } from "@/lib/supabase/client";
import { mensagemErroContratoDocumento } from "@/lib/contrato-documento-erro";
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

function throwOnError(
  error: { message?: string; details?: string; hint?: string } | null,
  fallback: string
): void {
  if (!error) return;
  throw new Error(mensagemErroContratoDocumento(error, fallback));
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
  throwOnError(error, "Não foi possível carregar os contratos gerados.");
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
  let uploaded: Awaited<ReturnType<typeof uploadOrcamentoContratoPdf>>;
  try {
    uploaded = await uploadOrcamentoContratoPdf(
      params.payload.aprovacao_id,
      params.file
    );
  } catch (err) {
    throw new Error(
      mensagemErroContratoDocumento(err, "Não foi possível enviar o PDF do contrato.")
    );
  }

  const insert: OrcamentoContratoDocumentoInsert = {
    ...params.payload,
    versao,
    storage_path: uploaded.path,
    arquivo_nome: params.payload.arquivo_nome || uploaded.nome,
    arquivo_tipo: uploaded.tipo,
    arquivo_tamanho: uploaded.tamanho,
  };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_contrato_documentos")
    .insert(insert)
    .select("*")
    .single();
  throwOnError(error, "Não foi possível salvar o contrato.");
  return mapRow(data as OrcamentoContratoDocumentoRecord);
}

export async function obterUrlContratoDocumento(
  path: string,
  options?: { download?: string }
): Promise<string> {
  return obterUrlOrcamentoOnboarding(path, 3600, options);
}
