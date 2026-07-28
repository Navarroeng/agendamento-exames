import { createClient } from "@/lib/supabase/client";
import {
  ORCAMENTO_COMPROVANTE_BUCKET,
  buildOrcamentoComprovanteStoragePath,
  resolveOrcamentoComprovanteContentType,
  validateOrcamentoComprovanteFile,
} from "@/lib/orcamento-comprovante";

export async function uploadOrcamentoComprovantePagamento(
  aprovacaoId: string,
  file: File
): Promise<{ path: string; nome: string; tipo: string; tamanho: number }> {
  validateOrcamentoComprovanteFile(file);

  const supabase = createClient();
  const path = buildOrcamentoComprovanteStoragePath(aprovacaoId, file.name);
  const contentType = resolveOrcamentoComprovanteContentType(file);

  const { error } = await supabase.storage
    .from(ORCAMENTO_COMPROVANTE_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType,
    });

  if (error) throw error;

  return {
    path,
    nome: file.name,
    tipo: contentType,
    tamanho: file.size,
  };
}

export async function deleteOrcamentoComprovantePagamento(
  path: string
): Promise<void> {
  const trimmed = path.trim();
  if (!trimmed) return;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(ORCAMENTO_COMPROVANTE_BUCKET)
    .remove([trimmed]);

  if (error) throw error;
}

export async function obterUrlOrcamentoComprovante(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(ORCAMENTO_COMPROVANTE_BUCKET)
    .createSignedUrl(path.trim(), expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("Não foi possível gerar o link do comprovante.");
  }

  return data.signedUrl;
}
