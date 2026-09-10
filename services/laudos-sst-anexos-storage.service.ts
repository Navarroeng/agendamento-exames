import { createClient } from "@/lib/supabase/client";
import {
  LAUDOS_SST_ANEXOS_BUCKET,
  buildLaudosSstAnexoStoragePath,
  resolveLaudosSstAnexoContentType,
  validateLaudosSstAnexoFile,
  type LaudosSstAnexoMeta,
  type LaudosSstAnexoTipo,
} from "@/lib/laudos-sst-anexos";

export async function uploadLaudosSstAnexo(
  orcamentoId: string,
  tipo: LaudosSstAnexoTipo,
  file: File
): Promise<LaudosSstAnexoMeta> {
  validateLaudosSstAnexoFile(file);

  const supabase = createClient();
  const path = buildLaudosSstAnexoStoragePath(orcamentoId, tipo, file.name);
  const contentType = resolveLaudosSstAnexoContentType(file);

  const { error } = await supabase.storage
    .from(LAUDOS_SST_ANEXOS_BUCKET)
    .upload(path, file, { upsert: false, contentType });

  if (error) throw error;

  return {
    path,
    nome: file.name,
    tipo: contentType,
    tamanho: file.size,
  };
}

export async function obterUrlLaudosSstAnexo(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(LAUDOS_SST_ANEXOS_BUCKET)
    .createSignedUrl(path.trim(), expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("Não foi possível gerar o link do arquivo.");
  }
  return data.signedUrl;
}

export async function removerArquivoLaudosSstAnexo(
  path: string | null | undefined
): Promise<void> {
  const trimmed = (path ?? "").trim();
  if (!trimmed) return;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(LAUDOS_SST_ANEXOS_BUCKET)
    .remove([trimmed]);
  if (error) {
    console.error("Falha ao remover anexo de Laudos SST:", error);
  }
}
