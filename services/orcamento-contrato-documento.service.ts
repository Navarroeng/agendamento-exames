import { createClient } from "@/lib/supabase/client";
import { mensagemErroContratoDocumento } from "@/lib/contrato-documento-erro";
import type {
  OrcamentoContratoDocumentoInsert,
  OrcamentoContratoDocumentoRecord,
} from "@/lib/orcamento-contrato-documento";
import {
  obterUrlOrcamentoOnboarding,
  removerArquivoOrcamentoOnboarding,
  uploadOrcamentoContratoPdf,
} from "@/services/orcamento-onboarding-storage.service";

function mapRow(row: OrcamentoContratoDocumentoRecord): OrcamentoContratoDocumentoRecord {
  const revisaoBruta = row.condicoes_revisao as unknown;
  let condicoes_revisao: number | null = null;
  if (revisaoBruta != null && revisaoBruta !== "") {
    const numero = Number(revisaoBruta);
    condicoes_revisao = Number.isFinite(numero) ? numero : null;
  }
  return {
    ...row,
    versao: Number(row.versao) || 1,
    arquivo_tamanho:
      row.arquivo_tamanho == null ? null : Number(row.arquivo_tamanho),
    condicoes_revisao,
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

function mensagemFalhaRegistroContrato(err: unknown): string {
  const raw = mensagemErroContratoDocumento(
    err,
    "Não foi possível salvar o contrato."
  );
  if (/registrar_contrato_documento_gerado|schema cache/i.test(raw)) {
    return `${raw} Execute a migration 136_contrato_condicoes_revisao.sql para registrar a versão das condições no contrato.`;
  }
  return raw;
}

function linhaRegistrada(data: unknown): OrcamentoContratoDocumentoRecord | null {
  if (Array.isArray(data)) {
    return (data[0] as OrcamentoContratoDocumentoRecord | undefined) ?? null;
  }
  if (data && typeof data === "object") {
    return data as OrcamentoContratoDocumentoRecord;
  }
  return null;
}

export async function persistirContratoDocumentoGerado(params: {
  payload: Omit<OrcamentoContratoDocumentoInsert, "versao" | "storage_path">;
  file: File;
  condicoesRevisao: number;
}): Promise<OrcamentoContratoDocumentoRecord> {
  if (!Number.isInteger(params.condicoesRevisao) || params.condicoesRevisao < 1) {
    throw new Error(
      "Não foi possível identificar a versão das condições aprovadas. Recarregue a tela e gere o contrato novamente."
    );
  }

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

  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    "registrar_contrato_documento_gerado",
    {
      p_aprovacao_id: params.payload.aprovacao_id,
      p_condicoes_revisao: params.condicoesRevisao,
      p_orcamento_id: params.payload.orcamento_id,
      p_cliente_id: params.payload.cliente_id,
      p_modalidade: params.payload.modalidade,
      p_data_contrato: params.payload.data_contrato,
      p_storage_path: uploaded.path,
      p_arquivo_nome: params.payload.arquivo_nome || uploaded.nome,
      p_arquivo_tipo: uploaded.tipo,
      p_arquivo_tamanho: uploaded.tamanho,
      p_gerado_por: params.payload.gerado_por,
      p_gerado_por_user_id: params.payload.gerado_por_user_id,
    }
  );

  if (error || !linhaRegistrada(data)) {
    await removerArquivoOrcamentoOnboarding(uploaded.path);
    throw new Error(
      mensagemFalhaRegistroContrato(
        error ?? "Não foi possível salvar o contrato."
      )
    );
  }

  return mapRow(linhaRegistrada(data) as OrcamentoContratoDocumentoRecord);
}

export async function obterUrlContratoDocumento(
  path: string,
  options?: { download?: string }
): Promise<string> {
  return obterUrlOrcamentoOnboarding(path, 3600, options);
}
