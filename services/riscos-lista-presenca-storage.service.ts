import { createClient } from "@/lib/supabase/client";
import {
  RISCOS_LISTA_PRESENCA_BUCKET,
  buildRiscosListaPresencaStoragePath,
  resolveRiscosListaPresencaContentType,
  validateRiscosListaPresencaFile,
  type RiscosListaPresencaAnexoMeta,
} from "@/lib/riscos-lista-presenca";

export async function uploadRiscosListaPresencaAnexo(
  orcamentoId: string,
  file: File
): Promise<RiscosListaPresencaAnexoMeta> {
  validateRiscosListaPresencaFile(file);

  const supabase = createClient();
  const path = buildRiscosListaPresencaStoragePath(orcamentoId, file.name);
  const contentType = resolveRiscosListaPresencaContentType(file);

  const { error } = await supabase.storage
    .from(RISCOS_LISTA_PRESENCA_BUCKET)
    .upload(path, file, { upsert: false, contentType });

  if (error) throw error;

  return {
    path,
    nome: file.name,
    tipo: contentType,
    tamanho: file.size,
  };
}

export async function obterUrlRiscosListaPresencaAnexo(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(RISCOS_LISTA_PRESENCA_BUCKET)
    .createSignedUrl(path.trim(), expiresInSeconds);

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("Não foi possível gerar o link do arquivo.");
  }
  return data.signedUrl;
}

export async function removerArquivoRiscosListaPresenca(
  path: string | null | undefined
): Promise<void> {
  const trimmed = (path ?? "").trim();
  if (!trimmed) return;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(RISCOS_LISTA_PRESENCA_BUCKET)
    .remove([trimmed]);
  if (error) {
    console.error("Falha ao remover anexo da lista de presença:", error);
  }
}
